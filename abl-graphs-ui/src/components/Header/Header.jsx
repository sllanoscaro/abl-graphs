import React from "react";
import DbStatusButton from "../DbStatusButton/DbStatusButton";
import "./Header.css";

export default function Header({ onConnectionChange, isConnected }) {

  return (
    <header className="header-container">
      <div className="logo-container">
        <img src="dron-alternativo.png" alt="Logo" className="logo" />
        <div>
          <h1 className="app-title">ABL-DRONE</h1>
          <p className="app-subtitle">Gráficas de datos meteorológicos</p>
        </div>
      </div>

      <div className="header-actions">
        <DbStatusButton
            endpoint="http://localhost:5000/api/db/health"
            onStatusChange={onConnectionChange}
            initialStatus={isConnected ? "success" : "default"}
        />
      </div>
    </header>
  );
};
