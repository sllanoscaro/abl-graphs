import React, { useState } from 'react';
import Header from './components/Header/Header';
import NavigationTabs from './components/NavigationTabs/NavigationTabs';
import ReportsView from "./components/ReportsView/ReportsView";
import AnalyticsView from "./components/AnalyticsView/AnalyticsView";
import './App.css';

// TODO:
// - Implementar la generación de informes en ReportsView.
// - Aplicar ETL donde sea necesario.
// - Conectar datos reales de archivos JSON para Analytics.
// - Generación de gráficas con chart.js para Analytics y plotly.js para ReportsView.

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
            <AnalyticsView />
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
