import React from "react";
import "./NavigationTabs.css";

export default function NavigationTabs({ activeTab, onChange, reportsDisabled }) {

  return (
    <nav className="nav-tabs">
      <button
        className={`tab-link ${activeTab === "analytics" ? "active" : ""}`}
        onClick={() => onChange("analytics")}
        type="button"
      >
        Misión en tiempo real
      </button>

      <button
        className={`tab-link ${activeTab === "reports" ? "active" : ""} ${ reportsDisabled ? "disabled" : "" }`}
        onClick={() => !reportsDisabled && onChange("reports")}
        type="button"
        title={reportsDisabled ? "Verifica primero la conexión a la BD en PostgreSQL" : ""}
      >
        Generación de informes
      </button>
    </nav>
  );
};
