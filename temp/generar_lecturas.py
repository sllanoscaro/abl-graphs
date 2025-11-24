import random
import math
from datetime import datetime, timedelta

# Configuración inicial
altura_inicial = 1500       # metros
descenso = 5                # metros por paso
hora_inicial = datetime.strptime("12:00:00", "%H:%M:%S")
id_mision = 5
id_lectura = 6021

# Definición de los sensores y sus rangos de valores
sensores = [
    ("Velocidad_Viento", 1, (5, 30)),      # m/s - rango inicial y pico
    ("Dirección_Viento", 1, (0, 360)),     # grados
    ("Presion", 2, (960, 1040)),           # hPa
    ("Temperatura", 2, (0, 30)),           # °C
    ("Humedad", 2, (30, 90)),              # %
]

# Calcular total de iteraciones
total_iteraciones = (altura_inicial // descenso) + 1
mitad = total_iteraciones // 2

# Función para calcular el progreso (0.0 a 1.0 y de vuelta a 0.0)
def calcular_progreso(iteracion, total):
    if iteracion <= total // 2:
        # Primera mitad: crece de 0 a 1
        return iteracion / (total // 2)
    else:
        # Segunda mitad: decrece de 1 a 0
        return 1 - ((iteracion - total // 2) / (total - total // 2))

# Generar todas las lecturas
valores = []
altura = altura_inicial
tiempo = hora_inicial
iteracion = 0

while altura >= 0:
    progreso = calcular_progreso(iteracion, total_iteraciones)

    for tipo, id_sensor, (vmin, vmax) in sensores:
        if tipo == "Dirección_Viento":
            # La dirección del viento varía de forma cíclica
            valor = round((vmin + (vmax - vmin) * progreso) + random.uniform(-10, 10), 2)
            valor = valor % 360  # Mantener entre 0-360
        else:
            # Otros sensores siguen el patrón de crecimiento/decrecimiento
            rango = vmax - vmin
            valor_base = vmin + (rango * progreso)
            # Agregar pequeña variación aleatoria (±5% del rango)
            variacion = random.uniform(-rango * 0.05, rango * 0.05)
            valor = round(valor_base + variacion, 2)
            # Asegurar que esté dentro del rango
            valor = max(vmin, min(vmax, valor))

        hora_str = tiempo.strftime("%H:%M:%S")
        valores.append(
            f"({id_lectura}, {id_sensor}, {id_mision}, '{tipo}', {valor}, {altura}, '{hora_str}')"
        )
        id_lectura += 1

    # siguiente segundo y descenso de altura
    tiempo += timedelta(seconds=1)
    altura -= descenso
    iteracion += 1

# Unir todo en una sola sentencia SQL
query = (
    "INSERT INTO LecturaSensor (IdLecturaSensor, IdSensor, IdMision, Tipo, Valor, Altura, HoraMinSeg)\nVALUES\n\t"
    + ",\n\t".join(valores)
    + ";"
)

# Guardar o mostrar
with open("insert_lecturas_5.sql", "w", encoding="utf-8") as f:
    f.write(query)

print("✅ Consulta SQL generada: insert_lecturas_5.sql")
print(f"Total de registros: {len(valores)}")
