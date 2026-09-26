import json
from pathlib import Path
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from runtime_orchestration.plan import STAGE_NAMES, Stage, build_plan
from runtime_orchestration.preflight import (
    Check,
    PreflightReport,
    REQUIRED_PREFLIGHT,
    Status,
    run_preflight,
)
from runtime_orchestration.runner import StageRunner, validate_command
from runtime_orchestration.certification import CertificationAttestation


ROOT = Path(__file__).resolve().parents[1]


def all_ready_preflight():
    return PreflightReport(
        tuple(Check(name, Status.READY, "fixture") for name in sorted(REQUIRED_PREFLIGHT))
    )


def successful_executor(calls):
    def execute(argv, **kwargs):
        calls.append((argv, kwargs))
        return SimpleNamespace(returncode=0, stdout="fixture output", stderr="")

    return execute


class RuntimePreflightTests(unittest.TestCase):
    def test_marker_schema_is_not_assumed_without_authoritative_adapter(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "certified"
            (root / "raw").mkdir(parents=True)
            marker = Path(temp) / "CERTIFIED.json"
            marker.write_text(
                json.dumps({"status": "PENDING", "dataset_version": "v1"}),
                encoding="utf-8",
            )
            report = run_preflight(
                project_root=ROOT,
                dataset_root=str(root),
                marker_path=str(marker),
                disk_path=temp,
                minimum_free_bytes=0,
                which=lambda *args, **kwargs: None,
                package_version=lambda *args, **kwargs: None,
                java_version=lambda *_: None,
            )
            self.assertEqual(
                report.check("certified_dataset").status, Status.NOT_CONFIGURED
            )
            self.assertIn(
                "schema/adapter is pending",
                report.check("certified_dataset").detail,
            )

    def test_certified_package_is_accepted_only_through_adapter_interface(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "certified"
            (root / "raw").mkdir(parents=True)
            marker = Path(temp) / "CERTIFIED.json"
            marker.write_text("opaque authoritative marker", encoding="utf-8")

            class FixtureAdapter:
                def certify(self, dataset_root, marker_path):
                    self.asserted_root = dataset_root
                    self.asserted_marker = marker_path
                    return CertificationAttestation("dataset-v7", "fixture-evidence")

            report = run_preflight(
                project_root=ROOT,
                dataset_root=str(root),
                marker_path=str(marker),
                certification_adapter=FixtureAdapter(),
                disk_path=temp,
                minimum_free_bytes=0,
                which=lambda *args, **kwargs: None,
                package_version=lambda *args, **kwargs: None,
                java_version=lambda *_: None,
            )
            self.assertEqual(report.check("certified_dataset").status, Status.READY)
            self.assertIn("dataset-v7", report.check("certified_dataset").detail)

    def test_preflight_detects_missing_dependencies_and_never_claims_connectivity(self):
        with tempfile.TemporaryDirectory() as temp:
            report = run_preflight(
                env={},
                project_root=ROOT,
                disk_path=temp,
                minimum_free_bytes=0,
                which=lambda *args, **kwargs: None,
                package_version=lambda *args, **kwargs: None,
                java_version=lambda *_: None,
            )
        self.assertEqual(report.check("hdfs_cli").status, Status.MISSING)
        self.assertEqual(report.check("pyspark").status, Status.MISSING)
        self.assertEqual(report.check("pandas").status, Status.MISSING)
        self.assertEqual(report.check("postgresql_driver").status, Status.MISSING)
        self.assertEqual(report.check("hdfs_availability").status, Status.NOT_CONFIGURED)
        self.assertEqual(report.check("spark_runtime_compatibility").status, Status.NOT_CONFIGURED)
        self.assertEqual(report.check("postgresql_connectivity").status, Status.NOT_CONFIGURED)
        self.assertEqual(
            len({check.name for check in report.checks}), len(report.checks)
        )
        self.assertFalse(report.ready)

    def test_preflight_rejects_duplicate_check_names(self):
        with self.assertRaises(ValueError):
            PreflightReport(
                (
                    Check("python", Status.READY, "fixture"),
                    Check("python", Status.MISSING, "duplicate"),
                )
            )

    def test_preflight_reads_hadoop_xml_without_running_hadoop_or_hdfs(self):
        with tempfile.TemporaryDirectory() as temp:
            conf = Path(temp) / "conf"
            conf.mkdir()
            (conf / "core-site.xml").write_text(
                "<configuration><property><name>fs.defaultFS</name>"
                "<value>hdfs://namenode:8020</value></property></configuration>",
                encoding="utf-8",
            )
            calls = []

            def fake_which(name, path=None):
                calls.append(name)
                return f"/fixture/bin/{name}"

            report = run_preflight(
                env={"HADOOP_CONF_DIR": str(conf)},
                project_root=ROOT,
                disk_path=temp,
                minimum_free_bytes=0,
                which=fake_which,
                package_version=lambda module, distribution: "fixture-1",
                java_version=lambda _path: 'openjdk version "17"',
            )
        self.assertEqual(
            report.check("hdfs_configuration").status, Status.READY
        )
        self.assertEqual(report.check("hdfs_availability").status, Status.NOT_CONFIGURED)
        self.assertIn("hdfs", calls)  # executable discovery only
        self.assertIn("hadoop", calls)  # executable discovery only

    def test_java_detection_requires_java_home_and_reports_version_only(self):
        with tempfile.TemporaryDirectory() as temp:
            java_home = Path(temp) / "java"
            java_home.mkdir()
            report = run_preflight(
                env={"JAVA_HOME": str(java_home)},
                project_root=ROOT,
                disk_path=temp,
                minimum_free_bytes=0,
                which=lambda name, **kwargs: "/fixture/bin/java" if name == "java" else None,
                package_version=lambda *args, **kwargs: None,
                java_version=lambda _path: 'openjdk version "17.0.1"',
            )
        self.assertEqual(report.check("java").status, Status.READY)
        self.assertIn("17.0.1", report.check("java").detail)
        self.assertNotIn(temp, report.check("java").detail)


class RuntimePlanAndRunnerTests(unittest.TestCase):
    def test_plan_contains_all_mandatory_stages_in_exact_order(self):
        plan = build_plan(project_root=ROOT, preflight=all_ready_preflight())
        self.assertEqual(tuple(stage.name for stage in plan), STAGE_NAMES)
        self.assertEqual(tuple(stage.index for stage in plan), tuple(range(1, 19)))
        self.assertEqual(plan[4].status, Status.BLOCKED)  # HDFS availability is not probed.
        self.assertEqual(plan[10].status, Status.NOT_CONFIGURED)  # No adapter/paths were supplied.
        self.assertEqual(plan[13].status, Status.NOT_CONFIGURED)  # No comparison artifacts supplied.

    def test_dry_run_command_generation_uses_existing_supported_clis_only(self):
        plan = build_plan(
            project_root=ROOT,
            preflight=all_ready_preflight(),
            certified_root="/certified/pkg",
            marker_path="/certified/CERTIFIED.json",
            dataset_version="dataset-v7",
            hdfs_root="/urbantransit",
            spark_severity_thresholds=(60, 180, 300, 600),
            spark_manifest="/certified/spark/manifest.json",
            spark_ml_output="/runs/spark-ml-v1",
            python_manifest="/certified/python/manifest.json",
            python_ml_output="/runs/python-ml-v1",
            recommendation_manifest="/certified/analytics/manifest.json",
            recommendation_request="/requests/recommendations.json",
            recommendation_output="/runs/recommendations-v1.json",
        )
        self.assertEqual(plan[3].argv[:3], ("env", "HDFS_ROOT=/urbantransit", "bash"))
        self.assertEqual(plan[4].argv[-1], "--dry-run")
        self.assertIn("/raw/dataset-v7", plan[4].outputs[0])
        validate_command(plan[4].argv, project_root=ROOT)
        self.assertEqual(plan[11].argv[:3], (sys.executable, "-m", "ml_execution"))
        self.assertEqual(plan[11].argv[plan[11].argv.index("--engine") + 1], "spark")
        self.assertEqual(plan[12].argv[plan[12].argv.index("--engine") + 1], "python")
        self.assertEqual(plan[14].argv[:3], (sys.executable, "-m", "recommendation_engine"))
        self.assertEqual(plan[5].status, Status.BLOCKED)  # Combined Spark output is unsafe.
        with self.assertRaises(ValueError):
            validate_command(
                (sys.executable, "-m", "spark_jobs.pipeline"),
                project_root=ROOT,
            )

    def test_uncertified_dataset_blocks_runner_and_persists_gate_evidence(self):
        calls = []
        with tempfile.TemporaryDirectory() as temp:
            dataset = Path(temp) / "certified"
            (dataset / "raw").mkdir(parents=True)
            evidence = Path(temp) / "evidence" / "run-1"
            result = StageRunner(
                project_root=ROOT,
                executor=successful_executor(calls),
            ).run(
                build_plan(project_root=ROOT, preflight=all_ready_preflight()),
                certificate={"status": "PENDING"},
                preflight=all_ready_preflight(),
                dataset_root=dataset,
                evidence_root=evidence,
            )
            events = [
                json.loads(line)
                for line in (evidence / "stages.jsonl").read_text().splitlines()
            ]
        self.assertEqual(result["status"], "BLOCKED")
        self.assertEqual(events[0]["status"], "BLOCKED")
        self.assertEqual(events[0]["stage"], "certified_dataset_gate")
        self.assertEqual(len(events), 18)
        self.assertEqual(calls, [])

    def test_missing_dependency_gate_blocks_without_execution(self):
        calls = []
        report = PreflightReport(
            tuple(
                Check(
                    name,
                    Status.MISSING if name == "pyspark" else Status.READY,
                    "fixture",
                )
                for name in sorted(REQUIRED_PREFLIGHT)
            )
        )
        with tempfile.TemporaryDirectory() as temp:
            dataset = Path(temp) / "certified"
            (dataset / "raw").mkdir(parents=True)
            evidence = Path(temp) / "evidence" / "run-1"
            result = StageRunner(
                project_root=ROOT,
                executor=successful_executor(calls),
            ).run(
                build_plan(project_root=ROOT, preflight=all_ready_preflight()),
                certificate={"status": "CERTIFIED", "dataset_version": "v1"},
                preflight=report,
                dataset_root=dataset,
                evidence_root=evidence,
            )
            events = [
                json.loads(line)
                for line in (evidence / "stages.jsonl").read_text().splitlines()
            ]
        self.assertEqual(result["status"], "BLOCKED")
        self.assertEqual(events[1]["stage"], "runtime_environment_preflight")
        self.assertEqual(events[1]["status"], "BLOCKED")
        self.assertEqual(len(events), 18)
        self.assertEqual(calls, [])

    def test_ordered_failure_stops_later_stages_and_records_logs(self):
        calls = []

        def failing_executor(argv, **kwargs):
            calls.append(argv)
            return SimpleNamespace(
                returncode=7,
                stdout="password=exposed\nstage output\n",
                stderr="failure details\n",
            )

        plan = build_plan(
            project_root=ROOT,
            preflight=all_ready_preflight(),
            certified_root="/certified/pkg",
            marker_path="/certified/CERTIFIED.json",
            hdfs_root="/urbantransit",
        )
        with tempfile.TemporaryDirectory() as temp:
            dataset = Path(temp) / "certified"
            (dataset / "raw").mkdir(parents=True)
            evidence = Path(temp) / "evidence" / "run-1"
            result = StageRunner(
                project_root=ROOT,
                executor=failing_executor,
                remote_path_exists=lambda _path: False,
            ).run(
                plan,
                certificate={"status": "CERTIFIED", "dataset_version": "dataset-v1"},
                preflight=all_ready_preflight(),
                dataset_root=dataset,
                evidence_root=evidence,
            )
            records = [
                json.loads(line)
                for line in (evidence / "stages.jsonl").read_text().splitlines()
            ]
            stdout = (evidence / records[3]["stdout_file"]).read_text()
        self.assertEqual(result["status"], "FAILED")
        self.assertEqual(records[3]["stage"], "hdfs_directory_readiness")
        self.assertEqual(records[3]["status"], "FAILED")
        self.assertEqual(records[3]["returncode"], 7)
        self.assertIn("[REDACTED]", stdout)
        self.assertEqual(records[4]["status"], "BLOCKED")
        self.assertEqual(len(calls), 1)

    def test_dry_run_does_not_execute_and_evidence_root_cannot_be_reused(self):
        calls = []
        plan = build_plan(
            project_root=ROOT,
            preflight=all_ready_preflight(),
            certified_root="/certified/pkg",
            marker_path="/certified/CERTIFIED.json",
            hdfs_root="/urbantransit",
        )
        with tempfile.TemporaryDirectory() as temp:
            dataset = Path(temp) / "certified"
            (dataset / "raw").mkdir(parents=True)
            evidence = Path(temp) / "evidence" / "run-1"
            runner = StageRunner(
                project_root=ROOT,
                executor=successful_executor(calls),
                remote_path_exists=lambda _path: False,
            )
            result = runner.run(
                plan,
                certificate={"status": "CERTIFIED", "dataset_version": "dataset-v1"},
                preflight=all_ready_preflight(),
                dataset_root=dataset,
                evidence_root=evidence,
                dry_run=True,
            )
            with self.assertRaises(FileExistsError):
                runner.run(
                    plan,
                    certificate={"status": "CERTIFIED", "dataset_version": "dataset-v1"},
                    preflight=all_ready_preflight(),
                    dataset_root=dataset,
                    evidence_root=evidence,
                    dry_run=True,
                )
        self.assertEqual(result["stages"][3]["status"], "DRY_RUN")
        self.assertEqual(calls, [])

    def test_destructive_commands_and_existing_outputs_are_rejected(self):
        with self.assertRaises(ValueError):
            validate_command(
                (sys.executable, "-m", "ml_execution", "--force"),
                project_root=ROOT,
            )
        with self.assertRaises(ValueError):
            validate_command(
                (sys.executable, "-m", "ml_execution", "--fixture"),
                project_root=ROOT,
            )
        with self.assertRaises(ValueError):
            validate_command(
                (sys.executable, "-m", "recommendation_engine", "--output", "/tmp/raw_data/out.json"),
                project_root=ROOT,
            )
        runner = StageRunner(project_root=ROOT, path_exists=lambda _path: True)
        stage = Stage(
            12,
            STAGE_NAMES[11],
            Status.READY,
            "ml_execution",
            (sys.executable, "-m", "ml_execution", "--engine", "spark"),
            "fixture",
            outputs=("/existing/output",),
        )
        self.assertIn("already exists", runner._output_collision(stage, Path("/input")))

    def test_evidence_directory_cannot_overlap_certified_input_or_protected_paths(self):
        plan = build_plan(project_root=ROOT, preflight=all_ready_preflight())
        with tempfile.TemporaryDirectory() as temp:
            dataset = Path(temp) / "certified"
            (dataset / "raw").mkdir(parents=True)
            with self.assertRaises(ValueError):
                StageRunner(project_root=ROOT).run(
                    plan,
                    certificate={"status": "CERTIFIED", "dataset_version": "v1"},
                    preflight=all_ready_preflight(),
                    dataset_root=dataset,
                    evidence_root=dataset / "evidence",
                )


if __name__ == "__main__":
    unittest.main()
