#!/bin/bash

# Script para ejecutar pruebas k6 localmente con generación automática de reportes

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Crear directorio de reportes si no existe
REPORTS_DIR="./reports"
if [ ! -d "$REPORTS_DIR" ]; then
    mkdir -p "$REPORTS_DIR"
    echo -e "${GREEN}✓ Directorio $REPORTS_DIR creado${NC}"
fi

# Variables
TEST_TYPE="${1:-loadTest}"
BASE_URL="${QA_URL:-http://localhost:8080}"

echo -e "${YELLOW}=== Iniciando prueba de carga K6 ===${NC}"
echo "Tipo de prueba: $TEST_TYPE"
echo "URL del ambiente: $BASE_URL"
echo "Directorio de reportes: $REPORTS_DIR"
echo ""

# Ejecutar k6
k6 run \
    -e BASE_URL="$BASE_URL" \
    -e TEST_TYPE="$TEST_TYPE" \
    ./src/prueba_flujo_mejorada.js

# Buscar el último reporte generado
LATEST_REPORT=$(ls -t "$REPORTS_DIR"/report-*.html 2>/dev/null | head -1)

if [ -n "$LATEST_REPORT" ]; then
    echo ""
    echo -e "${GREEN}✓ Prueba completada exitosamente${NC}"
    echo -e "${GREEN}Reporte generado: $LATEST_REPORT${NC}"
    echo ""
    echo "Abriendo reporte en el navegador..."

    if command -v xdg-open > /dev/null 2>&1; then
        # Linux
        xdg-open "$LATEST_REPORT"
    elif command -v open > /dev/null 2>&1; then
        # macOS
        open "$LATEST_REPORT"
    elif command -v start > /dev/null 2>&1; then
        # Windows (Git Bash)
        start "$LATEST_REPORT"
    else
        echo "Abre manualmente: $LATEST_REPORT"
    fi
else
    echo -e "${RED}✗ No se generó reporte HTML${NC}"
    exit 1
fi