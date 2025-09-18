from flask import Flask, jsonify
from flask_cors import CORS
import psycopg

app = Flask(__name__)
CORS(app)

# Replace this with your actual PostgreSQL connection string
DATABASE_URL = "postgresql://sebastianll:Llanos97831470@localhost:5432/testing"

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


if __name__ == "__main__":
    app.run(debug=True)
