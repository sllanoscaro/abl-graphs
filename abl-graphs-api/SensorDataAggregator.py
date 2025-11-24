import json
import time
from datetime import datetime
from typing import Dict, List, Any, Callable, Optional
import logging

logger = logging.getLogger(__name__)

class SensorDataAggregator:
    def __init__(self):
        # Buffers to store incoming sensor data
        self.wind_speed_buffer: List[float] = []
        self.temperature_buffer: List[float] = []
        self.pressure_buffer: List[float] = []
        self.humidity_buffer: List[float] = []
        self.height_buffer: List[float] = []

        # Timing for emission control
        self.last_emit_time = time.time()
        self.emit_interval = 1.0  # 1 segundo

        # Mission state tracking
        self.mission_active = False
        self.mission_status_message = "Waiting for mission..."

        # Keep last known altitude to avoid missing data due to timing
        self.last_known_altitude: Optional[float] = None

        # Callback for storing averaged data
        self.on_data_averaged_callback: Optional[Callable[[Dict[str, Any]], None]] = None

    def add_anemometer_data(self, data: Dict[str, Any]) -> None:
        if 'velocidadViento' in data:
            self.wind_speed_buffer.append(data['velocidadViento'])

    def add_imet_data(self, data: Dict[str, Any]) -> None:
        if 'temperatura' in data:
            self.temperature_buffer.append(data['temperatura'])
        if 'presion' in data:
            self.pressure_buffer.append(data['presion'])
        if 'humedad' in data:
            self.humidity_buffer.append(data['humedad'])

    def add_drone_data(self, data: Dict[str, Any]) -> None:
        # First, check for a MAVSDK‐like position dict containing relative altitude
        pos = data.get('position')
        if isinstance(pos, dict):
            # Prefer the explicit relative_altitude_m field if present
            altitude = pos.get('relative_altitude_m') or pos.get('altitude')
            if altitude is not None:
                try:
                    # Cast to float for consistency
                    self.height_buffer.append(float(altitude))
                except Exception:
                    pass
                return

        # Fall back to a top‑level altitude field
        if 'altitude' in data:
            try:
                self.height_buffer.append(float(data['altitude']))
            except Exception:
                pass
            return

        # If neither is present, check for gps.position as a last resort
        gps = data.get('gps')
        if isinstance(gps, dict) and 'position' in gps:
            try:
                self.height_buffer.append(float(gps['position']))
            except Exception:
                pass
            return

    def should_emit(self) -> bool:
        current_time = time.time()
        return (current_time - self.last_emit_time) >= self.emit_interval

    def get_averaged_data(self) -> Dict[str, float]:
        averaged_data = {}

        # Average wind speed
        if self.wind_speed_buffer:
            averaged_data['velocidad_viento'] = round(
                sum(self.wind_speed_buffer) / len(self.wind_speed_buffer), 2
            )

        # Average temperature
        if self.temperature_buffer:
            averaged_data['temperatura'] = round(
                sum(self.temperature_buffer) / len(self.temperature_buffer), 2
            )

        # Average pression
        if self.pressure_buffer:
            averaged_data['presion'] = round(
                sum(self.pressure_buffer) / len(self.pressure_buffer), 1
            )

        # Average humidity
        if self.humidity_buffer:
            averaged_data['humedad'] = round(
                sum(self.humidity_buffer) / len(self.humidity_buffer), 1
            )

        # Height
        if self.height_buffer:
            # Use most recent value and update last known altitude
            self.last_known_altitude = round(self.height_buffer[-1], 2)
            averaged_data['altura'] = self.last_known_altitude
        elif self.last_known_altitude is not None:
            # No new height data in this interval, use last known altitude
            averaged_data['altura'] = self.last_known_altitude

        # Add timestamp
        if averaged_data:
            averaged_data['timestamp'] = datetime.now().strftime('%H:%M:%S')

        # Clear buffers after computing averages
        self.wind_speed_buffer.clear()
        self.temperature_buffer.clear()
        self.pressure_buffer.clear()
        self.humidity_buffer.clear()
        self.height_buffer.clear()

        # Update last emit time
        self.last_emit_time = time.time()

        return averaged_data


# Global aggregator instance
aggregator = SensorDataAggregator()


def _reason_is_success(reason) -> bool:
    try:
        # paho v2 may pass ReasonCodes which can be cast to int
        code = int(reason)
    except Exception:
        code = getattr(reason, 'value', reason)
        try:
            code = int(code)
        except Exception:
            code = 0
    return code == 0


def on_connect(client, userdata, flags, reasoncode, properties=None):
    # Accept both API styles (some callers might still pass rc)
    if properties is None and isinstance(reasoncode, dict) and 'rc' in reasoncode:
        rc = reasoncode['rc']
        ok = (rc == 0)
    else:
        ok = _reason_is_success(reasoncode)

    if ok:
        client.subscribe("sensors/AnemometroNode/anemometer_data", qos=1)
        client.subscribe("sensors/ImetNode/imet_data", qos=1)
        client.subscribe("sensors/DroneNode/drone_data", qos=1)
        client.subscribe("srd/tx", qos=1)


def on_message(client, userdata, msg):
    topic = msg.topic

    try:
        # Parse JSON payload
        payload_str = msg.payload.decode('utf-8')

        # Handle mission status on srd/tx
        if topic == "srd/tx":
            # Format: "drone/Mission/status: {json}"
            if "drone/Mission/status" in payload_str and ":" in payload_str:
                parts = payload_str.split(":", 1)
                if len(parts) == 2:
                    json_data = parts[1].strip()
                    status_data = json.loads(json_data)
                    message_text = status_data.get('msg', '')

                    # Update status message
                    aggregator.mission_status_message = message_text

                    msg_lower = message_text.lower() if isinstance(message_text, str) else ""

                    # Activate tracking when mission starts or resumes
                    if any(word in msg_lower for word in ["mission has started", "mision iniciada",
                                                          "iniciando misión", "resumiendo", "waypoint"]):
                        aggregator.mission_active = True

                    # Deactivate tracking when mission stops, aborts, or pauses
                    elif any(word in msg_lower for word in ["abortando", "pausando", "stopped", "detenida",
                                                            "detenido", "finished", "finalizada", "completada",
                                                            "terminada", "invalida"]):
                        # Clear data when mission ends
                        if aggregator.mission_active and aggregator.on_data_averaged_callback:
                            # Signal to clear data by calling callback with None
                            aggregator.on_data_averaged_callback(None)
                        aggregator.mission_active = False
                        # Reset last known altitude for next mission
                        aggregator.last_known_altitude = None
            return

        # Parse sensor data JSON
        data = json.loads(payload_str)

        # Handle sensor topics from mqtt_data_simulator.py
        if topic == "sensors/AnemometroNode/anemometer_data":
            aggregator.add_anemometer_data(data)

        elif topic == "sensors/ImetNode/imet_data":
            aggregator.add_imet_data(data)

        elif topic == "sensors/DroneNode/drone_data":
            aggregator.add_drone_data(data)

        # Check if it's time to emit averaged data (every 1 second)
        if aggregator.should_emit() and aggregator.mission_active:
            averaged_data = aggregator.get_averaged_data()

            # Store data via callback if available
            if averaged_data and aggregator.on_data_averaged_callback:
                aggregator.on_data_averaged_callback(averaged_data)

    except json.JSONDecodeError as e:
        pass
    except Exception as e:
        logger.error("Error processing MQTT message on topic %s: %s", topic, str(e))


def on_disconnect(client, userdata, reasoncode, properties=None, *args):
    try:
        code = int(reasoncode)
    except Exception:
        code = getattr(reasoncode, 'value', reasoncode)
        try:
            code = int(code)
        except Exception:
            code = -1
