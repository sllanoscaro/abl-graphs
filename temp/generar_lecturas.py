import random
from datetime import datetime, timedelta

# Configuración inicial
altura_inicial = 1500       # metros
descenso = 5                # metros por paso
hora_inicial = datetime.strptime("12:00:00", "%H:%M:%S")
id_mision = 1
id_lectura = 1

# Definición de los sensores y sus rangos de valores
sensores = [
    ("Velocidad_Viento", 1, (0, 25)),      # m/s
    ("Dirección_Viento", 1, (0, 360)),     # grados
    ("Presion", 2, (950, 1050)),           # hPa
    ("Temperatura", 2, (-10, 35)),         # °C
    ("Humedad", 2, (0, 100)),              # %
]

# Generar todas las lecturas
valores = []
altura = altura_inicial
tiempo = hora_inicial

while altura >= 0:
    for tipo, id_sensor, (vmin, vmax) in sensores:
        valor = round(random.uniform(vmin, vmax), 2)
        hora_str = tiempo.strftime("%H:%M:%S")
        valores.append(
            f"({id_lectura}, {id_sensor}, {id_mision}, '{tipo}', {valor}, {altura}, '{hora_str}')"
        )
        id_lectura += 1
    # siguiente segundo y descenso de altura
    tiempo += timedelta(seconds=1)
    altura -= descenso

# Unir todo en una sola sentencia SQL
query = (
    "INSERT INTO LecturaSensor (IdLecturaSensor, IdSensor, IdMision, Tipo, Valor, Altura, HoraMinSeg)\nVALUES\n\t"
    + ",\n\t".join(valores)
    + ";"
)

# Guardar o mostrar
with open("insert_lecturas.sql", "w", encoding="utf-8") as f:
    f.write(query)

print("✅ Consulta SQL generada: insert_lecturas.sql")
print(f"Total de registros: {len(valores)}")
