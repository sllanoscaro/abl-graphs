import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import "./ReportsView.css";

export default function ReportsView({ isConnected, endpoint }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMissions, setSelectedMissions] = useState([]);
  const [plotData, setPlotData] = useState(null);
  const [loadingPlot, setLoadingPlot] = useState(false);

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
      setError(e.message || "Ha ocurrido un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const toggleMissionSelection = (missionId) => {
    setSelectedMissions(prev => {
      if (prev.includes(missionId)) {
        return prev.filter(id => id !== missionId);
      } else {
        return [...prev, missionId];
      }
    });
  };

  const generatePlot = async () => {
    if (selectedMissions.length === 0) return;

    setLoadingPlot(true);
    try {
      const res = await fetch(`http://localhost:5000/api/reports/wind-contour`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ missionIds: selectedMissions })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo generar el gráfico");
      }

      setPlotData(data);
    } catch (e) {
      setError(e.message || "Error al generar el gráfico");
    } finally {
      setLoadingPlot(false);
    }
  };

  const clearSelection = () => {
    setSelectedMissions([]);
    setPlotData(null);
  };

  return (
    <section className="reports-container">
      <div className="reports-header">
        <div>
          <h2 className="view-title">Reportes</h2>
          <p className="view-subtitle">Generación de mapas de contornos a partir de misiones finalizadas</p>
        </div>
      </div>

      <div className="reports-grid">
        {/* Columna izquierda: listado */}
        <div className="panel">
          <div className="panel-header">
            <h3>Seleccionar Misiones</h3>
            <div className="panel-actions">
              <button type="button" className="ghost-btn" onClick={fetchMissions} disabled={!isConnected || loading}>
                Actualizar
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
              const key = m.idmision ?? m.id;
              const label = m.planvuelo ?? `Misión ${key}`;
              const formattedDate = m.fechahora
                ? new Date(m.fechahora).toLocaleString()
                : "";

              return (
                <li
                  key={key}
                  className={`mission-item ${selectedMissions.includes(key) ? "selected" : ""}`}
                  onClick={() => toggleMissionSelection(key)}
                >
                  <div className="mission-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedMissions.includes(key)}
                      onChange={() => {}}
                    />
                  </div>
                  <div className="mission-content">
                    <div className="mission-title">{label}</div>
                    {formattedDate && (
                      <div className="mission-meta">{formattedDate}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="selection-summary">
            <p>{selectedMissions.length} misión(es) seleccionada(s)</p>
            {selectedMissions.length < 2 && (
              <p className="warning-text">⚠ Debes seleccionar al menos 2 misiones para generar el gráfico</p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="primary-btn"
                disabled={selectedMissions.length < 2 || loadingPlot}
                onClick={generatePlot}
                title={selectedMissions.length < 2 ? 'Selecciona al menos 2 misiones' : ''}
              >
                {loadingPlot ? 'Generando...' : 'Generar Gráfico'}
              </button>
              <button
                type="button"
                className="ghost-btn"
                disabled={selectedMissions.length === 0}
                onClick={clearSelection}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Columna derecha: gráfico */}
        <div className="panel plot-panel">
          <div className="panel-header">
            <h3>Mapa de Contornos - Velocidad del Viento</h3>
          </div>


          {plotData && (
            <div className="plot-container">
              <Plot
                data={[
                  {
                    x: plotData.missions,
                    y: plotData.altitudes,
                    z: plotData.velocities,
                    type: "contour",
                    colorscale: "Viridis",
                    contours: {
                      coloring: "heatmap",
                      showlabels: true,
                      labelfont: {
                        color: "#ffffff",
                        size: 12,
                      },
                    },
                    colorbar: {
                      title: {
                        text: "Velocidad (m/s)",
                        side: "right",
                        font: { size: 16 }
                      },
                      titleside: "right",
                      tickfont: {
                        size: 14,
                        color: '#333333',
                      },
                    },
                    hoverinfo: 'none',
                  },
                  {
                    x: plotData.scatterX,
                    y: plotData.scatterY,
                    mode: "markers",
                    type: "scatter",
                    marker: {
                      symbol: "arrow",
                      color: "#ffffff",
                      size: 20,
                      angle: plotData.directions,
                      line: {
                        color: "#000000",
                        width: 1
                      }
                    },
                    name: "Dirección del Viento",
                  },
                ]}
                layout={{
                  width: undefined,
                  height: 600,
                  autosize: true,
                  paper_bgcolor: '#f8f9fa',
                  plot_bgcolor: '#ffffff',
                  font: {
                    color: '#333333',
                    family: 'Montserrat, sans-serif',
                  },
                  title: {
                    text: "",
                    font: {
                      size: 18,
                      color: '#2c3e50',
                    },
                  },
                  margin: { l: 60, r: 80, t: 20, b: 60 },
                  xaxis: {
                    title: {
                      text: "Misiones",
                      font: {
                        size: 14,
                        color: '#2c3e50',
                      },
                    },
                    tickfont: {
                      size: 12,
                      color: '#2c3e50',
                    },
                    tickmode: 'array',
                    tickvals: plotData.missions,
                    ticktext: plotData.missionLabels,
                  },
                  yaxis: {
                    title: {
                      text: "Altura (m)",
                      font: {
                        size: 14,
                        color: '#2c3e50',
                      },
                    },
                    tickfont: {
                      size: 12,
                      color: '#2c3e50',
                    },
                  },
                }}
                config={{
                  responsive: true,
                  displayModeBar: true,
                  displaylogo: false,
                }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
