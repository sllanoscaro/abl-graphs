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
        Real time analytics
      </button>

      <button
        className={`tab-link ${activeTab === "reports" ? "active" : ""} ${ reportsDisabled ? "disabled" : "" }`}
        onClick={() => !reportsDisabled && onChange("reports")}
        type="button"
        title={reportsDisabled ? "Conéctate a la base de datos para acceder" : ""}
      >
        Report generation
      </button>
    </nav>
  );
};
