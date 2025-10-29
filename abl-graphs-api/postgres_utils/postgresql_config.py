import os
import sys
import psycopg
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env relativo al directorio actual
# Asume que el script se ejecuta desde abl-graphs-api/
env_path = Path('.env')
if not env_path.exists():
    # Si se ejecuta desde postgres_utils/, buscar en el directorio padre
    env_path = Path('../.env')
load_dotenv(env_path)

# Construir URL de conexión desde variables de entorno
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME')

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Ruta al archivo SQL relativa al directorio actual
SQL_FILE = Path('postgres_utils/crear_tablas_y_poblar.sql')
if not SQL_FILE.exists():
    # Si se ejecuta desde postgres_utils/, ajustar la ruta
    SQL_FILE = Path('crear_tablas_y_poblar.sql')

def read_sql_file(filepath):
    """Lee el contenido del archivo SQL"""
    try:
        with open(filepath, 'r', encoding='utf-8') as file:
            return file.read()
    except FileNotFoundError:
        print(f"Error: No se encontró el archivo {filepath}")
        sys.exit(1)
    except Exception as e:
        print(f"Error al leer el archivo SQL: {e}")
        sys.exit(1)


def check_tables_exist():
    """Verifica si las tablas ya existen y están pobladas"""
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Verificar si existen las tablas principales
                cur.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('dron', 'sensor', 'mision', 'lecturasensor')
                    ORDER BY table_name;
                """)

                tables = cur.fetchall()

                # Si no existen las 4 tablas, retornar False
                if len(tables) < 4:
                    return False

                # Verificar que las tablas tengan datos
                cur.execute("SELECT COUNT(*) FROM dron;")
                dron_count = cur.fetchone()[0]

                cur.execute("SELECT COUNT(*) FROM sensor;")
                sensor_count = cur.fetchone()[0]

                cur.execute("SELECT COUNT(*) FROM mision;")
                mision_count = cur.fetchone()[0]

                # Si todas las tablas existen y tienen datos, retornar True
                if dron_count > 0 and sensor_count > 0 and mision_count > 0:
                    print("\n✓ Las tablas ya están creadas y pobladas:")
                    print(f"  - Dron: {dron_count} registros")
                    print(f"  - Sensor: {sensor_count} registros")
                    print(f"  - Mision: {mision_count} registros")

                    cur.execute("SELECT COUNT(*) FROM lecturasensor;")
                    lectura_count = cur.fetchone()[0]
                    print(f"  - LecturaSensor: {lectura_count} registros")

                    return True

                return False

    except psycopg.OperationalError:
        # Si hay error de conexión, retornar False para intentar crear las tablas
        return False
    except psycopg.errors.UndefinedTable:
        # Si alguna tabla no existe, retornar False
        return False
    except Exception:
        # Cualquier otro error, retornar False
        return False


def execute_sql_script(sql_content):
    """Ejecuta el script SQL completo"""
    try:
        print(f"Conectando a la base de datos: {DB_NAME} en {DB_HOST}:{DB_PORT}")
        print(f"Usuario: {DB_USER}")

        with psycopg.connect(DATABASE_URL, autocommit=False) as conn:
            with conn.cursor() as cur:
                print("\nEjecutando script SQL...")

                # Ejecutar el script completo
                cur.execute(sql_content)

                # Confirmar los cambios
                conn.commit()

                print("✓ Script ejecutado exitosamente")
                print("✓ Tablas creadas y datos insertados correctamente")

                # Verificar las tablas creadas
                cur.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    ORDER BY table_name;
                """)

                tables = cur.fetchall()
                if tables:
                    print(f"\nTablas creadas ({len(tables)}):")
                    for table in tables:
                        print(f"  - {table[0]}")

                # Mostrar conteo de registros
                print("\nConteo de registros:")
                for table_name in ['dron', 'sensor', 'mision', 'lecturasensor']:
                    cur.execute(f"SELECT COUNT(*) FROM {table_name};")
                    count = cur.fetchone()[0]
                    print(f"  - {table_name.capitalize()}: {count} registros")

    except psycopg.OperationalError as e:
        print(f"\n❌ Error de conexión a la base de datos:")
        print(f"   {e}")
        print("\nVerifica que:")
        print("  1. PostgreSQL esté ejecutándose")
        print("  2. Las credenciales en el archivo .env sean correctas")
        print("  3. La base de datos exista")
        sys.exit(1)
    except psycopg.errors.DuplicateTable as e:
        print(f"\n⚠️  Advertencia: Algunas tablas ya existen")
        print(f"   {e}")
        print("\nSi deseas recrear las tablas, ejecuta primero:")
        print("  DROP TABLE IF EXISTS LecturaSensor, Mision, Sensor, Dron CASCADE;")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error al ejecutar el script SQL:")
        print(f"   {e}")
        sys.exit(1)


def main():
    """Función principal"""
    print("=" * 60)
    print("  Script de Creación y Población de Base de Datos")
    print("  ABL Graphs - Sistema de Monitoreo de Drones")
    print("=" * 60)

    # Verificar que existe el archivo .env
    if not Path('.env').exists() and not Path('../.env').exists():
        print(f"\n❌ Error: No se encontró el archivo .env")
        print("   Crea el archivo .env en el directorio abl-graphs-api/")
        print("   Ejecuta el script desde abl-graphs-api/ o abl-graphs-api/postgres_utils/")
        sys.exit(1)

    # Verificar que existe el archivo SQL
    if not SQL_FILE.exists():
        print(f"\n❌ Error: No se encontró el archivo SQL en {SQL_FILE}")
        sys.exit(1)

    # Verificar si las tablas ya existen y están pobladas
    print("\nVerificando estado de la base de datos...")
    if check_tables_exist():
        print("\n✓ No es necesario ejecutar el script de creación.")
        print("  Las tablas ya están listas para usar.")
        print("\n" + "=" * 60)
        print("  ✓ Base de datos lista")
        print("=" * 60)
        return

    # Leer el archivo SQL
    print("\nLas tablas no existen o están vacías. Procediendo con la creación...")
    sql_content = read_sql_file(SQL_FILE)

    # Ejecutar el script
    execute_sql_script(sql_content)

    print("\n" + "=" * 60)
    print("  ✓ Proceso completado exitosamente")
    print("=" * 60)


if __name__ == "__main__":
    main()

