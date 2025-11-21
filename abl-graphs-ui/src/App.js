import React, { useState, useEffect } from 'react';
import Header from './components/Header/Header';
import NavigationTabs from './components/NavigationTabs/NavigationTabs';
import ReportsView from "./components/ReportsView/ReportsView";
import AnalyticsView from "./components/AnalyticsView/AnalyticsView";
import MissionsListView from "./components/MissionsListView/MissionsListView";
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState("analytics"); // Ventana de navegación activa
  const [isConnected, setIsConnected] = useState(false); // Botón de conexión DB
  const [missionInProgress, setMissionInProgress] = useState(false); // Estado de misión activa

  // Verificar el estado de la misión cada 2 segundos
  useEffect(() => {
    const checkMissionStatus = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/mission/status');
        if (response.ok) {
          const data = await response.json();
          setMissionInProgress(data.active === true);
        }
      } catch (error) {
        // Silenciosamente manejar el error, la misión no está activa
        setMissionInProgress(false);
      }
    };

    checkMissionStatus(); // Verificar inmediatamente
    const interval = setInterval(checkMissionStatus, 2000); // Verificar cada 2 segundos

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