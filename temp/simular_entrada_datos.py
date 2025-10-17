import time
import json
import os

input_file = r"/home/sebastianll/repositorios/abl-graphs/temp/data_cleaned.log"
output_file = r"/home/sebastianll/repositorios/abl-graphs/rawdata/mision1.log"

def simulate_data_insertion(input_file, output_file):
    with open(input_file, "r", encoding="utf-8") as infile, \
            open(output_file, "w", encoding="utf-8", buffering=1) as outfile:  # buffering=1 -> intento de line-buffering

        sensor_data = []
        for line in infile:
            if line.startswith("sensors/DroneNode/drone_data"):
                # 1) volcar el bloque previo
                if sensor_data:
                    for data in sensor_data:
                        # asegúrate de que cada línea termina en \n
                        if not data.endswith("\n"):
                            data = data + "\n"
                        outfile.write(data)
                    outfile.flush()
                    try:
                        os.fsync(outfile.fileno())  # fuerza a disco (opcional, pero útil)
                    except OSError:
                        pass
                    sensor_data = []
                    time.sleep(1)  # pausa visible para tail -f

                # 2) escribir la línea de corte (drone_data)
                if not line.endswith("\n"):
                    line = line + "\n"
                outfile.write(line)
                outfile.flush()
                try:
                    os.fsync(outfile.fileno())
                except OSError:
                    pass
                # si quieres otra pausa después del drone_data, puedes añadir otro sleep aquí
            else:
                sensor_data.append(line)

        # Al final, si quedaron datos sin un último corte, escríbelos
        if sensor_data:
            for data in sensor_data:
                if not data.endswith("\n"):
                    data = data + "\n"
                outfile.write(data)
            outfile.flush()
            try:
                os.fsync(outfile.fileno())
            except OSError:
                pass

    print(f"Los datos fueron simulados y guardados en {output_file}.")

if __name__ == "__main__":
    simulate_data_insertion(input_file, output_file)

