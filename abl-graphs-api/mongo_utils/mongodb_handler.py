from pymongo import MongoClient, errors
from datetime import datetime
from typing import Dict, Any, Optional
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class MongoDBHandler:
    def __init__(self):
        self.mongo_url = os.getenv('MONGODB_URL', 'mongodb://localhost:27017/')
        self.db_name = os.getenv('MONGODB_DATABASE')

        self.client: Optional[MongoClient] = None
        self.db = None
        self.connected = False

        # Current mission tracking
        self.current_mission_collection = None
        self.current_mission_start_time = None
        self.current_mission_metadata = {}

        # Try to connect on initialization
        self.connect()

    def connect(self) -> bool:
        try:
            self.client = MongoClient(
                self.mongo_url,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000
            )

            # Test the connection
            self.client.admin.command('ping')

            # Get database
            self.db = self.client[self.db_name]

            self.connected = True
            logger.info("Connected to MongoDB at %s", self.mongo_url)
            return True

        except errors.ServerSelectionTimeoutError as e:
            self.connected = False
            logger.error("MongoDB connection timeout: %s", str(e))
            return False
        except errors.ConnectionFailure as e:
            self.connected = False
            logger.error("MongoDB connection failure: %s", str(e))
            return False

    def start_mission(self) -> str:
        if not self.connected:
            if not self.connect():
                logger.error("Cannot start mission: MongoDB not connected")
                return None

        try:
            # Generate collection name based on timestamp
            timestamp = datetime.now()
            collection_name = f"mission_{timestamp.strftime('%Y%m%d_%H%M%S')}"

            # Create collection
            self.current_mission_collection = self.db[collection_name]
            self.current_mission_start_time = timestamp

            # Store metadata document
            self.current_mission_metadata = {
                'mission_name': collection_name,
                'start_time': timestamp,
                'status': 'active',
                'total_readings': 0
            }

            # Insert metadata as first document
            self.current_mission_collection.insert_one({
                '_metadata': True,
                **self.current_mission_metadata
            })

            logger.info("Started new mission: %s", collection_name)
            return collection_name

        except errors.PyMongoError as e:
            logger.error("Error starting mission: %s", str(e))
            self.connected = False
            return None

    def end_mission(self) -> bool:
        if self.current_mission_collection is None:
            logger.warning("No active mission to end")
            return False

        try:
            # Update metadata document
            end_time = datetime.now()
            self.current_mission_collection.update_one(
                {'_metadata': True},
                {
                    '$set': {
                        'end_time': end_time,
                        'status': 'completed',
                        'duration_seconds': (end_time - self.current_mission_start_time).total_seconds()
                    }
                }
            )

            logger.info("Ended mission: %s (total readings: %d)",
                       self.current_mission_metadata.get('mission_name'),
                       self.current_mission_metadata.get('total_readings', 0))

            # Clear current mission tracking
            self.current_mission_collection = None
            self.current_mission_start_time = None
            self.current_mission_metadata = {}

            return True

        except errors.PyMongoError as e:
            logger.error("Error ending mission: %s", str(e))
            return False

    def insert_sensor_data(self, averaged_data: Dict[str, Any]) -> bool:
        if not self.connected:
            if not self.connect():
                logger.error("Cannot insert data: MongoDB not connected")
                return False

        # Start a new mission if none is active
        if self.current_mission_collection is None:
            self.start_mission()

        if self.current_mission_collection is None:
            logger.error("Failed to start mission for data insertion")
            return False

        try:
            # Prepare document with metadata
            document = {
                'timestamp': averaged_data.get('timestamp'),
                'recorded_at': datetime.now(),
                'sensors': {
                    'velocidad_viento': averaged_data.get('velocidad_viento'),
                    'temperatura': averaged_data.get('temperatura'),
                    'presion': averaged_data.get('presion'),
                    'humedad': averaged_data.get('humedad'),
                    'altura': averaged_data.get('altura')
                }
            }

            # Remove None values from sensors
            document['sensors'] = {k: v for k, v in document['sensors'].items() if v is not None}

            # Insert document
            result = self.current_mission_collection.insert_one(document)

            if result.inserted_id:
                # Update reading count in metadata
                self.current_mission_metadata['total_readings'] += 1
                return True
            else:
                logger.error("Failed to insert sensor data")
                return False

        except errors.PyMongoError as e:
            logger.error("Error inserting sensor data: %s", str(e))
            self.connected = False
            return False

    def close(self):
        if self.client:
            self.client.close()
            self.connected = False


# Global MongoDB handler instance
mongo_handler = MongoDBHandler()


# Callback function to be used with SensorDataAggregator
def store_to_mongodb(averaged_data: Optional[Dict[str, Any]]) -> None:
    if averaged_data is None:
        # Signal to end mission
        if mongo_handler.current_mission_collection is not None:
            mongo_handler.end_mission()
    else:
        # Store the averaged data (starts mission if needed)
        mongo_handler.insert_sensor_data(averaged_data)
