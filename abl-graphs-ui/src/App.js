import React, { useState } from 'react';
import Header from './components/Header/Header';
import NavigationTabs from './components/NavigationTabs/NavigationTabs';
import ReportsView from "./components/ReportsView/ReportsView";
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
      />

      <div className="content">
        <main className="page-content">
          {activeTab === "analytics" && (
            <div className="placeholder-card">
            </div>
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
