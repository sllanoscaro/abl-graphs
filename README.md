# ABL Graphs

Sistema de monitoreo y visualización de datos de misiones de drones con sensores atmosféricos (IMET y Anemómetro).

## Requisitos

- Python 3.8+
- Node.js 14+ y npm 6+
- PostgreSQL 12+

## Instalación Rápida

### 1. PostgreSQL

```bash
# Crear usuario y base de datos
sudo -u postgres psql << EOF
CREATE USER <DB_USER> WITH PASSWORD '<DB_PASSWORD>';
CREATE DATABASE <DB_NAME>;
GRANT ALL PRIVILEGES ON DATABASE <DB_NAME> TO <DB_USER>;
\c <DB_NAME>
GRANT ALL ON SCHEMA public TO <DB_USER>;
EOF
```

### 2. Backend

```bash
cd abl-graphs-api

# Crear entorno virtual e instalar
python3 -m venv venv
source venv/bin/activate
pip install -e .

# Configurar .env
cat > .env << EOF
DB_USER=<DB_USER>
DB_PASSWORD=<DB_PASSWORD>
DB_HOST=localhost
DB_PORT=5432
DB_NAME=<DB_NAME>
FLASK_ENV=development
EOF
```

## Ejecución

### Iniciar todo el sistema
```bash
./start.sh
```



### Simular datos del dron
```bash
./simulate.sh
# Presiona Ctrl+C para detener
```

### Detener el sistema
```bash
./stop.sh
```

## Estructura del Proyecto

```
abl-graphs/
├── abl-graphs-api/          # Backend Flask
│   ├── app.py               # API principal
│   ├── file_monitor.py      # Monitor de archivos
│   ├── data_simulator/      # Simulador de datos
│   └── postgres_utils/      # Configuración de BD
├── abl-graphs-ui/           # Frontend React
│   └── src/components/      # Componentes de UI
├── rawdata/                 # Archivos .log del dron
├── start.sh                 # Iniciar sistema
├── simulate.sh              # Simular datos
└── stop.sh                  # Detener sistema
```

**Puertos:**
- Frontend: 3000
- Backend API: 5000
- PostgreSQL: 5432

## Base de Datos

**Tablas:**
- `Dron`: Información de drones
- `Sensor`: Sensores (IMET, Anemómetro)
- `Mision`: Planes de vuelo
- `LecturaSensor`: Mediciones (presión, temperatura, humedad, velocidad/dirección viento)
