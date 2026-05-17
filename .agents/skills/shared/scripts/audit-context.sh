#!/bin/bash
# audit-context.sh — Genera índice único del proyecto
# Uso: bash audit-context.sh
# Salida: .opencode/audit-context.json (contexto compartido entre skills)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/init-report.sh"

CONTEXT_FILE="$PROJECT_ROOT/.opencode/audit-context.json"
mkdir -p "$PROJECT_ROOT/.opencode"

# Resolver baseline
source "$SCRIPT_DIR/resolve-baseline.sh"

# Detectar "use client" como JSON array
USE_CLIENT_JSON=$(grep -rl '"use client"' "$PROJECT_ROOT/components" "$PROJECT_ROOT/app" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v .next | sed "s|$PROJECT_ROOT/||" | python3 -c "import sys,json; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))" 2>/dev/null || echo "[]")

# Contar archivos fuente
TSX_COUNT=$(find "$PROJECT_ROOT/app" "$PROJECT_ROOT/components" "$PROJECT_ROOT/lib" -name "*.tsx" 2>/dev/null | wc -l)
TS_COUNT=$(find "$PROJECT_ROOT/lib" -name "*.ts" 2>/dev/null | wc -l)
TOTAL_FILES=$((TSX_COUNT + TS_COUNT))

# i18n keys
ES_KEYS_COUNT=0
EN_KEYS_COUNT=0
if [ -f "$PROJECT_ROOT/messages/es.json" ] && [ -f "$PROJECT_ROOT/messages/en.json" ]; then
  ES_KEYS_COUNT=$(python3 -c "import json; d=json.load(open('$PROJECT_ROOT/messages/es.json')); print(len([k for k in d.keys()]))" 2>/dev/null || echo "0")
  EN_KEYS_COUNT=$(python3 -c "import json; d=json.load(open('$PROJECT_ROOT/messages/en.json')); print(len([k for k in d.keys()]))" 2>/dev/null || echo "0")
fi

# Dependencias clave (línea única)
NEXT_VER=$(node -e "console.log(require('$PROJECT_ROOT/package.json').dependencies.next || 'unknown')" 2>/dev/null || echo "unknown")
FRAMER_VER=$(node -e "console.log(require('$PROJECT_ROOT/package.json').dependencies['framer-motion'] || 'unknown')" 2>/dev/null || echo "unknown")
ZOD_VER=$(node -e "console.log(require('$PROJECT_ROOT/package.json').dependencies.zod || 'unknown')" 2>/dev/null || echo "unknown")
PROD_DEPS=$(node -e "const p=require('$PROJECT_ROOT/package.json'); console.log(Object.keys(p.dependencies||{}).length)" 2>/dev/null || echo "0")
DEV_DEPS=$(node -e "const p=require('$PROJECT_ROOT/package.json'); console.log(Object.keys(p.devDependencies||{}).length)" 2>/dev/null || echo "0")

# Remote patterns de next.config
REMOTE_PATTERNS=$(grep -oP 'hostname:\s*"\K[^"]+' "$PROJECT_ROOT/next.config.ts" 2>/dev/null | python3 -c "import sys,json; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))" 2>/dev/null || echo "[]")

# Generar JSON
cat > "$CONTEXT_FILE" << CONTEXT_EOF
{
  "meta": {
    "generated_at": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
    "project_root": "$PROJECT_ROOT"
  },
  "baseline": {
    "hash": "$BASELINE_HASH",
    "source": "$BASELINE_SOURCE",
    "branch": "$BRANCH",
    "worktree": "$WORKTREE_STATE",
    "commits_since": $COMMITS_SINCE,
    "diff_mode": "$DIFF_MODE"
  },
  "project": {
    "framework": "Next.js $NEXT_VER",
    "total_source_files": $TOTAL_FILES,
    "tsx_components": $TSX_COUNT,
    "ts_modules": $TS_COUNT,
    "use_client_files": $USE_CLIENT_JSON
  },
  "i18n": {
    "languages": ["es", "en"],
    "es_keys_count": $ES_KEYS_COUNT,
    "en_keys_count": $EN_KEYS_COUNT,
    "symmetry": $( [ "$ES_KEYS_COUNT" = "$EN_KEYS_COUNT" ] && echo "true" || echo "false" )
  },
  "dependencies": {
    "prod_count": $PROD_DEPS,
    "dev_count": $DEV_DEPS,
    "next": "$NEXT_VER",
    "framer_motion": "$FRAMER_VER",
    "zod": "$ZOD_VER"
  },
  "config": {
    "remote_patterns": $REMOTE_PATTERNS
  }
}
CONTEXT_EOF

echo "✅ Contexto guardado en: $CONTEXT_FILE"
