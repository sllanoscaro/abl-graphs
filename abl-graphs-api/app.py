from flask import Flask, jsonify
from flask_cors import CORS
import psycopg
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv
import SensorDataAggregator
import paho.mqtt.client as mqtt
import logging

# Load environment variables from .env file
load_dotenv()

# Basic Flask app setup
app = Flask(__name__)
CORS(app)
API_PORT = os.getenv("API_PORT", "5000")

# Basic logging setup
logging.basicConfig(filename= './logs/app.log', level=logging.INFO,
                    format='%(asctime)s %(levelname)s:%(message)s')
logger = logging.getLogger(__name__)

# Database connection setup
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME')

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# MQTT client setup
MQTT_HOST = os.getenv('MQTT_HOST', 'localhost')
MQTT_PORT = os.getenv('MQTT_PORT', '1883')
mqtt_client = None

# Global storage for sensor data during mission
mission_sensor_data = []

# Callback function to store averaged sensor data
def store_sensor_data(averaged_data):
    """Callback invoked when SensorDataAggregator emits averaged data"""
    global mission_sensor_data

    # None signal means clear the data (mission ended)
    if averaged_data is None:
        mission_sensor_data.clear()
    else:
        mission_sensor_data.append(averaged_data)

# Initialize MQTT client and set up callbacks
def initialize_mqtt_client():
    # Setup data storage callback
    SensorDataAggregator.aggregator.on_data_averaged_callback = store_sensor_data

    client_id = f"abl-graphs-{os.getpid()}"
    client = mqtt.Client(client_id=client_id, callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = SensorDataAggregator.on_connect
    client.on_message = SensorDataAggregator.on_message
    client.on_disconnect = SensorDataAggregator.on_disconnect
    logger.info("Connecting to MQTT broker at %s:%s with client_id=%s", MQTT_HOST, MQTT_PORT, client_id)

    client.connect(MQTT_HOST, int(MQTT_PORT), 60)
    client.loop_start()
    logger.info("MQTT client loop started successfully")

    return client

# Converts datetime and time to ISO format for JSON serialization
def _to_serializable(v):
    if hasattr(v, 'isoformat'):
        return v.isoformat()
    return v

# Health check endpoint for database connectivity
@app.route("/api/db/health", methods=["GET"])
def db_health():
    try:
        with psycopg.connect(DATABASE_URL, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                cur.fetchone()

        logger.info("Database health check successful")
        return jsonify(ok=True), 200

    except Exception as databaseExceptionMsg:
        logger.error("Database health check failed: %s", str(databaseExceptionMsg))
        return jsonify(ok=False), 503

# Endpoint to fetch all missions from the database
@app.route("/api/missions", methods=["GET"])
def get_missions():
    sql = """
    SELECT IdMision, PlanVuelo, FechaHora, Latitud, Longitud, HoraInicio, HoraTermino
    FROM Mision
    ORDER BY FechaHora DESC NULLS LAST
    """

    try:
        with psycopg.connect(DATABASE_URL, connect_timeout=5, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                rows = cur.fetchall()

        # Apply serialization to each row
        missions = [
            {k: _to_serializable(v) for k, v in row.items()}
            for row in rows
        ]
        logger.info("Found %s missions on database", len(missions))
        return jsonify(missions), 200

    except Exception as getMissionsExceptionMsg:
        logger.error("Error fetching missions: %s", str(getMissionsExceptionMsg))
        return jsonify(ok=False), 500

# Endpoint to get current mission status
@app.route("/api/mission/status", methods=["GET"])
def get_mission_status():
    try:
        status = {
            "active": SensorDataAggregator.aggregator.mission_active,
            "status_message": SensorDataAggregator.aggregator.mission_status_message
        }
        return jsonify(status), 200
    except Exception as missionStatusExceptionMsg:
        logger.error("Error fetching mission status: %s", str(missionStatusExceptionMsg))
        return jsonify({"error": str(missionStatusExceptionMsg)}), 500

# Endpoint to get real-time mission data and status
@app.route("/api/mission/realtime", methods=["GET"])
def get_mission_realtime():
    try:
        global mission_sensor_data

        # Simple status: always 1 active drone if mission is active
        is_active = SensorDataAggregator.aggregator.mission_active

        status = {
            "active": is_active,
            "status_message": SensorDataAggregator.aggregator.mission_status_message,
            "active_drones": 1 if is_active else 0
        }

        return jsonify({
            "status": status,
            "data": mission_sensor_data
        }), 200

    except Exception as e:
        logger.error("Error fetching mission realtime data: %s", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    try:
        mqtt_client = initialize_mqtt_client()
    except Exception as mqttExceptionMsg:
        logger.error("Failed to connect to MQTT broker: %s", str(mqttExceptionMsg))

    try:
        app.run(host="0.0.0.0", port=int(API_PORT), debug=False,
                use_reloader=False, threaded=True)
    finally:
        if mqtt_client:
            try:
                mqtt_client.loop_stop()
                mqtt_client.disconnect()
                logger.info("Disconnected from MQTT broker")
            except Exception as mqttConnectionExceptionMsg:
                logger.error("Error disconnecting MQTT client: %s", str(mqttConnectionExceptionMsg))