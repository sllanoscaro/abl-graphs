import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './MissionsListView.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip
);

const MissionsListView = ({ isConnected }) => {
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [missionData, setMissionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null);

  // Fetch missions list on component mount
  useEffect(() => {
    if (isConnected) {
      fetchMissions();
    }
  }, [isConnected]);

  const fetchMissions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/missions');
      if (response.ok) {
        const data = await response.json();
        setMissions(data);
      } else {
        setError('Error al cargar las misiones');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error fetching missions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMissionDetails = async (missionId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:5000/api/mission/${missionId}/data`);
      if (response.ok) {
        const data = await response.json();
        setMissionData(data);
      } else {
        setError('Error al cargar los detalles de la misión');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error fetching mission details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMissionSelect = (mission) => {
    setSelectedMission(mission);
    fetchMissionDetails(mission.idmision);
  };

  const handleBackToList = () => {
    setSelectedMission(null);
    setMissionData(null);
  };

  // Chart configuration
  const getChartOptions = (yAxisLabel) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Tiempo (HH:MM:SS)',
          font: {
            family: 'Montserrat',
            size: 12,
          },
        },
        grid: {
          color: '#e0e0e0',
        },
        ticks: {
          font: {
            family: 'Montserrat',
            size: 10,
          },
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: yAxisLabel,
          font: {
            family: 'Montserrat',
            size: 12,
          },
        },
        grid: {
          color: '#e0e0e0',
        },
        ticks: {
          font: {
            family: 'Montserrat',
            size: 10,
          },
        },
      },
    },
    elements: {
      point: {
        radius: 3,
      },
      line: {
        tension: 0.1,
      },
    },
  });

  const getChartData = (tiempos, values, label, color) => ({
    labels: tiempos,
    datasets: [
      {
        label: label,
        data: values,
        borderColor: color,
        backgroundColor: `${color}20`,
        borderWidth: 2,
        fill: false,
      },
    ],
  });

  if (!isConnected) {
    return (
      <div className="missions-list-view">
        <div className="missions-list-header">
          <div>
            <h2 className="view-title">Listado de Misiones</h2>
            <p className="view-subtitle">Historial de misiones completadas con datos de sensores</p>
          </div>
        </div>
        <div className="alert-box">
          <p>⚠️ Debes conectarte a la base de datos para acceder al listado de misiones.</p>
        </div>
      </div>
    );
  }

  if (selectedMission && missionData) {
    return (
      <div className="missions-list-view">
        <div className="mission-detail-header">
          <div>
            <h2 className="view-title">Detalle de Misión: {selectedMission.planvuelo}</h2>
            <p className="view-subtitle">Información completa y datos de sensores de la misión seleccionada</p>
          </div>
          <button className="back-button" onClick={handleBackToList}>
            ← Volver
          </button>
        </div>

        <div className="mission-info-card">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">ID Misión:</span>
              <span className="info-value">{selectedMission.idmision}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Plan de Vuelo:</span>
              <span className="info-value">{selectedMission.planvuelo}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Fecha:</span>
              <span className="info-value">
                {selectedMission.fechahora ? new Date(selectedMission.fechahora).toLocaleDateString('es-ES') : 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Hora Inicio:</span>
              <span className="info-value">{missionData.missionInfo?.horainicio || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Hora Término:</span>
              <span className="info-value">{missionData.missionInfo?.horatermino || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Latitud:</span>
              <span className="info-value">{missionData.missionInfo?.latitud || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Longitud:</span>
              <span className="info-value">{missionData.missionInfo?.longitud || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="charts-section">
          <h3>Gráficas según tiempo</h3>
          <div className="charts-grid">
            {missionData.charts && missionData.charts.velocidad_viento && (
              <div className="chart-card">
                <h4
                  onClick={() => setExpandedChart({
                    title: 'Velocidad del Viento',
                    unit: 'Velocidad (m/s)',
                    data: getChartData(
                      missionData.charts.velocidad_viento.tiempos,
                      missionData.charts.velocidad_viento.valores,
                      'Velocidad del Viento',
                      '#3498db'
                    )
                  })}
                  title="Click para ampliar"
                >
                  Velocidad del Viento
                </h4>
                <div className="chart-wrapper">
                  <Line
                    data={getChartData(
                      missionData.charts.velocidad_viento.tiempos,
                      missionData.charts.velocidad_viento.valores,
                      'Velocidad del Viento',
                      '#3498db'
                    )}
                    options={getChartOptions('Velocidad (m/s)')}
                  />
                </div>
              </div>
            )}

            {missionData.charts && missionData.charts.temperatura && (
              <div className="chart-card">
                <h4
                  onClick={() => setExpandedChart({
                    title: 'Temperatura',
                    unit: 'Temperatura (°C)',
                    data: getChartData(
                      missionData.charts.temperatura.tiempos,
                      missionData.charts.temperatura.valores,
                      'Temperatura',
                      '#e74c3c'
                    )
                  })}
                  title="Click para ampliar"
                >
                  Temperatura
                </h4>
                <div className="chart-wrapper">
                  <Line
                    data={getChartData(
                      missionData.charts.temperatura.tiempos,
                      missionData.charts.temperatura.valores,
                      'Temperatura',
                      '#e74c3c'
                    )}
                    options={getChartOptions('Temperatura (°C)')}
                  />
                </div>
              </div>
            )}

            {missionData.charts && missionData.charts.presion && (
              <div className="chart-card">
                <h4
                  onClick={() => setExpandedChart({
                    title: 'Presión Atmosférica',
                    unit: 'Presión (hPa)',
                    data: getChartData(
                      missionData.charts.presion.tiempos,
                      missionData.charts.presion.valores,
                      'Presión',
                      '#f39c12'
                    )
                  })}
                  title="Click para ampliar"
                >
                  Presión Atmosférica
                </h4>
                <div className="chart-wrapper">
                  <Line
                    data={getChartData(
                      missionData.charts.presion.tiempos,
                      missionData.charts.presion.valores,
                      'Presión',
                      '#f39c12'
                    )}
                    options={getChartOptions('Presión (hPa)')}
                  />
                </div>
              </div>
            )}

            {missionData.charts && missionData.charts.humedad && (
              <div className="chart-card">
                <h4
                  onClick={() => setExpandedChart({
                    title: 'Humedad',
                    unit: 'Humedad (%)',
                    data: getChartData(
                      missionData.charts.humedad.tiempos,
                      missionData.charts.humedad.valores,
                      'Humedad',
                      '#27ae60'
                    )
                  })}
                  title="Click para ampliar"
                >
                  Humedad
                </h4>
                <div className="chart-wrapper">
                  <Line
                    data={getChartData(
                      missionData.charts.humedad.tiempos,
                      missionData.charts.humedad.valores,
                      'Humedad',
                      '#27ae60'
                    )}
                    options={getChartOptions('Humedad (%)')}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal for expanded chart */}
        {expandedChart && (
          <div className="chart-modal-overlay" onClick={() => setExpandedChart(null)}>
            <div className="chart-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="chart-modal-header">
                <h3>{expandedChart.title}</h3>
                <button className="chart-modal-close" onClick={() => setExpandedChart(null)}>
                  ✕ Cerrar
                </button>
              </div>
              <div className="chart-modal-body">
                <div className="chart-wrapper">
                  <Line
                    data={expandedChart.data}
                    options={{
                      ...getChartOptions(expandedChart.unit),
                      maintainAspectRatio: true,
                      aspectRatio: 2,
                      scales: {
                        ...getChartOptions(expandedChart.unit).scales,
                        x: {
                          ...getChartOptions(expandedChart.unit).scales.x,
                          title: {
                            ...getChartOptions(expandedChart.unit).scales.x.title,
                            font: {
                              family: 'Montserrat',
                              size: 16,
                            },
                          },
                          ticks: {
                            ...getChartOptions(expandedChart.unit).scales.x.ticks,
                            font: {
                              family: 'Montserrat',
                              size: 14,
                            },
                          },
                        },
                        y: {
                          ...getChartOptions(expandedChart.unit).scales.y,
                          title: {
                            ...getChartOptions(expandedChart.unit).scales.y.title,
                            font: {
                              family: 'Montserrat',
                              size: 16,
                            },
                          },
                          ticks: {
                            ...getChartOptions(expandedChart.unit).scales.y.ticks,
                            font: {
                              family: 'Montserrat',
                              size: 14,
                            },
                          },
                        },
                      },
                      elements: {
                        point: {
                          radius: 3,
                        },
                        line: {
                          tension: 0.1,
                          borderWidth: 3,
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="missions-list-view">
      <div className="missions-list-header">
        <div>
          <h2 className="view-title">Listado de Misiones</h2>
          <p className="view-subtitle">Historial de misiones completadas con datos de sensores</p>
        </div>
        <button className="refresh-button" onClick={fetchMissions} disabled={loading}>
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="alert-box error">
          <p>❌ {error}</p>
        </div>
      )}

      {loading && missions.length === 0 ? (
        <div className="loading-message">
          <p>Cargando misiones...</p>
        </div>
      ) : missions.length === 0 ? (
        <div className="alert-box">
          <p>No hay misiones registradas en la base de datos.</p>
        </div>
      ) : (
        <div className="missions-table-container">
          <table className="missions-table">
            <thead>
              <tr>
                <th>ID Misión</th>
                <th>Plan de Vuelo</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {missions.map((mission) => (
                <tr key={mission.idmision}>
                  <td>{mission.idmision}</td>
                  <td>{mission.planvuelo}</td>
                  <td>
                    {mission.fechahora
                      ? new Date(mission.fechahora).toLocaleString('es-ES', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'}
                  </td>
                  <td>
                    <button
                      className="view-button"
                      onClick={() => handleMissionSelect(mission)}
                    >
                      Ver Detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MissionsListView;
