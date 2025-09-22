from flask import Flask, jsonify
from flask_cors import CORS
import psycopg

app = Flask(__name__)
CORS(app)

# Replace this with your actual PostgreSQL connection string
DATABASE_URL = "postgresql://droneuser:dronedbpassword1@localhost:5432/testing"

def _to_serializable(v):
    # Convierte datetime/date a ISO para que jsonify no falle:
    if isinstance(v, (datetime, date)):
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
    SQL = """
    SELECT id, name, date, status
    FROM missions
    ORDER BY date DESC NULLS LAST, id DESC
    """
    try:
        with psycopg.connect(DATABASE_URL, connect_timeout=5, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(SQL)
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

if __name__ == "__main__":
    app.run(debug=True)
