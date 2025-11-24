import random
import math
from datetime import datetime, timedelta

# Configuración inicial
altura_inicial = 1500       # metros
descenso = 5                # metros por paso
hora_inicial = datetime.strptime("20:00:00", "%H:%M:%S")
id_mision = 13
id_lectura = 18061

# Valores iniciales para cada sensor (puntos de partida)
velocidad_viento_base = 12.0    # m/s
direccion_viento_base = 180.0   # grados
presion_base = 1013.0           # hPa
temperatura_base = 15.0         # °C
humedad_base = 60.0             # %

# Generar todas las lecturas con patrones
valores = []
altura = altura_inicial
tiempo = hora_inicial
paso = 0

while altura >= 0:
    # Calcular variaciones basadas en la altura y tiempo
    # La presión disminuye con la altura de forma más predecible
    presion_actual = presion_base - (altura_inicial - altura) * 0.12 + random.uniform(-2, 2)
    presion_actual = max(950, min(1050, presion_actual))  # Limitar rango

    # La temperatura varía con la altura (gradiente térmico) y oscilaciones
    temp_variacion_altura = (altura_inicial - altura) * 0.0065  # ~6.5°C por 1000m
    temp_oscilacion = math.sin(paso * 0.1) * 3  # Oscilación suave
    temperatura_actual = temperatura_base + temp_variacion_altura + temp_oscilacion + random.uniform(-1.5, 1.5)
    temperatura_actual = max(-10, min(35, temperatura_actual))

    # Velocidad del viento con variación suave y tendencia
    velocidad_tendencia = math.sin(paso * 0.08) * 5
    velocidad_actual = velocidad_viento_base + velocidad_tendencia + random.uniform(-1.5, 1.5)
    velocidad_actual = max(0, min(25, velocidad_actual))

    # Dirección del viento cambia gradualmente (sin saltos bruscos)
    direccion_cambio = math.sin(paso * 0.05) * 20 + random.uniform(-5, 5)
    direccion_viento_base = (direccion_viento_base + direccion_cambio) % 360
    direccion_actual = direccion_viento_base

    # Humedad inversamente relacionada con temperatura
    humedad_base_temp = 70 - (temperatura_actual - 10) * 1.2
    humedad_oscilacion = math.cos(paso * 0.09) * 8
    humedad_actual = humedad_base_temp + humedad_oscilacion + random.uniform(-3, 3)
    humedad_actual = max(0, min(100, humedad_actual))

    # Crear las lecturas para cada sensor
    hora_str = tiempo.strftime("%H:%M:%S")

    # Velocidad del Viento
    valores.append(
        f"({id_lectura}, 1, {id_mision}, 'Velocidad_Viento', {round(velocidad_actual, 2)}, {altura}, '{hora_str}')"
    )
    id_lectura += 1

    # Dirección del Viento
    valores.append(
        f"({id_lectura}, 1, {id_mision}, 'Dirección_Viento', {round(direccion_actual, 2)}, {altura}, '{hora_str}')"
    )
    id_lectura += 1

    # Presión
    valores.append(
        f"({id_lectura}, 2, {id_mision}, 'Presion', {round(presion_actual, 2)}, {altura}, '{hora_str}')"
    )
    id_lectura += 1

    # Temperatura
    valores.append(
        f"({id_lectura}, 2, {id_mision}, 'Temperatura', {round(temperatura_actual, 2)}, {altura}, '{hora_str}')"
    )
    id_lectura += 1

    # Humedad
    valores.append(
        f"({id_lectura}, 2, {id_mision}, 'Humedad', {round(humedad_actual, 2)}, {altura}, '{hora_str}')"
    )
    id_lectura += 1

    # Siguiente segundo y descenso de altura
    tiempo += timedelta(seconds=1)
    altura -= descenso
    paso += 1

# Unir todo en una sola sentencia SQL
query = (
    "INSERT INTO LecturaSensor (IdLecturaSensor, IdSensor, IdMision, Tipo, Valor, Altura, HoraMinSeg)\nVALUES\n\t"
    + ",\n\t".join(valores)
    + ";"
)

# Guardar o mostrar
with open("insert_lecturas_13.sql", "w", encoding="utf-8") as f:
    f.write(query)

print("Consulta SQL generada: insert_lecturas_13.sql")
print(f"Total de registros: {len(valores)}")
