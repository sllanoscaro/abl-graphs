import os
import psycopg
from datetime import datetime, time
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# PostgreSQL connection parameters
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME')

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


class PostgresqlExporter:
    def __init__(self):
        self.db_url = DATABASE_URL
        self.default_dron_id = 1
        self.sensor_ids = {
            'anemometro': 1,
            'imet': 2
        }

    def _get_next_mission_id(self, conn) -> int:
        with conn.cursor() as cur:
            cur.execute("SELECT COALESCE(MAX(IdMision), 0) + 1 FROM Mision")
            return cur.fetchone()[0]

    def _get_next_lectura_id(self, conn) -> int:
        with conn.cursor() as cur:
            cur.execute("SELECT COALESCE(MAX(IdLecturaSensor), 0) + 1 FROM LecturaSensor")
            return cur.fetchone()[0]

    def _parse_time_from_timestamp(self, timestamp_str: str) -> time:
        try:
            # If it's already in HH:MM:SS format
            parts = timestamp_str.split(':')
            if len(parts) == 3:
                return time(int(parts[0]), int(parts[1]), int(parts[2]))
        except Exception as e:
            logger.error(f"Error parsing time from {timestamp_str}: {e}")

        # Default to current time if parsing fails
        return datetime.now().time()

    def export_mission(self, mongo_collection, collection_name: str) -> bool:
        try:
            # Get metadata document
            metadata = mongo_collection.find_one({'_metadata': True})
            if not metadata:
                logger.error(f"No metadata found in collection {collection_name}")
                return False

            # Get all sensor readings (exclude metadata)
            readings = list(mongo_collection.find({'_metadata': {'$ne': True}}))
            if not readings:
                logger.warning(f"No sensor readings found in collection {collection_name}")
                return False

            # Extract mission timing information
            start_time = metadata.get('start_time')
            end_time = metadata.get('end_time')

            if not start_time:
                logger.error(f"No start_time in metadata for {collection_name}")
                return False

            # Convert to datetime if needed
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time)
            if isinstance(end_time, str):
                end_time = datetime.fromisoformat(end_time)

            # Get first and last reading times
            first_reading_time = self._parse_time_from_timestamp(readings[0].get('timestamp', '00:00:00'))
            last_reading_time = self._parse_time_from_timestamp(readings[-1].get('timestamp', '00:00:00'))

            # Default coordinates
            # TODO: Replace with actual mission coordinates if available
            default_lat = -34.1230
            default_lon = -58.4560

            # Connect to PostgreSQL and export
            with psycopg.connect(self.db_url) as conn:
                with conn.cursor() as cur:
                    # Get next mission ID
                    next_mission_id = self._get_next_mission_id(conn)

                    # Insert mission record
                    cur.execute("""
                        INSERT INTO Mision (IdMision, Latitud, Longitud, FechaHora, HoraInicio, HoraTermino, PlanVuelo)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        next_mission_id,
                        default_lat,
                        default_lon,
                        start_time,
                        first_reading_time,
                        last_reading_time if end_time else first_reading_time,
                        collection_name
                    ))

                    # Get next lectura ID
                    lectura_id = self._get_next_lectura_id(conn)

                    # Process each reading and create individual sensor entries
                    for reading in readings:
                        sensors = reading.get('sensors', {})
                        timestamp_str = reading.get('timestamp', '00:00:00')
                        reading_time = self._parse_time_from_timestamp(timestamp_str)
                        altura = sensors.get('altura', 0)

                        # Insert wind speed (Anemometro)
                        if 'velocidad_viento' in sensors:
                            cur.execute("""
                                INSERT INTO LecturaSensor (IdLecturaSensor, IdSensor, IdMision, Tipo, Valor, Altura, HoraMinSeg)
                                VALUES (%s, %s, %s, %s, %s, %s, %s)
                            """, (
                                lectura_id,
                                self.sensor_ids['anemometro'],
                                next_mission_id,
                                'Velocidad_Viento',
                                sensors['velocidad_viento'],
                                altura,
                                reading_time
                            ))
                            lectura_id += 1

                        # Insert pressure (IMET)
                        if 'presion' in sensors:
                            cur.execute("""
                                INSERT INTO LecturaSensor (IdLecturaSensor, IdSensor, IdMision, Tipo, Valor, Altura, HoraMinSeg)
                                VALUES (%s, %s, %s, %s, %s, %s, %s)
                            """, (
                                lectura_id,
                                self.sensor_ids['imet'],
                                next_mission_id,
                                'Presion',
                                sensors['presion'],
                                altura,
                                reading_time
                            ))
                            lectura_id += 1

                        # Insert temperature (IMET)
                        if 'temperatura' in sensors:
                            cur.execute("""
                                INSERT INTO LecturaSensor (IdLecturaSensor, IdSensor, IdMision, Tipo, Valor, Altura, HoraMinSeg)
                                VALUES (%s, %s, %s, %s, %s, %s, %s)
                            """, (
                                lectura_id,
                                self.sensor_ids['imet'],
                                next_mission_id,
                                'Temperatura',
                                sensors['temperatura'],
                                altura,
                                reading_time
                            ))
                            lectura_id += 1

                        # Insert humidity (IMET)
                        if 'humedad' in sensors:
                            cur.execute("""
                                INSERT INTO LecturaSensor (IdLecturaSensor, IdSensor, IdMision, Tipo, Valor, Altura, HoraMinSeg)
                                VALUES (%s, %s, %s, %s, %s, %s, %s)
                            """, (
                                lectura_id,
                                self.sensor_ids['imet'],
                                next_mission_id,
                                'Humedad',
                                sensors['humedad'],
                                altura,
                                reading_time
                            ))
                            lectura_id += 1

                    # Commit transaction
                    conn.commit()

                    # Calculate total sensor entries
                    total_sensor_entries = sum([
                        1 if 'velocidad_viento' in r.get('sensors', {}) else 0 +
                        1 if 'presion' in r.get('sensors', {}) else 0 +
                        1 if 'temperatura' in r.get('sensors', {}) else 0 +
                        1 if 'humedad' in r.get('sensors', {}) else 0
                        for r in readings
                    ])

                    logger.info(
                        f"Exported mission {collection_name} to PostgreSQL: "
                        f"Mission ID={next_mission_id}, {len(readings)} readings"
                    )

                    return True

        except psycopg.Error as e:
            logger.error(f"PostgreSQL error exporting {collection_name}: {e}")
            return False
        except Exception as e:
            logger.error(f"Error exporting {collection_name} to PostgreSQL: {e}")
            return False


# Global exporter instance
exporter = PostgresqlExporter()


def export_mission_to_postgres(mongo_collection, collection_name: str) -> bool:
    return exporter.export_mission(mongo_collection, collection_name)
