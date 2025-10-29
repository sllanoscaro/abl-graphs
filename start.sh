#!/bin/bash

# Script para levantar todo el proyecto ABL-Graphs
# Backend (Flask API) + Frontend (React)

set -e  # Salir si hay algún error

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Iniciando Proyecto ABL-Graphs${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Directorio raíz del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/abl-graphs-api"
FRONTEND_DIR="$PROJECT_DIR/abl-graphs-ui"
RAWDATA_DIR="$PROJECT_DIR/rawdata"
LOGS_DIR="$PROJECT_DIR/.logs"

# Crear directorio para logs si no existe
mkdir -p "$LOGS_DIR"
mkdir -p "$RAWDATA_DIR"

# Verificar que existe el archivo .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${RED}Error: No se encontró el archivo .env en $BACKEND_DIR${NC}"
    echo -e "${YELLOW}Por favor, crea el archivo .env con las credenciales de la base de datos${NC}"
    exit 1
fi

# ===========================
# 1. Poblar Base de Datos
# ===========================
echo -e "${YELLOW}[1/3] Poblando Base de Datos...${NC}"
cd "$BACKEND_DIR"

# Verificar si Python está disponible
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python3 no está instalado${NC}"
    exit 1
fi

# Ejecutar script para poblar BD
python3 postgres_utils/postgresql_config.py
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Base de datos poblada exitosamente${NC}\n"
else
    echo -e "${RED}✗ Error al poblar la base de datos${NC}"
    exit 1
fi

# ===========================
# 2. Iniciar Backend (Flask)
# ===========================
echo -e "${YELLOW}[2/3] Iniciando Backend (Flask API)...${NC}"

# Verificar si el entorno virtual existe en la raíz del proyecto
if [ ! -d "$PROJECT_DIR/.venv" ]; then
    echo -e "${RED}Error: No se encontró el entorno virtual en $PROJECT_DIR/.venv${NC}"
    echo -e "${YELLOW}Por favor, crea el entorno virtual e instala las dependencias primero:${NC}"
    echo -e "${YELLOW}  python3 -m venv .venv${NC}"
    echo -e "${YELLOW}  source .venv/bin/activate${NC}"
    echo -e "${YELLOW}  pip install -e abl-graphs-api/${NC}"
    exit 1
fi

# Activar entorno virtual
source "$PROJECT_DIR/.venv/bin/activate"
echo -e "${GREEN}✓ Entorno virtual activado${NC}"

# Cambiar al directorio del backend para ejecutar la app
cd "$BACKEND_DIR"


# Iniciar Flask en background
echo -e "${BLUE}Iniciando servidor Flask en http://localhost:5000${NC}"
nohup python3 app.py > "$LOGS_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$LOGS_DIR/backend.pid"
echo -e "${GREEN}✓ Backend iniciado (PID: $BACKEND_PID)${NC}\n"

# Esperar a que el backend esté listo
sleep 3

# ===========================
# 3. Iniciar Frontend (React)
# ===========================
echo -e "${YELLOW}[3/3] Iniciando Frontend (React)...${NC}"
cd "$FRONTEND_DIR"

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Instalando dependencias de npm...${NC}"
    npm install
fi

# Iniciar React en background
echo -e "${BLUE}Iniciando aplicación React en http://localhost:3000${NC}"
nohup npm start > "$LOGS_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$LOGS_DIR/frontend.pid"
echo -e "${GREEN}✓ Frontend iniciado (PID: $FRONTEND_PID)${NC}\n"

# ===========================
# Resumen
# ===========================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ Proyecto ABL-Graphs Iniciado${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}Backend:${NC}  http://localhost:5000"
echo -e "${BLUE}Frontend:${NC} http://localhost:3000"
echo -e "${YELLOW}Usa 'Ctrl+C' o cierra el terminal para detener los servicios${NC}\n"

# Guardar información del estado
cat > "$LOGS_DIR/status.txt" << EOF
BACKEND_PID=$BACKEND_PID
FRONTEND_PID=$FRONTEND_PID
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
START_TIME=$(date)
EOF

# Abrir el navegador después de un momento (opcional)
sleep 5
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 2>/dev/null &
elif command -v open &> /dev/null; then
    open http://localhost:3000 2>/dev/null &
fi

