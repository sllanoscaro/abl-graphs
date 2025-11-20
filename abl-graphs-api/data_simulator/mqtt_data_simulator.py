"""
MQTT Data Simulator for Real-Time Plotting
==========================================

This script simulates sensor data for testing the Flask backend and React plotting.
It publishes data only when a mission is active, matching the real sensor timing:
- AnemometroNode: 4 chunks per second (250ms intervals)
- ImetNode: 2 chunks per second (500ms intervals)
- DroneNode: 1 chunk per second (1000ms intervals)

DATA SOURCE MAPPING FOR PLOTTING:
=================================
- Velocidad del viento: AnemometroNode (4 chunks/sec) -> Average over 1 second
- Temperatura: ImetNode ONLY (2 chunks/sec) -> Average over 1 second
- Presión atmosférica: ImetNode ONLY (2 chunks/sec) -> Average over 1 second
- Humedad: ImetNode ONLY (2 chunks/sec) -> Average over 1 second
- Altura: DroneNode (1 chunk/sec) -> Use directly

Note: ImetNode is more accurate for temperatura, presión, and humedad.
      AnemometroNode data for these variables should be ignored.

The backend should collect all chunks received within 1 second and compute averages.

Usage:
    python mqtt_data_simulator.py

Mission Control:
    - Publishes to: srd/tx (status updates)
    - Listens to: srd/rx (mission commands)

    Commands:
    - Start mission: "start_mission" or JSON with mission parameters
    - Pause mission: "pause"
    - Resume mission: "resume"
    - Abort mission: "abort"
    - Stop mission: "stop"
    - Check status: "status"

    Status messages published (recognized by SensorDataAggregator):
    - "Mision iniciada" - Activates tracking
    - "Pausando misión" - Deactivates tracking
    - "Resumiendo misión" - Activates tracking
    - "Abortando misión" - Deactivates tracking
    - "Mission stopped" - Deactivates tracking
"""

import asyncio
import json
import time
import math
import random
import sys
from datetime import datetime
from typing import Dict, Any, Optional
import aiomqtt
from dataclasses import dataclass, field


# Fix for Windows: aiomqtt requires SelectorEventLoop
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


@dataclass
class SimulatorConfig:
    """Configuration for the MQTT data simulator"""
    mqtt_broker: str = "localhost"
    mqtt_port: int = 1883
    mqtt_username: Optional[str] = None
    mqtt_password: Optional[str] = None
    topic_prefix: str = "sensors"

    # Publishing frequencies
    anemometer_hz: float = 4.0  # 4 chunks per second
    imet_hz: float = 2.0        # 2 chunks per second
    drone_hz: float = 1.0       # 1 chunk per second

    # Simulation parameters for realistic variation
    base_altitude: float = 100.0       # meters
    altitude_variation: float = 0.5     # ±0.5m per second
    base_wind_speed: float = 5.0       # m/s
    wind_speed_variation: float = 1.0  # ±1 m/s
    base_temperature: float = 22.0     # °C
    temp_variation: float = 0.3        # ±0.3°C
    base_humidity: float = 65.0        # %
    humidity_variation: float = 2.0    # ±2%
    base_pressure: float = 101325.0    # Pa
    pressure_variation: float = 50.0   # ±50 Pa


class MissionState:
    """Tracks the current mission state"""
    def __init__(self):
        self.active: bool = False
        self.start_time: Optional[float] = None
        self.altitude_target: float = 100.0
        self.speed: float = 5.0
        self.status_message: str = "Waiting for mission command..."

    def start_mission(self, params: Dict[str, Any] = None):
        """Start the mission with optional parameters"""
        self.active = True
        self.start_time = time.time()
        if params:
            self.altitude_target = params.get('altura', 100.0)
            self.speed = params.get('velocidad', 5.0)
        # Use message that SensorDataAggregator recognizes to activate tracking
        self.status_message = f"Mision iniciada - Target altitude: {self.altitude_target}m"
        print(f"✓ Mission started: {self.status_message}")

    def stop_mission(self):
        """Stop the mission"""
        self.active = False
        self.start_time = None
        # Use message that SensorDataAggregator recognizes to deactivate tracking
        self.status_message = "Mission stopped"
        print(f"✗ Mission stopped")

    def pause_mission(self):
        """Pause the mission"""
        self.active = False
        # Use message that SensorDataAggregator recognizes to deactivate tracking
        self.status_message = "Pausando misión"
        print(f"⏸ Mission paused")

    def resume_mission(self):
        """Resume the mission"""
        self.active = True
        # Use message that SensorDataAggregator recognizes to activate tracking
        self.status_message = "Resumiendo misión"
        print(f"▶ Mission resumed")

    def abort_mission(self):
        """Abort the mission"""
        self.active = False
        self.start_time = None
        # Use message that SensorDataAggregator recognizes to deactivate tracking
        self.status_message = "Abortando misión"
        print(f"🛑 Mission aborted")

    def get_elapsed_time(self) -> float:
        """Get elapsed time since mission start in seconds"""
        if not self.active or self.start_time is None:
            return 0.0
        return time.time() - self.start_time


class SensorDataGenerator:
    """Generates realistic sensor data with temporal variation"""

    def __init__(self, config: SimulatorConfig):
        self.config = config
        self._time_offset = 0.0

    def _add_noise(self, base_value: float, variation: float) -> float:
        """Add random noise to a base value"""
        return base_value + random.uniform(-variation, variation)

    def _smooth_variation(self, base_value: float, variation: float, time_elapsed: float, period: float = 10.0) -> float:
        """Create smooth sinusoidal variation over time"""
        sine_component = math.sin(2 * math.pi * time_elapsed / period) * variation
        noise = random.uniform(-variation * 0.1, variation * 0.1)
        return base_value + sine_component + noise

    def generate_anemometer_data(self, mission_time: float) -> Dict[str, Any]:
        """Generate anemometer sensor data"""
        # Wind speed with smooth variation
        wind_speed = self._smooth_variation(
            self.config.base_wind_speed,
            self.config.wind_speed_variation,
            mission_time,
            period=8.0
        )

        # Wind direction (rotating slowly)
        wind_direction = (mission_time * 10) % 360  # Full rotation every 36 seconds

        # Calculate wind vector components
        wind_rad = math.radians(wind_direction)
        vector_u = wind_speed * math.cos(wind_rad)
        vector_v = wind_speed * math.sin(wind_rad)
        vector_w = self._add_noise(0.0, 0.2)  # Small vertical component

        # Environmental data
        temperatura = self._smooth_variation(
            self.config.base_temperature,
            self.config.temp_variation,
            mission_time,
            period=15.0
        )

        humedad = self._smooth_variation(
            self.config.base_humidity,
            self.config.humidity_variation,
            mission_time,
            period=20.0
        )

        presion = self._smooth_variation(
            self.config.base_pressure,
            self.config.pressure_variation,
            mission_time,
            period=25.0
        )

        # Drone orientation (slight oscillation)
        pitch = self._add_noise(0.0, 3.0)
        roll = self._add_noise(0.0, 3.0)

        return {
            "velocidadViento": round(max(0, wind_speed), 2),
            "direccionViento": round(wind_direction, 1),
            "vectorU": round(vector_u, 2),
            "vectorV": round(vector_v, 2),
            "vectorW": round(vector_w, 2),
            "temperatura": round(temperatura, 2),
            "humedad": round(max(0, min(100, humedad)), 1),
            "presion": round(presion, 1),
            "pitch": round(pitch, 2),
            "roll": round(roll, 2),
            "magnetic": round(self._add_noise(45.0, 2.0), 1)
        }

    def generate_imet_data(self, mission_time: float, current_altitude: float) -> Dict[str, Any]:
        """Generate IMET sensor data"""
        temperatura = self._smooth_variation(
            self.config.base_temperature,
            self.config.temp_variation,
            mission_time,
            period=15.0
        )

        humedad = self._smooth_variation(
            self.config.base_humidity,
            self.config.humidity_variation,
            mission_time,
            period=20.0
        )

        # Pressure decreases with altitude (approximately 12 Pa per meter)
        altitude_pressure_drop = current_altitude * 12
        presion = self._smooth_variation(
            self.config.base_pressure - altitude_pressure_drop,
            self.config.pressure_variation,
            mission_time,
            period=25.0
        )

        # Temperature humidity relationship
        temp_hum_relativa = temperatura + self._add_noise(0, 0.5)

        # Simulated GPS coordinates (slight drift)
        longitude = -58.4560 + self._add_noise(0, 0.00001)
        latitude = -34.1230 + self._add_noise(0, 0.00001)

        return {
            "presion": round(presion, 1),
            "temperatura": round(temperatura, 2),
            "humedad": round(max(0, min(100, humedad)), 1),
            "tempHumRelativa": round(temp_hum_relativa, 2),
            "longitude": round(longitude, 6),
            "latitude": round(latitude, 6),
            "altitude": round(current_altitude, 2),
            "gps": 5  # GPS quality (5 = RTK fixed)
        }

    def generate_drone_data(self, mission_time: float) -> Dict[str, Any]:
        """Generate drone telemetry data"""
        # Altitude increases gradually during mission
        relative_altitude = self._smooth_variation(
            self.config.base_altitude + (mission_time * 0.5),  # Slow climb
            self.config.altitude_variation,
            mission_time,
            period=5.0
        )

        # Battery depletes slowly
        battery_percent = max(20.0, 100.0 - (mission_time * 0.05))  # 0.05% per second

        # GPS coordinates with slight drift
        longitude = -58.4560 + self._add_noise(0, 0.00001)
        latitude = -34.1230 + self._add_noise(0, 0.00001)

        return {
            "battery": {
                "remaining_percent": round(battery_percent, 1),
                "voltage_v": round(16.8 + (battery_percent - 100) * 0.02, 2),
                "current_a": round(self._add_noise(5.0, 1.0), 2)
            },
            "gps": {
                "num_satellites": random.randint(12, 18),
                "fix_type": "RTK_FIXED"
            },
            "in_air": True,
            "position": {
                "latitude_deg": round(latitude, 6),
                "longitude_deg": round(longitude, 6),
                "absolute_altitude_m": round(150.0 + relative_altitude, 2),
                "relative_altitude_m": round(relative_altitude, 2)
            },
            "imu": {
                "accel_forward": round(self._add_noise(0.0, 0.1), 3),
                "accel_right": round(self._add_noise(0.0, 0.1), 3),
                "accel_down": round(9.81 + self._add_noise(0.0, 0.05), 3),
                "gyro_forward": round(self._add_noise(0.0, 0.01), 4),
                "gyro_right": round(self._add_noise(0.0, 0.01), 4),
                "gyro_down": round(self._add_noise(0.0, 0.01), 4),
                "mag_fwd": round(self._add_noise(0.2, 0.05), 3),
                "mag_right": round(self._add_noise(0.1, 0.05), 3),
                "mag_down": round(self._add_noise(0.4, 0.05), 3),
                "temperature": round(self._add_noise(35.0, 1.0), 1),
                "timestamp_us": int(time.time() * 1000000)
            }
        }


class MQTTDataSimulator:
    """Main simulator class that publishes data to MQTT"""

    def __init__(self, config: SimulatorConfig):
        self.config = config
        self.mission = MissionState()
        self.data_gen = SensorDataGenerator(config)
        self.client: Optional[aiomqtt.Client] = None
        self.running = False

        # Track current altitude for inter-sensor consistency
        self.current_altitude = config.base_altitude

    async def connect(self) -> None:
        """Connect to MQTT broker"""
        print(f"Connecting to MQTT broker at {self.config.mqtt_broker}:{self.config.mqtt_port}...")

        self.client = aiomqtt.Client(
            hostname=self.config.mqtt_broker,
            port=self.config.mqtt_port,
            username=self.config.mqtt_username,
            password=self.config.mqtt_password,
            identifier="mqtt-data-simulator",
            keepalive=60
        )

        await self.client.__aenter__()
        print("✓ Connected to MQTT broker")

    async def disconnect(self) -> None:
        """Disconnect from MQTT broker"""
        if self.client:
            await self.client.__aexit__(None, None, None)
            print("✓ Disconnected from MQTT broker")

    async def publish(self, topic: str, payload: Dict[str, Any], use_prefix: bool = True) -> None:
        """Publish data to MQTT topic"""
        if not self.client:
            return

        full_topic = f"{self.config.topic_prefix}/{topic}" if use_prefix else topic
        payload_json = json.dumps(payload)

        try:
            await self.client.publish(
                topic=full_topic,
                payload=payload_json,
                qos=1,
                retain=False
            )
            # Uncomment for verbose logging:
            # print(f"Published to {full_topic}: {payload_json[:80]}...")
        except Exception as e:
            print(f"Error publishing to {full_topic}: {e}")

    async def publish_status(self, status: str) -> None:
        """Publish mission status"""
        status_message = f"drone/Mission/status: {json.dumps({'msg': status})}"
        await self.client.publish(
            topic="srd/tx",
            payload=status_message,
            qos=1,
            retain=False
        )

    async def listen_for_commands(self) -> None:
        """Listen for mission commands on srd/rx"""
        if not self.client:
            return

        print("Listening for mission commands on topic: srd/rx")

        try:
            await self.client.subscribe("srd/rx", qos=1)

            async for message in self.client.messages:
                try:
                    payload = message.payload.decode()
                    print(f"\n[Command received]: {payload}")

                    # Parse mission command - start mission
                    if '"drone/Mission/setMission"' in payload or 'start' in payload.lower():
                        # Extract JSON from command
                        try:
                            # Parse the command format
                            if payload.startswith('"drone/Mission/setMission"'):
                                json_start = payload.find('{')
                                if json_start != -1:
                                    params = json.loads(payload[json_start:])
                                    self.mission.start_mission(params)
                                    await self.publish_status(self.mission.status_message)
                            else:
                                self.mission.start_mission()
                                await self.publish_status(self.mission.status_message)
                        except json.JSONDecodeError:
                            self.mission.start_mission()
                            await self.publish_status(self.mission.status_message)

                    # Pause mission
                    elif 'pause' in payload.lower():
                        self.mission.pause_mission()
                        await self.publish_status(self.mission.status_message)

                    # Resume mission
                    elif 'resume' in payload.lower():
                        self.mission.resume_mission()
                        await self.publish_status(self.mission.status_message)

                    # Abort mission
                    elif 'abort' in payload.lower():
                        self.mission.abort_mission()
                        await self.publish_status(self.mission.status_message)

                    # Status check
                    elif '"drone/Mission/ack"' in payload or 'status' in payload.lower():
                        await self.publish_status(self.mission.status_message)

                    # Stop mission
                    elif 'stop' in payload.lower():
                        self.mission.stop_mission()
                        await self.publish_status(self.mission.status_message)

                    # Simplified JSON format (just the parameters)
                    else:
                        try:
                            # Try to parse as JSON mission parameters
                            params = json.loads(payload)
                            if isinstance(params, dict):
                                # Check if it looks like mission parameters
                                if 'altura' in params or 'velocidad' in params:
                                    print(f"[Detected simplified mission format]")
                                    self.mission.start_mission(params)
                                    await self.publish_status(self.mission.status_message)
                        except json.JSONDecodeError:
                            # Not JSON, ignore
                            pass

                except Exception as e:
                    print(f"Error processing command: {e}")

        except asyncio.CancelledError:
            print("Command listener stopped")

    async def publish_anemometer_data(self) -> None:
        """Publish anemometer data at 4 Hz (every 250ms)"""
        interval = 1.0 / self.config.anemometer_hz
        chunk_number = 0

        while self.running:
            if self.mission.active:
                mission_time = self.mission.get_elapsed_time()
                data = self.data_gen.generate_anemometer_data(mission_time)

                await self.publish("AnemometroNode/anemometer_data", data)
                chunk_number += 1

                if chunk_number % 4 == 0:  # Every second
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Anemometer: "
                          f"Wind={data['velocidadViento']}m/s, "
                          f"Temp={data['temperatura']}°C, "
                          f"Humidity={data['humedad']}%, "
                          f"Pressure={data['presion']}Pa")

            await asyncio.sleep(interval)

    async def publish_imet_data(self) -> None:
        """Publish IMET data at 2 Hz (every 500ms)"""
        interval = 1.0 / self.config.imet_hz
        chunk_number = 0

        while self.running:
            if self.mission.active:
                mission_time = self.mission.get_elapsed_time()
                data = self.data_gen.generate_imet_data(mission_time, self.current_altitude)

                await self.publish("ImetNode/imet_data", data)
                chunk_number += 1

                if chunk_number % 2 == 0:  # Every second
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] IMET: "
                          f"Alt={data['altitude']}m, "
                          f"Temp={data['temperatura']}°C, "
                          f"Humidity={data['humedad']}%, "
                          f"Pressure={data['presion']}Pa")

            await asyncio.sleep(interval)

    async def publish_drone_data(self) -> None:
        """Publish drone data at 1 Hz (every 1000ms)"""
        interval = 1.0 / self.config.drone_hz

        while self.running:
            if self.mission.active:
                mission_time = self.mission.get_elapsed_time()
                data = self.data_gen.generate_drone_data(mission_time)

                # Update current altitude for consistency across sensors
                self.current_altitude = data["position"]["relative_altitude_m"]

                await self.publish("DroneNode/drone_data", data)

                print(f"[{datetime.now().strftime('%H:%M:%S')}] Drone: "
                      f"Alt={self.current_altitude}m, "
                      f"Battery={data['battery']['remaining_percent']}%, "
                      f"GPS={data['gps']['num_satellites']} sats, "
                      f"Status={'IN AIR' if data['in_air'] else 'LANDED'}")

            await asyncio.sleep(interval)

    async def run(self) -> None:
        """Main run loop"""
        try:
            await self.connect()
            self.running = True

            # Initial status
            await self.publish_status(self.mission.status_message)

            print("\n" + "="*70)
            print("MQTT Data Simulator Started")
            print("="*70)
            print(f"Publishing frequencies:")
            print(f"  - Anemometer: {self.config.anemometer_hz} Hz (every {1000/self.config.anemometer_hz:.0f}ms)")
            print(f"  - IMET: {self.config.imet_hz} Hz (every {1000/self.config.imet_hz:.0f}ms)")
            print(f"  - Drone: {self.config.drone_hz} Hz (every {1000/self.config.drone_hz:.0f}ms)")
            print(f"\nVariables being simulated for plotting:")
            print(f"  - Velocidad del viento (Wind speed)")
            print(f"  - Temperatura (Temperature)")
            print(f"  - Presión atmosférica (Atmospheric pressure)")
            print(f"  - Humedad (Humidity)")
            print(f"  - Altura (Altitude)")
            print("\n" + "="*70)
            print("Waiting for mission to start...")
            print("Send a mission command to 'srd/rx' or press Ctrl+C to start manually")
            print("="*70 + "\n")

            # Start all publishing tasks
            tasks = [
                asyncio.create_task(self.listen_for_commands()),
                asyncio.create_task(self.publish_anemometer_data()),
                asyncio.create_task(self.publish_imet_data()),
                asyncio.create_task(self.publish_drone_data()),
            ]

            # Wait for all tasks
            await asyncio.gather(*tasks)

        except KeyboardInterrupt:
            print("\n\nKeyboard interrupt received...")
            if not self.mission.active:
                print("Starting mission manually for demonstration...")
                self.mission.start_mission({'altura': 100, 'velocidad': 5})
                await self.publish_status(self.mission.status_message)

                # Run for 30 seconds then stop
                print("Mission will run for 30 seconds...\n")
                await asyncio.sleep(30)

        except Exception as e:
            print(f"Error in main loop: {e}")
            import traceback
            traceback.print_exc()

        finally:
            print("\n\nStopping simulator...")
            self.running = False

            if self.mission.active:
                self.mission.stop_mission()
                await self.publish_status(self.mission.status_message)

            await asyncio.sleep(0.5)  # Allow final messages to be sent
            await self.disconnect()
            print("Simulator stopped successfully")


async def main():
    """Entry point"""
    # Load configuration from environment or use defaults
    config = SimulatorConfig(
        mqtt_broker="localhost",
        mqtt_port=1883,
        topic_prefix="sensors",
        # 4 chunks per second for anemometer
        anemometer_hz=4.0,
        # 2 chunks per second for IMET
        imet_hz=2.0,
        # 1 chunk per second for drone
        drone_hz=1.0,
        # Realistic simulation parameters
        base_altitude=100.0,
        base_wind_speed=5.0,
        base_temperature=22.0,
        base_humidity=65.0,
        base_pressure=101325.0,
    )

    simulator = MQTTDataSimulator(config)
    await simulator.run()


if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║                  MQTT Data Simulator for Real-Time Plotting          ║
║                                                                       ║
║  This simulator publishes sensor data matching real hardware timing: ║
║    • Anemometer: 4 chunks/second (250ms intervals)                   ║
║    • IMET: 2 chunks/second (500ms intervals)                         ║
║    • Drone: 1 chunk/second (1000ms intervals)                        ║
║                                                                       ║
║  Your Flask backend should:                                          ║
║    1. Collect all chunks received within 1 second                    ║
║    2. Compute averages using interpolation                           ║
║    3. Send averaged data to React for plotting                       ║
║                                                                       ║
║  Press Ctrl+C once to start mission manually (if no command sent)    ║
║  Press Ctrl+C twice to stop the simulator                            ║
╚══════════════════════════════════════════════════════════════════════╝
    """)

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nShutdown complete.")
