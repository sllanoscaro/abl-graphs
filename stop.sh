#!/bin/bash

# Script para detener el proyecto ABL-Graphs

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
echo -e "${BLUE}  Deteniendo Proyecto ABL-Graphs${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Verificar si existen los archivos de estado
if [ ! -f "$LOGS_DIR/status.txt" ]; then
    echo -e "${YELLOW}No se encontró información de estado.${NC}"
    echo -e "${YELLOW}El proyecto no parece estar corriendo.${NC}\n"
    exit 0
fi

# Leer información del estado
source "$LOGS_DIR/status.txt"

# Función para detener un proceso
stop_process() {
    local pid=$1
    local name=$2

    if [ -z "$pid" ]; then
        echo -e "${YELLOW}✗ $name: No se encontró PID${NC}"
        return 1
    fi

    if ps -p $pid > /dev/null 2>&1; then
        echo -e "${YELLOW}Deteniendo $name (PID: $pid)...${NC}"
        kill $pid

        # Esperar a que el proceso termine
        local count=0
        while ps -p $pid > /dev/null 2>&1 && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done

        # Si aún está corriendo, forzar
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${YELLOW}Forzando detención de $name...${NC}"
            kill -9 $pid
            sleep 1
        fi

        if ! ps -p $pid > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $name detenido correctamente${NC}"
            return 0
        else
            echo -e "${RED}✗ No se pudo detener $name${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}✗ $name ya estaba detenido${NC}"
        return 0
    fi
}

# Detener Backend
stop_process "$BACKEND_PID" "Backend (Flask)"

# Detener Frontend
stop_process "$FRONTEND_PID" "Frontend (React)"

# Limpiar archivos de estado
echo -e "\n${YELLOW}Limpiando archivos de estado...${NC}"
rm -f "$LOGS_DIR/backend.pid" "$LOGS_DIR/frontend.pid" "$LOGS_DIR/status.txt"
echo -e "${GREEN}✓ Archivos de estado eliminados${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ Proyecto Detenido${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${BLUE}Logs guardados en:${NC}"
echo -e "  - $LOGS_DIR/backend.log"
echo -e "  - $LOGS_DIR/frontend.log"
echo -e "\n${YELLOW}Para iniciar nuevamente: ${NC}${BLUE}./start.sh${NC}\n"

