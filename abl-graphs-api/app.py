from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg
from psycopg.rows import dict_row
from datetime import datetime
from file_monitor import FileMonitor
import json
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME')

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

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

def parse_log_data(log_file_path):
    """Parse sensor data from log file"""
    imet_data = []
    drone_data = []

    if not os.path.exists(log_file_path):
        return {"imet_data": imet_data, "drone_data": drone_data}

    try:
        with open(log_file_path, 'r') as f:
            lines = f.readlines()

        for line in lines:
            line = line.strip()
            if line.startswith('sensors/ImetNode/imet_data:'):
                # Extract JSON data after the colon
                json_str = line.split(':', 1)[1].strip()
                data = json.loads(json_str)
                imet_data.append(data)
            elif line.startswith('sensors/DroneNode/drone_data:'):
                # Extract JSON data after the colon
                json_str = line.split(':', 1)[1].strip()
                data = json.loads(json_str)
                drone_data.append(data)

        return {"imet_data": imet_data, "drone_data": drone_data}
    except Exception as e:
        print(f"Error parsing log file: {e}")
        return {"imet_data": imet_data, "drone_data": drone_data}

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

@app.route("/api/mission/realtime", methods=["GET"])
def get_mission_realtime():
    """Get mission status and data in a single request"""
    response = {
        "status": {
            "active": mission_status["active"],
            "active_drones": mission_status["active_drones"],
            "current_mission_file": mission_status["current_mission_file"],
            "start_time": mission_status["start_time"],
            "last_activity": mission_status["last_activity"]
        },
        "data": []
    }
    
    # Only fetch data if mission is active
    if mission_status["active"] and mission_status["current_mission_file"]:
        log_file_path = os.path.join('..', 'rawdata', mission_status["current_mission_file"])

        parsed_data = parse_log_data(log_file_path)
        
        # Combine imet and drone data with timestamps
        imet_index = 0
        drone_index = 0
        
        while imet_index < len(parsed_data["imet_data"]) and drone_index < len(parsed_data["drone_data"]):
            # Get timestamp from drone data
            drone_entry = parsed_data["drone_data"][drone_index]
            timestamp = drone_entry.get("timestamp", 0)
            
            # Get corresponding imet data
            if imet_index < len(parsed_data["imet_data"]):
                imet_entry = parsed_data["imet_data"][imet_index]
                
                response["data"].append({
                    "timestamp": timestamp,
                    "presion": imet_entry.get("Presion"),
                    "temperatura": imet_entry.get("Temperatura"),
                    "humedad": imet_entry.get("Humedad"),
                    "altitud": imet_entry.get("Altitude")
                })
                
                imet_index += 1
            
            drone_index += 1
    
    return jsonify(response), 200

@app.route("/api/mission/<int:mission_id>/data", methods=["GET"])
def get_mission_data_by_id(mission_id):
    """Get detailed mission data including sensor readings"""
    try:
        with psycopg.connect(DATABASE_URL, connect_timeout=5, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                # Get mission info
                cur.execute("""
                    SELECT IdMision, Latitud, Longitud, FechaHora, HoraInicio, HoraTermino, PlanVuelo
                    FROM Mision
                    WHERE IdMision = %s
                """, (mission_id,))
                mission_info = cur.fetchone()

                if not mission_info:
                    return jsonify({"error": "Mission not found"}), 404

                # Get sensor readings - Debug query
                cur.execute("""
                    SELECT Tipo, Valor, Altura, HoraMinSeg
                    FROM LecturaSensor
                    WHERE IdMision = %s
                    ORDER BY Altura DESC, HoraMinSeg ASC
                """, (mission_id,))
                readings = cur.fetchall()

                print(f"Mission {mission_id}: Found {len(readings)} sensor readings")

        # Organize data by sensor type
        data_by_type = {}
        for reading in readings:
            sensor_type = reading['tipo']
            if sensor_type not in data_by_type:
                data_by_type[sensor_type] = {
                    'altitudes': [],
                    'valores': []
                }
            data_by_type[sensor_type]['altitudes'].append(float(reading['altura']) if reading['altura'] else 0)
            data_by_type[sensor_type]['valores'].append(float(reading['valor']) if reading['valor'] else 0)

        print(f"Mission {mission_id}: Data organized by types: {list(data_by_type.keys())}")

        # Format response - Remove direccion_viento from response
        response = {
            "missionInfo": {
                "idmision": mission_info['idmision'],
                "latitud": float(mission_info['latitud']) if mission_info['latitud'] else None,
                "longitud": float(mission_info['longitud']) if mission_info['longitud'] else None,
                "fechahora": _to_serializable(mission_info['fechahora']),
                "horainicio": str(mission_info['horainicio']) if mission_info['horainicio'] else None,
                "horatermino": str(mission_info['horatermino']) if mission_info['horatermino'] else None,
                "planvuelo": mission_info['planvuelo']
            },
            "charts": {
                "velocidad_viento": data_by_type.get('Velocidad_Viento', {'altitudes': [], 'valores': []}),
                "temperatura": data_by_type.get('Temperatura', {'altitudes': [], 'valores': []}),
                "presion": data_by_type.get('Presion', {'altitudes': [], 'valores': []}),
                "humedad": data_by_type.get('Humedad', {'altitudes': [], 'valores': []})
            }
        }

        return jsonify(response), 200

    except Exception as e:
        print(f"Error fetching mission data: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/mission/data", methods=["GET"])
def get_mission_data():
    """Get sensor data from the current mission log file"""
    if not mission_status["active"] or not mission_status["current_mission_file"]:
        return jsonify({"error": "No active mission"}), 404

    log_file_path = os.path.join('..', 'rawdata', mission_status["current_mission_file"])
    data = parse_log_data(log_file_path)

    # Combine imet and drone data with timestamps
    combined_data = []

    # Create a mapping of drone timestamps to imet data
    imet_index = 0
    drone_index = 0

    while imet_index < len(data["imet_data"]) and drone_index < len(data["drone_data"]):
        # Get timestamp from drone data
        drone_entry = data["drone_data"][drone_index]
        timestamp = drone_entry.get("timestamp", 0)

        # Get corresponding imet data
        if imet_index < len(data["imet_data"]):
            imet_entry = data["imet_data"][imet_index]

            combined_data.append({
                "timestamp": timestamp,
                "presion": imet_entry.get("Presion"),
                "temperatura": imet_entry.get("Temperatura"),
                "humedad": imet_entry.get("Humedad"),
                "altitud": imet_entry.get("Altitude")
            })

            imet_index += 1

        drone_index += 1

    return jsonify(combined_data), 200

@app.route("/api/mission/stop", methods=["POST"])
def stop_mission():
    """Manually stop the current mission"""
    mission_status["active"] = False
    mission_status["active_drones"] = 0
    mission_status["current_mission_file"] = None
    mission_status["start_time"] = None
    mission_status["last_activity"] = None
    return jsonify({"message": "Mission stopped", "status": mission_status}), 200

@app.route("/api/reports/wind-contour", methods=["POST"])
def get_wind_contour():
    """Generate wind contour plot data from multiple missions"""
    try:
        data = request.get_json()
        mission_ids = data.get('missionIds', [])

        if not mission_ids:
            return jsonify({"error": "No mission IDs provided"}), 400

        with psycopg.connect(DATABASE_URL, connect_timeout=5, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                # Get wind data for all selected missions
                placeholders = ','.join(['%s'] * len(mission_ids))
                query = f"""
                    SELECT 
                        ls.IdMision,
                        m.PlanVuelo,
                        ls.Altura,
                        ls.Tipo,
                        ls.Valor
                    FROM LecturaSensor ls
                    JOIN Mision m ON ls.IdMision = m.IdMision
                    WHERE ls.IdMision IN ({placeholders})
                    AND ls.Tipo IN ('Velocidad_Viento', 'Direccion_Viento')
                    ORDER BY ls.IdMision, ls.Altura
                """

                cur.execute(query, tuple(mission_ids))
                readings = cur.fetchall()

        if not readings:
            return jsonify({"error": "No wind data found for selected missions"}), 404

        # Organize data by mission and altitude
        missions_data = {}
        for reading in readings:
            mission_id = reading['idmision']
            altura = float(reading['altura']) if reading['altura'] else 0
            tipo = reading['tipo']
            valor = float(reading['valor']) if reading['valor'] else 0

            if mission_id not in missions_data:
                missions_data[mission_id] = {
                    'label': reading['planvuelo'] or f"Misión {mission_id}",
                    'altitudes': set(),
                    'velocities': {},
                    'directions': {}
                }

            missions_data[mission_id]['altitudes'].add(altura)

            if tipo == 'Velocidad_Viento':
                missions_data[mission_id]['velocities'][altura] = valor
            elif tipo == 'Direccion_Viento':
                missions_data[mission_id]['directions'][altura] = valor

        # Create sorted lists for plotting
        all_altitudes = sorted(set().union(*[m['altitudes'] for m in missions_data.values()]))
        mission_list = sorted(missions_data.keys())

        # Build the Z matrix (altitudes x missions)
        z_matrix = []
        scatter_x = []
        scatter_y = []
        directions = []

        for altura in all_altitudes:
            row = []
            for mission_id in mission_list:
                velocity = missions_data[mission_id]['velocities'].get(altura, None)
                direction = missions_data[mission_id]['directions'].get(altura, None)

                row.append(velocity)

                # Add scatter points for wind direction arrows
                if velocity is not None and direction is not None:
                    scatter_x.append(mission_id)
                    scatter_y.append(altura)
                    directions.append(direction)

            z_matrix.append(row)

        # Prepare response
        response = {
            "missions": mission_list,
            "missionLabels": [missions_data[mid]['label'] for mid in mission_list],
            "altitudes": all_altitudes,
            "velocities": z_matrix,
            "scatterX": scatter_x,
            "scatterY": scatter_y,
            "directions": directions
        }

        return jsonify(response), 200

    except Exception as e:
        print(f"Error generating wind contour: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500

if __name__ == "__main__":
    # Start file monitoring
    file_monitor.start_monitoring()

    try:
        app.run(debug=True)
    finally:
        file_monitor.stop_monitoring()