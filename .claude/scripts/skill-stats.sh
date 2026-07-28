#!/bin/bash
# Skill-activation telemetry report.
#
# Reads .claude/hooks/state/metrics.jsonl (written by the skill hooks) and
# reports, per skill: how often it was suggested, how often a suggestion was
# followed by an activation in the same session (conversion), how often it was
# activated with no suggestion at all (the model found it on its own), and how
# many edits were blocked on its behalf.
#
# Usage: .claude/scripts/skill-stats.sh   (run from the project root)

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
METRICS="$PROJECT_DIR/.claude/hooks/state/metrics.jsonl"

if ! command -v jq >/dev/null 2>&1; then
    echo "skill-stats: jq is required (apt install jq / brew install jq)"
    exit 1
fi
if [ ! -s "$METRICS" ]; then
    echo "skill-stats: no telemetry yet ($METRICS is missing or empty)."
    echo "Data accumulates as you use Claude Code with the skill hooks enabled."
    exit 0
fi

echo "Skill-activation telemetry ($(wc -l < "$METRICS") events, $(jq -rs 'map(.session) | unique | length' "$METRICS") sessions)"
echo "Window: $(head -1 "$METRICS" | jq -r .ts)  ->  $(tail -1 "$METRICS" | jq -r .ts)"
echo

jq -rs '
    map(select(.event == "suggested" or .event == "activated")) as $ev
    | ($ev | map(select(.event == "suggested"))) as $sug
    | ($ev | map(select(.event == "activated"))) as $act
    | ($ev | map(.skill) | unique) as $skills
    | $skills[] as $s
    | ($sug | map(select(.skill == $s))) as $ssug
    | ($act | map(select(.skill == $s))) as $sact
    | ($ssug | map(.session) | unique) as $sugSessions
    | ($sact | map(.session) | unique) as $actSessions
    | ($sugSessions - ($sugSessions - $actSessions)) as $converted
    | ($actSessions - $sugSessions) as $selfServe
    | [
        $s,
        ($sugSessions | length),
        ($converted | length),
        (if ($sugSessions | length) > 0 then (($converted | length) * 100 / ($sugSessions | length) | floor | tostring) + "%" else "-" end),
        ($selfServe | length)
      ]
    | @tsv
' "$METRICS" | awk -F'\t' '
    BEGIN {
        printf "%-28s %10s %10s %8s %12s\n", "skill", "suggested", "followed", "conv", "self-serve"
        printf "%-28s %10s %10s %8s %12s\n", "----", "---------", "--------", "----", "----------"
    }
    { printf "%-28s %10s %10s %8s %12s\n", $1, $2, $3, $4, $5 }
'

echo
blocks=$(jq -rs 'map(select(.event == "blocked")) | length' "$METRICS")
if [ "$blocks" -gt 0 ]; then
    echo "Blocks ($blocks):"
    jq -rs '
        map(select(.event == "blocked"))
        | group_by(.kind)[]
        | "  \(.[0].kind): \(length) (skills: \([.[].skills[]] | unique | join(", ")))"
    ' "$METRICS"
else
    echo "Blocks: none recorded"
fi
