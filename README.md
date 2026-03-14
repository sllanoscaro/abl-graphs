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