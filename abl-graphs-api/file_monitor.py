import os
import threading
from datetime import datetime, timedelta
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


class LogFileHandler(FileSystemEventHandler):
    def __init__(self, mission_status):
        """
        Initialize the LogFileHandler with a reference to the mission status dictionary

        Args:
            mission_status (dict): Reference to the global mission status dictionary
        """
        self.mission_status = mission_status

    def on_created(self, event):
        """
        Handle file creation events in the monitored directory

        Args:
            event: The file system event
        """
        if not event.is_directory and event.src_path.endswith('.log'):
            filename = os.path.basename(event.src_path)
            print(f"New log file detected: {filename}")

            # Update mission status
            self.mission_status["active"] = True
            self.mission_status["current_mission_file"] = filename
            self.mission_status["start_time"] = datetime.now().isoformat()
            self.mission_status["last_activity"] = datetime.now().isoformat()

            # Extract drone count from filename if possible (e.g., mision1.log -> 1 drone)
            # This is a simple heuristic, you can adjust based on your naming convention
            try:
                if "mision" in filename.lower():
                    self.mission_status["active_drones"] = 1  # Default to 1, can be updated based on file content
                else:
                    self.mission_status["active_drones"] = 1
            except:
                self.mission_status["active_drones"] = 1

    def on_modified(self, event):
        """
        Handle file modification events (when data is written to the log file)

        Args:
            event: The file system event
        """
        if not event.is_directory and event.src_path.endswith('.log'):
            filename = os.path.basename(event.src_path)

            # Update last activity timestamp when file is modified
            if self.mission_status["current_mission_file"] == filename:
                self.mission_status["last_activity"] = datetime.now().isoformat()
                print(f"Data activity detected in: {filename}")


class FileMonitor:
    def __init__(self, mission_status):
        """
        Initialize the FileMonitor

        Args:
            mission_status (dict): Reference to the global mission status dictionary
        """
        self.mission_status = mission_status
        self.observer = None
        self.rawdata_path = None
        self.inactivity_timer = None
        self.inactivity_threshold = 10  # seconds of inactivity before marking mission as inactive

    def start_monitoring(self):
        """
        Start monitoring the rawdata directory for new .log files

        Returns:
            Observer: The file system observer instance
        """
        # Get the rawdata path relative to the project root
        self.rawdata_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'rawdata')

        if not os.path.exists(self.rawdata_path):
            os.makedirs(self.rawdata_path)
            print(f"Created rawdata directory at: {self.rawdata_path}")

        event_handler = LogFileHandler(self.mission_status)
        self.observer = Observer()
        self.observer.schedule(event_handler, self.rawdata_path, recursive=False)
        self.observer.start()
        print(f"Started monitoring directory: {self.rawdata_path}")

        # Start inactivity monitoring
        self._start_inactivity_monitor()

        return self.observer

    def _start_inactivity_monitor(self):
        """
        Start monitoring for inactivity in log file updates
        """
        def check_inactivity():
            while self.observer and self.observer.is_alive():
                if self.mission_status["active"] and self.mission_status["last_activity"]:
                    last_activity = datetime.fromisoformat(self.mission_status["last_activity"])
                    time_since_activity = datetime.now() - last_activity

                    if time_since_activity.total_seconds() > self.inactivity_threshold:
                        print(f"Mission inactive for {self.inactivity_threshold} seconds. Marking as inactive.")
                        self.mission_status["active"] = False
                        self.mission_status["active_drones"] = 0
                        # Keep current_mission_file and start_time for reference

                threading.Event().wait(2)  # Check every 2 seconds

        self.inactivity_timer = threading.Thread(target=check_inactivity, daemon=True)
        self.inactivity_timer.start()

    def stop_monitoring(self):
        """
        Stop the file monitoring
        """
        if self.observer:
            self.observer.stop()
            self.observer.join()
            print("File monitoring stopped")

        # The inactivity timer will stop automatically when observer stops (daemon thread)

    def is_monitoring(self):
        """
        Check if the monitor is currently running

        Returns:
            bool: True if monitoring is active, False otherwise
        """
        return self.observer is not None and self.observer.is_alive()
