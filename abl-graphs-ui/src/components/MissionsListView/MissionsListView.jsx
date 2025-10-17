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
          text: 'Altitud (m)',
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

  const getChartData = (altitudes, values, label, color) => ({
    labels: altitudes,
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
          <button className="back-button" onClick={handleBackToList}>
            ← Volver
          </button>
          <h2>Detalle: {selectedMission.planvuelo}</h2>
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
          <h3>Gráficas según altura</h3>
          <div className="charts-grid">
            {missionData.charts && missionData.charts.velocidad_viento && (
              <div className="chart-card">
                <h4>Velocidad del Viento</h4>
                <div className="chart-wrapper">
                  <Line
                    data={getChartData(
                      missionData.charts.velocidad_viento.altitudes,
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
                <h4>Temperatura</h4>
                <div className="chart-wrapper">
                  <Line
                    data={getChartData(
                      missionData.charts.temperatura.altitudes,
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
                <h4>Presión Atmosférica</h4>
                <div className="chart-wrapper">
                  <Line
                    data={getChartData(
                      missionData.charts.presion.altitudes,
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
                <h4>Humedad</h4>
                <div className="chart-wrapper">
                  <Line
                    data={getChartData(
                      missionData.charts.humedad.altitudes,
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
      </div>
    );
  }

  return (
    <div className="missions-list-view">
      <div className="missions-list-header">
        <h2>Listado de Misiones</h2>
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
