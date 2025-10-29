#!/bin/bash

# Script para verificar el estado del proyecto ABL-Graphs

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directorio raíz del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$PROJECT_DIR/.logs"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Estado del Proyecto ABL-Graphs${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Función para verificar si un proceso está corriendo
check_process() {
    local pid=$1
    local name=$2

    if [ -z "$pid" ]; then
        echo -e "${RED}✗ $name: No iniciado${NC}"
        return 1
    fi

    if ps -p $pid > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $name: Corriendo (PID: $pid)${NC}"
        return 0
    else
        echo -e "${RED}✗ $name: Detenido (PID: $pid no encontrado)${NC}"
        return 1
    fi
}

# Verificar si existen los archivos de estado
if [ ! -f "$LOGS_DIR/status.txt" ]; then
    echo -e "${RED}No se encontró información de estado.${NC}"
    echo -e "${YELLOW}El proyecto no ha sido iniciado o los archivos de estado fueron eliminados.${NC}"
    echo -e "${YELLOW}Ejecuta './start.sh' para iniciar el proyecto.${NC}\n"
    exit 1
fi

# Leer información del estado
source "$LOGS_DIR/status.txt"

# Verificar Backend
echo -e "${BLUE}Backend (Flask API):${NC}"
if check_process "$BACKEND_PID" "Flask"; then
    echo -e "  ${BLUE}URL:${NC} $BACKEND_URL"

    # Verificar si el servidor responde
    if command -v curl &> /dev/null; then
        if curl -s "$BACKEND_URL/api/db/status" > /dev/null 2>&1; then
            echo -e "  ${GREEN}Servidor respondiendo correctamente${NC}"
        else
            echo -e "  ${YELLOW}Servidor no responde a peticiones${NC}"
        fi
    fi

    echo -e "  ${BLUE}Log:${NC} $LOGS_DIR/backend.log"
fi
echo ""

# Verificar Frontend
echo -e "${BLUE}Frontend (React):${NC}"
if check_process "$FRONTEND_PID" "React"; then
    echo -e "  ${BLUE}URL:${NC} $FRONTEND_URL"
    echo -e "  ${BLUE}Log:${NC} $LOGS_DIR/frontend.log"
fi
echo ""

# Información adicional
echo -e "${BLUE}Información Adicional:${NC}"
echo -e "  ${BLUE}Iniciado:${NC} $START_TIME"

# Verificar directorio rawdata
RAWDATA_DIR="$PROJECT_DIR/rawdata"
if [ -d "$RAWDATA_DIR" ]; then
    FILE_COUNT=$(ls -1 "$RAWDATA_DIR" 2>/dev/null | wc -l)
    echo -e "  ${BLUE}Archivos en rawdata:${NC} $FILE_COUNT"

    if [ $FILE_COUNT -gt 0 ]; then
        echo -e "  ${BLUE}Archivos:${NC}"
        ls -lh "$RAWDATA_DIR" | tail -n +2 | awk '{print "    - " $9 " (" $5 ")"}'
    fi
fi
echo ""

# Comandos útiles
echo -e "${YELLOW}Comandos Útiles:${NC}"
echo -e "  Ver logs backend:  ${BLUE}tail -f $LOGS_DIR/backend.log${NC}"
echo -e "  Ver logs frontend: ${BLUE}tail -f $LOGS_DIR/frontend.log${NC}"
echo -e "  Detener backend:   ${BLUE}kill $BACKEND_PID${NC}"
echo -e "  Detener frontend:  ${BLUE}kill $FRONTEND_PID${NC}"
echo -e "  Simular datos:     ${BLUE}./simulate.sh${NC}"
echo ""

# Estado general
BACKEND_RUNNING=0
FRONTEND_RUNNING=0

if ps -p $BACKEND_PID > /dev/null 2>&1; then
    BACKEND_RUNNING=1
fi

if ps -p $FRONTEND_PID > /dev/null 2>&1; then
    FRONTEND_RUNNING=1
fi

if [ $BACKEND_RUNNING -eq 1 ] && [ $FRONTEND_RUNNING -eq 1 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✓ Sistema Completamente Operativo${NC}"
    echo -e "${GREEN}========================================${NC}\n"
    exit 0
elif [ $BACKEND_RUNNING -eq 1 ] || [ $FRONTEND_RUNNING -eq 1 ]; then
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  ⚠ Sistema Parcialmente Operativo${NC}"
    echo -e "${YELLOW}========================================${NC}\n"
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  ✗ Sistema Detenido${NC}"
    echo -e "${RED}========================================${NC}\n"
    exit 1
fi

