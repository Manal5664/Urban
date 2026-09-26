"""Refresh artifact checks after a reuse run, without rerunning relational joins.

Needed for this session because metadata-cache invalidation was fixed while
physical reuse validation was already running. Subsequent --reuse runs perform
this remeasurement directly in validate_artifacts.
"""
import json
from pathlib import Path
from data_generator.validate_production import validate_artifacts

root = Path('raw_data/production-v1')
path = Path('reports/production_validation_reuse.json')
report = json.loads(path.read_text())
cache = json.loads(path.with_suffix('.load.json').read_text())
for key in ('manifest', 'injections'):
    report[key] = cache[key]
checks = []
validate_artifacts(root, report,
                   lambda name, passed, **evidence: checks.append(
                       dict(name=name, passed=bool(passed), **evidence)))
by_name = {check['name']: check for check in checks}
report['checks'] = [by_name.get(check['name'], check) for check in report['checks']]
report['passed_count'] = sum(check['passed'] for check in report['checks'])
report['failed_count'] = len(report['checks']) - report['passed_count']
report['passed'] = report['failed_count'] == 0
report['metadata_remeasurement'] = 'Fresh metadata hashes after reuse; original raw load hashes retained. No raw rescan or reprojection.'
for key in ('manifest', 'injections'):
    report.pop(key)
path.write_text(json.dumps(report, indent=2, sort_keys=True) + '\n')
print(json.dumps({key: report[key] for key in ('passed', 'passed_count', 'failed_count')}))
print(json.dumps([check for check in report['checks'] if not check['passed']], indent=2))
