from flask import Flask, g
from config import load_config
from db_connection import connect

def create_app():
    app = Flask(__name__)

    # Cargar config e iniciar conexión al iniciar la app
    @app.before_request
    def before_request():
        if 'db' not in g:
            config = load_config()
            g.db = connect(config)

    # Cerrar conexión al finalizar la petición
    @app.teardown_request
    def teardown_request(exception=None):
        db = g.pop('db', None)
        if db is not None:
            db.close()

    @app.route("/")
    def home():
        return "Aplicación conectada a PostgreSQL."

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
