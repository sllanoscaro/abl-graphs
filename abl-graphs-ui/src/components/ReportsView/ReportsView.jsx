import React, { useEffect, useState } from "react";
import "./ReportsView.css";

export default function ReportsView({ isConnected, endpoint }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [selected, setSelected] = useState(null);
  
  useEffect(() => {
    if (!isConnected) return;
    fetchMissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const fetchMissions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo obtener misiones");
      }
      setMissions(Array.isArray(data) ? data : data?.missions || []);
    } catch (e) {
      setError(e.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="reports-grid">
      {/* Columna izquierda: listado */}
      <div className="panel">
        <div className="panel-header">
          <h3>Misiones</h3>
          <div className="panel-actions">
            <button type="button" className="ghost-btn" onClick={fetchMissions} disabled={!isConnected || loading}>
              Refresh
            </button>
          </div>
        </div>

        {loading && <div className="empty">Cargando misiones…</div>}
        {error && !loading && <div className="error-box">{error}</div>}
        {!loading && !error && missions.length === 0 && (
          <div className="empty">No hay misiones registradas.</div>
        )}

        <ul className="mission-list">
          {missions.map((m) => {
            const key = m.id ?? m.mission_id ?? m.uuid ?? m.name;
            const label = m.name ?? m.title ?? `Misión ${key}`;
            return (
              <li
                key={key}
                className={`mission-item ${selected === key ? "selected" : ""}`}
                onClick={() => setSelected(key)}
              >
                <div className="mission-title">{label}</div>
                {m.date && <div className="mission-meta">{m.date}</div>}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Columna derecha: formulario (bloqueado hasta seleccionar) */}
      <div className="panel">
        <div className="panel-header">
          <h3>Generación de reporte</h3>
        </div>

        {!selected && (
          <div className="overlay-locked">
            <p>Selecciona una misión para habilitar el formulario.</p>
          </div>
        )}

        <div className={`form-area ${!selected ? "disabled" : ""}`}>
          {/* Placeholder del formulario — lo implementaremos luego */}
          <div className="form-row">
            <label>Título del reporte</label>
            <input type="text" placeholder="Ingresar título…" disabled={!selected} />
          </div>
          <div className="form-row">
            <label>Descripción</label>
            <textarea placeholder="Ingresar descripción…" disabled={!selected} />
          </div>
          <div className="form-actions">
            <button type="button" className="primary-btn" disabled={!selected}>
              Generar
            </button>
            <button type="button" className="ghost-btn" disabled={!selected}>
              Limpiar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
