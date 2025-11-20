import React, { useState } from 'react';
import Header from './components/Header/Header';
import NavigationTabs from './components/NavigationTabs/NavigationTabs';
import ReportsView from "./components/ReportsView/ReportsView";
import AnalyticsView from "./components/AnalyticsView/AnalyticsView";
import MissionsListView from "./components/MissionsListView/MissionsListView";
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState("analytics"); // Ventana de navegación activa
  const [isConnected, setIsConnected] = useState(false); // Botón de conexión DB


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