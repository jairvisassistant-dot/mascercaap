#!/bin/bash
# consolidate.sh — Compila reporte consolidado desde 3 JSONs de hallazgos
# Uso: consolidate.sh --code <json> --arch <json> --prod <json> [--output <name>]
# Salida: audit_consolidated_TIMESTAMP.md + .json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/init-report.sh"
source "$SCRIPT_DIR/resolve-baseline.sh"

CODE_JSON=""
ARCH_JSON=""
PROD_JSON=""
OUTPUT_NAME=""

while [ $# -gt 0 ]; do
  case "$1" in
    --code) CODE_JSON="$2"; shift 2 ;;
    --arch) ARCH_JSON="$2"; shift 2 ;;
    --prod) PROD_JSON="$2"; shift 2 ;;
    --output) OUTPUT_NAME="$2"; shift 2 ;;
    *) echo "Error: argumento desconocido: $1"; exit 1 ;;
  esac
done

TIMESTAMP=$(date +'%Y%m%d_%H%M')
DATE_HUMAN=$(date +'%Y-%m-%d %H:%M')
OUTPUT_MD="${OUTPUT_NAME:-$AUDITS_DIR/audit_consolidated_$TIMESTAMP.md}"
OUTPUT_JSON="${OUTPUT_NAME:-$AUDITS_DIR/audit_consolidated_$TIMESTAMP.json}"

# Leer JSONs (con defaults si no existen)
code_total=0; code_crit=0; code_high=0; code_med=0; code_low=0
arch_total=0; arch_crit=0; arch_high=0; arch_med=0; arch_low=0
prod_total=0; prod_crit=0; prod_high=0; prod_med=0; prod_low=0

read_stats() {
  local file="$1"
  local prefix="$2"
  if [ -f "$file" ]; then
    eval "${prefix}_total=\$(jq -r '.stats.total // 0' "$file")"
    eval "${prefix}_crit=\$(jq -r '.stats.crit // 0' "$file")"
    eval "${prefix}_high=\$(jq -r '.stats.high // 0' "$file")"
    eval "${prefix}_med=\$(jq -r '.stats.med // 0' "$file")"
    eval "${prefix}_low=\$(jq -r '.stats.low // 0' "$file")"
  fi
}

read_stats "$CODE_JSON" "code"
read_stats "$ARCH_JSON" "arch"
read_stats "$PROD_JSON" "prod"

TOTAL=$((code_total + arch_total + prod_total))
CRIT=$((code_crit + arch_crit + prod_crit))
HIGH=$((code_high + arch_high + prod_high))
MED=$((code_med + arch_med + prod_med))
LOW=$((code_low + arch_low + prod_low))

# Generar consolidated JSON
cat > "$OUTPUT_JSON" << JSON_EOF
{
  "meta": {
    "type": "consolidated",
    "date": "$DATE_HUMAN",
    "baseline": "$BASELINE_HASH",
    "pipeline": "code → architecture → product"
  },
  "summary": {
    "total": $TOTAL,
    "crit": $CRIT,
    "high": $HIGH,
    "med": $MED,
    "low": $LOW,
    "by_skill": {
      "code": { "total": $code_total, "crit": $code_crit, "high": $code_high, "med": $code_med, "low": $code_low },
      "architecture": { "total": $arch_total, "crit": $arch_crit, "high": $arch_high, "med": $arch_med, "low": $arch_low },
      "product": { "total": $prod_total, "crit": $prod_crit, "high": $prod_high, "med": $prod_med, "low": $prod_low }
    }
  }
}
JSON_EOF

# Generar consolidated markdown
TEMPLATE="$SCRIPT_DIR/../templates/consolidated_template.md"
if [ -f "$TEMPLATE" ]; then
  cp "$TEMPLATE" "$OUTPUT_MD"
else
  cat > "$OUTPUT_MD" << MD_EOF
# Auditoría Consolidada — $DATE_HUMAN
MD_EOF
fi

sed -i "s/{{DATE}}/$DATE_HUMAN/g" "$OUTPUT_MD"
sed -i "s/{{HASH}}/$BASELINE_HASH/g" "$OUTPUT_MD"
sed -i "s/{{TOTAL}}/$TOTAL/g" "$OUTPUT_MD"
sed -i "s/{{CRIT}}/$CRIT/g" "$OUTPUT_MD"
sed -i "s/{{HIGH}}/$HIGH/g" "$OUTPUT_MD"
sed -i "s/{{MED}}/$MED/g" "$OUTPUT_MD"
sed -i "s/{{LOW}}/$LOW/g" "$OUTPUT_MD"
sed -i "s/{{BASELINE_HASH}}/$BASELINE_HASH/g" "$OUTPUT_MD"

echo "✅ Consolidado guardado en: $OUTPUT_MD"
echo "✅ JSON consolidado en: $OUTPUT_JSON"
