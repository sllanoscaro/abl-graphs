#!/bin/bash

# Script para simular entrada de datos del dron

set -e  # Salir si hay algún error

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directorio raíz del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/abl-graphs-api"
SIMULATOR_SCRIPT="$BACKEND_DIR/data_simulator/simular_entrada_datos.py"
RAWDATA_DIR="$PROJECT_DIR/rawdata"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Simulador de Datos de Dron${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Verificar que existe el script de simulación
if [ ! -f "$SIMULATOR_SCRIPT" ]; then
    echo -e "${RED}Error: No se encontró el script de simulación${NC}"
    echo -e "${RED}Ruta esperada: $SIMULATOR_SCRIPT${NC}"
    exit 1
fi

# Verificar que existe el directorio rawdata
if [ ! -d "$RAWDATA_DIR" ]; then
    echo -e "${YELLOW}El directorio rawdata no existe. Creándolo...${NC}"
    mkdir -p "$RAWDATA_DIR"
fi

# Verificar si Python está disponible
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python3 no está instalado${NC}"
    exit 1
fi

# Verificar si hay archivos previos en rawdata
FILE_COUNT=$(ls -1 "$RAWDATA_DIR" 2>/dev/null | wc -l)
if [ $FILE_COUNT -gt 0 ]; then
    echo -e "${YELLOW}Se encontraron $FILE_COUNT archivo(s) en rawdata:${NC}"
    ls -lh "$RAWDATA_DIR" | tail -n +2 | awk '{print "  - " $9 " (" $5 ")"}'
    echo ""
fi

# Ejecutar el simulador
echo -e "${YELLOW}Iniciando simulación de datos...${NC}"
echo -e "${BLUE}Los datos se escribirán en: $RAWDATA_DIR/mision1.log${NC}"
echo -e "${YELLOW}Presiona Ctrl+C para detener la simulación${NC}\n"

# Verificar si el entorno virtual existe en la raíz del proyecto y activarlo
if [ -d "$PROJECT_DIR/.venv" ]; then
    source "$PROJECT_DIR/.venv/bin/activate"
    echo -e "${GREEN}✓ Entorno virtual activado${NC}\n"
fi

cd "$BACKEND_DIR"


# Ejecutar el script de simulación
python3 data_simulator/simular_entrada_datos.py

# Capturar el código de salida
EXIT_CODE=$?

echo -e "\n${GREEN}========================================${NC}"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}  ✓ Simulación Completada${NC}"
    echo -e "${GREEN}========================================${NC}\n"

    # Mostrar información del archivo generado
    if [ -f "$RAWDATA_DIR/mision1.log" ]; then
        FILE_SIZE=$(du -h "$RAWDATA_DIR/mision1.log" | cut -f1)
        LINE_COUNT=$(wc -l < "$RAWDATA_DIR/mision1.log")
        echo -e "${BLUE}Archivo generado:${NC}"
        echo -e "  Ruta: $RAWDATA_DIR/mision1.log"
        echo -e "  Tamaño: $FILE_SIZE"
        echo -e "  Líneas: $LINE_COUNT"
        echo ""
    fi

    # Limpiar el directorio rawdata
    echo -e "${YELLOW}Limpiando directorio rawdata...${NC}"
    rm -f "$RAWDATA_DIR"/*

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Directorio rawdata limpiado exitosamente${NC}\n"
    else
        echo -e "${RED}✗ Error al limpiar el directorio rawdata${NC}\n"
    fi

else
    echo -e "${RED}  ✗ Simulación Interrumpida o con Errores${NC}"
    echo -e "${RED}========================================${NC}\n"

    # Preguntar si se desea limpiar los archivos parciales
    echo -e "${YELLOW}¿Deseas limpiar los archivos generados? (s/n)${NC}"
    read -r -n 1 RESPONSE
    echo ""

    if [[ "$RESPONSE" =~ ^[SsYy]$ ]]; then
        echo -e "${YELLOW}Limpiando directorio rawdata...${NC}"
        rm -f "$RAWDATA_DIR"/*
        echo -e "${GREEN}✓ Directorio rawdata limpiado${NC}\n"
    else
        echo -e "${BLUE}Los archivos se mantienen en: $RAWDATA_DIR${NC}\n"
    fi
fi

# Información adicional
echo -e "${BLUE}Información:${NC}"
echo -e "  Para ver el estado del sistema: ${YELLOW}./status.sh${NC}"
echo -e "  Para ver Analytics en tiempo real, abre: ${YELLOW}http://localhost:3000${NC}\n"

