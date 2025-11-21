import React, { useState, useEffect } from "react";
import "./NavigationTabs.css";

export default function NavigationTabs({ activeTab, onChange, reportsDisabled, missionsDisabled, missionInProgress }) {
  const [showErrorAlert, setShowErrorAlert] = useState(false);

  // Auto-hide alert after 4 seconds
  useEffect(() => {
    if (showErrorAlert) {
      const timer = setTimeout(() => {
        setShowErrorAlert(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showErrorAlert]);

  const handleDisabledClick = () => {
    setShowErrorAlert(true);
  };

  return (
    <>
      <nav className="nav-tabs">
        <button
          className={`tab-link ${activeTab === "analytics" ? "active" : ""} ${missionInProgress && activeTab !== "analytics" ? "active-mission" : ""}`}
          onClick={() => onChange("analytics")}
          type="button"
        >
          Misión en tiempo real
        </button>

        <button
          className={`tab-link ${activeTab === "missions" ? "active" : ""} ${ missionsDisabled ? "disabled" : "" }`}
          onClick={() => missionsDisabled ? handleDisabledClick() : onChange("missions")}
          type="button"
        >
          Registro de misiones
        </button>

        <button
          className={`tab-link ${activeTab === "reports" ? "active" : ""} ${ reportsDisabled ? "disabled" : "" }`}
          onClick={() => reportsDisabled ? handleDisabledClick() : onChange("reports")}
          type="button"
        >
          Generación de informes
        </button>
      </nav>

      {/* Error Alert Overlay */}
      {showErrorAlert && (
        <div className="error-alert-overlay">
          <p>Debes verificar la conexión a la base de datos antes de acceder a esta sección.</p>
        </div>
      )}
    </>
  );
};
