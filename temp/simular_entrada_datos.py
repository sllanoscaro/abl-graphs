import time
import json

# Ruta del archivo de entrada (data.log) y del archivo de salida (nuevo_data.log)
input_file = r"/home/sebastianll/repositorios/abl-graphs/temp/data.log"
output_file = r"/home/sebastianll/repositorios/abl-graphs/rawdata/mision1.log"

def simulate_data_insertion(input_file, output_file):
    # Abrimos el archivo de entrada para leer
    with open(input_file, "r") as infile:
        # Abrimos el archivo de salida para escribir
        with open(output_file, "w") as outfile:
            lines = infile.readlines()  # Leemos todas las líneas del archivo
            sensor_data = []  # Lista para almacenar los datos que vamos a escribir

            for line in lines:
                # Si la línea comienza con "sensors/DroneNode/drone_data", indicamos un corte
                if line.startswith("sensors/DroneNode/drone_data"):
                    # Escribimos los datos en el archivo de salida
                    for data in sensor_data:
                        outfile.write(data)
                    # Limpiamos la lista para los próximos datos
                    sensor_data = []
                    time.sleep(1)  # Simulamos un segundo de espera entre cada bloque de datos
                    outfile.write(line)  # Escribimos el bloque de drone data
                else:
                    sensor_data.append(line)  # Almacenamos temporalmente los datos hasta el corte

    print(f"Los datos fueron simulados y guardados en {output_file}.")

if __name__ == "__main__":
    simulate_data_insertion(input_file, output_file)
