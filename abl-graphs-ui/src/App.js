import React, { useState, useEffect } from 'react';
import Header from './components/Header/Header';
import NavigationTabs from './components/NavigationTabs/NavigationTabs';
import ReportsView from "./components/ReportsView/ReportsView";
import AnalyticsView from "./components/AnalyticsView/AnalyticsView";
import MissionsListView from "./components/MissionsListView/MissionsListView";
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState("analytics");
  const [isConnected, setIsConnected] = useState(false);
  const [missionInProgress, setMissionInProgress] = useState(false);

  // Check mission status every 2 seconds
  useEffect(() => {
    const checkMissionStatus = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/mission/status');
        if (response.ok) {
          const data = await response.json();
          setMissionInProgress(data.active === true);
        }
      } catch (error) {
        // In case of error, assume no mission is in progress
        setMissionInProgress(false);
      }
    };

    checkMissionStatus();
    const interval = setInterval(checkMissionStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <Header
        onConnectionChange={(ok) => setIsConnected(!!ok)}
        isConnected={isConnected}
      /> 

      <NavigationTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        reportsDisabled={!isConnected}
        missionsDisabled={!isConnected}
        missionInProgress={missionInProgress}
      />

      <div className="content">
        <main className="page-content">
          {activeTab === "analytics" && (
            <AnalyticsView />
          )}

          {activeTab === "missions" && (
            <MissionsListView isConnected={isConnected} />
          )}

          {activeTab === "reports" && (
            <ReportsView
              isConnected={isConnected}
              endpoint="http://localhost:5000/api/missions"
            />
          )}
        </main>
      </div>
    </div>
  );
};