#!/bin/bash
# Re-plan with the corrected stop overlay, materialize, then verify.
set -u
ROOT=/home/manal/Desktop/UrbanTransit-IQ
WORK=/home/manal/UrbanTransit-IQ/.remediation_work
SRC=$ROOT/raw_data/production-v1
TGT=$ROOT/raw_data/production-v1.1
PLAN=$WORK/plan_v11.json
JOURNAL=$WORK/materialize_journal.txt
export REMEDIATION_CACHE=$WORK/cache
cd "$ROOT" || exit 1

echo "[chain] re-planning $(date -u +%FT%TZ)"
python3 -u -m data_generator.remediate_bounded plan "$SRC" --plan-out "$PLAN" \
    > "$WORK/plan.log" 2>&1
echo "[chain] plan exit=$?"
tail -2 "$WORK/plan.log" | cut -c1-200
[ -s "$PLAN" ] || { echo "[chain] no plan produced"; exit 1; }

for attempt in 1 2 3 4 5 6 7 8 9 10; do
  python3 -u -m data_generator.remediate_bounded materialize "$SRC" "$TGT" \
      --plan "$PLAN" --journal "$JOURNAL" --report "$WORK/materialization_report.json" \
      >> "$WORK/materialize.log" 2>&1
  code=$?
  echo "[chain] materialize attempt $attempt exit=$code"
  [ $code -eq 0 ] && break
  sleep 10
done
[ -f "$TGT/metadata/generation_manifest.json" ] || { echo "[chain] materialize incomplete"; exit 1; }
[ -f "$TGT/MATERIALIZATION_INCOMPLETE" ] && { echo "[chain] marker still present"; exit 1; }

echo "[chain] verifying $(date -u +%FT%TZ)"
python3 -u -m data_generator.remediate_bounded verify "$SRC" "$TGT" \
    --report "$WORK/verification_report.json" > "$WORK/verify.log" 2>&1
echo "[chain] verify exit=$?"
grep -cE "^(PASS|FAIL)" "$WORK/verify.log"
echo "[chain] done $(date -u +%FT%TZ)"
