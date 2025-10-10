from flask import Flask, jsonify
from flask_cors import CORS
import psycopg
from psycopg.rows import dict_row
from datetime import datetime
from file_monitor import FileMonitor

app = Flask(__name__)
CORS(app)

# Replace this with your actual PostgreSQL connection string
DATABASE_URL = "postgresql://droneuser:dronedbpassword1@localhost:5432/testing"

# Global variables for mission status
mission_status = {
    "active": False,
    "active_drones": 0,
    "current_mission_file": None,
    "start_time": None,
    "last_activity": None
}

# Initialize file monitor
file_monitor = FileMonitor(mission_status)

def _to_serializable(v):
    # Convierte datetime/date a ISO para que jsonify no falle:
    if isinstance(v, datetime):
        return v.isoformat()
    return v

@app.route("/api/db/health", methods=["GET"])
def db_health():
    try:
        # Attempt to connect to the DB using psycopg
        with psycopg.connect(DATABASE_URL, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                cur.fetchone()  # Check DB connection is working
        return jsonify(ok=True), 200  # This should return valid JSON
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 503  # This should also return valid JSON

@app.route("/api/missions", methods=["GET"])
def get_missions():
    sql = """
    SELECT IdMision, PlanVuelo, FechaHora
    FROM Mision
    ORDER BY FechaHora DESC NULLS LAST
    """
    try:
        with psycopg.connect(DATABASE_URL, connect_timeout=5, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                rows = cur.fetchall()  # lista de dicts

        # Asegurar serialización (fechas -> ISO)
        missions = [
            {k: _to_serializable(v) for k, v in row.items()}
            for row in rows
        ]
        return jsonify(missions), 200

    except Exception as e:
        # Log opcional: app.logger.exception(e)
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/mission/status", methods=["GET"])
def get_mission_status():
    """Get current mission status"""
    return jsonify(mission_status), 200

@app.route("/api/mission/stop", methods=["POST"])
def stop_mission():
    """Manually stop the current mission"""
    mission_status["active"] = False
    mission_status["active_drones"] = 0
    mission_status["current_mission_file"] = None
    mission_status["start_time"] = None
    mission_status["last_activity"] = None
    return jsonify({"message": "Mission stopped", "status": mission_status}), 200

if __name__ == "__main__":
    # Start file monitoring
    file_monitor.start_monitoring()

    try:
        app.run(debug=True)
    finally:
        file_monitor.stop_monitoring()
