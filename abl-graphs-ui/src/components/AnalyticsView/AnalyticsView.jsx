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
import './AnalyticsView.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip
);

const AnalyticsView = () => {
  const [activeDrones, setActiveDrones] = useState(0);
  const [missionStarted, setMissionStarted] = useState(false);
  const [currentMissionFile, setCurrentMissionFile] = useState(null);
  const [isEndingMission, setIsEndingMission] = useState(false);
  const [sensorData, setSensorData] = useState({
    timestamps: [],
    presion: [],
    temperatura: [],
    humedad: [],
    altitud: []
  });
  const [expandedChartIndex, setExpandedChartIndex] = useState(null);

  // Poll mission status and data from API in a single request
  useEffect(() => {
    let isMounted = true;
    let intervalId = null;

    const fetchMissionRealtime = async () => {
      if (!isMounted) return;

      try {
        const response = await fetch('http://localhost:5000/api/mission/realtime');
        if (response.ok && isMounted) {
          const result = await response.json();

          // Update mission status
          setMissionStarted(result.status.active);
          setActiveDrones(result.status.active_drones);
          setCurrentMissionFile(result.status.current_mission_file);

          // Update sensor data if mission is active and has data
          if (result.status.active && result.data.length > 0) {
            const timestamps = result.data.map((entry, index) => index);
            const presion = result.data.map(entry => entry.presion);
            const temperatura = result.data.map(entry => entry.temperatura);
            const humedad = result.data.map(entry => entry.humedad);
            const altitud = result.data.map(entry => entry.altitud);

            setSensorData({
              timestamps,
              presion,
              temperatura,
              humedad,
              altitud
            });
          }
          // If mission is not active and no file, clear data
          else if (!result.status.active && !result.status.current_mission_file) {
            setSensorData({
              timestamps: [],
              presion: [],
              temperatura: [],
              humedad: [],
              altitud: []
            });
          }
          // else: keep existing data (paused state)
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching mission realtime data:', error);
        }
      }
    };

    // Fetch immediately on mount
    fetchMissionRealtime();

    // Set up interval for periodic updates
    intervalId = setInterval(() => {
      if (isMounted) {
        fetchMissionRealtime();
      }
    }, 1000); // Update every second

    // Cleanup function
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, []); // Solo ejecutar una vez al montar el componente

  // Handle ending the mission manually
  const handleEndMission = async () => {
    setIsEndingMission(true);

    try {
      const response = await fetch('http://localhost:5000/api/mission/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Reset all state
        setMissionStarted(false);
        setActiveDrones(0);
        setCurrentMissionFile(null);
        setSensorData({
          timestamps: [],
          presion: [],
          temperatura: [],
          humedad: [],
          altitud: []
        });
      } else {
        console.error('Error ending mission');
      }
    } catch (error) {
      console.error('Error ending mission:', error);
    } finally {
      setIsEndingMission(false);
    }
  };

  // Determine overlay message based on mission state
  const getOverlayMessage = () => {
    if (!currentMissionFile) {
      return "No se registran datos entrantes.";
    } else if (currentMissionFile && !missionStarted) {
      return "Datos interrumpidos. ¿La misión terminó?";
    }
    return "";
  };

  const showOverlay = !missionStarted;
  const showEndMissionButton = currentMissionFile && !missionStarted;

  // Configuración base para todos los gráficos
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: false,
      },
      tooltip: {
        enabled: missionStarted,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'tiempo',
          font: {
            family: 'Montserrat',
            size: 12,
          },
        },
        grid: {
          color: missionStarted ? '#e0e0e0' : '#f0f0f0',
        },
        ticks: {
          font: {
            family: 'Montserrat',
            size: 10,
          },
          color: missionStarted ? '#666' : '#ccc',
        },
      },
      y: {
        display: true,
        grid: {
          color: missionStarted ? '#e0e0e0' : '#f0f0f0',
        },
        ticks: {
          font: {
            family: 'Montserrat',
            size: 10,
          },
          color: missionStarted ? '#666' : '#ccc',
        },
      },
    },
    elements: {
      point: {
        radius: missionStarted ? 2 : 0,
      },
      line: {
        tension: 0.1,
      },
    },
    interaction: {
      intersect: false,
      mode: missionStarted ? 'index' : 'none',
    },
  };

  // Datos específicos para cada gráfico con colores diferentes
  const getChartData = (label, color, dataKey) => ({
    labels: sensorData.timestamps,
    datasets: [
      {
        label: label,
        data: sensorData[dataKey] || [],
        borderColor: missionStarted ? color : '#bdc3c7',
        backgroundColor: missionStarted ? `${color}20` : 'rgba(189, 195, 199, 0.05)',
        borderWidth: 2,
        fill: false,
      },
    ],
  });

  const charts = [
    {
      title: 'Velocidad del Viento',
      unit: 'm/s',
      data: getChartData('Velocidad del viento', '#3498db', 'velocidad'),
      status: missionStarted ? 'online' : 'waiting'
    },
    {
      title: 'Temperatura',
      unit: '°C',
      data: getChartData('Temperatura', '#e74c3c', 'temperatura'),
      status: missionStarted ? 'online' : 'waiting'
    },
    {
      title: 'Presión Atmosférica',
      unit: 'hPa',
      data: getChartData('Presión', '#f39c12', 'presion'),
      status: missionStarted ? 'online' : 'waiting'
    },
    {
      title: 'Humedad',
      unit: '%',
      data: getChartData('Humedad', '#27ae60', 'humedad'),
      status: missionStarted ? 'online' : 'waiting'
    },
    {
      title: 'Altura',
      unit: 'm',
      data: getChartData('Altura', '#9b59b6', 'altitud'),
      status: missionStarted ? 'online' : 'waiting'
    },
  ];

  return (
    <div className="analytics-view">
      <div className="analytics-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <img src="legumbres.png" alt="Logo" className="logo" />
              <div>
                  <h2 className="view-title">Misión en tiempo real</h2>
                  <p className="view-subtitle">
                      En esta sección podrás ver las gráficas de los datos recolectados en tiempo real.
                      {missionStarted && (
                          <span> • Drones activos: <span className="drone-count">{activeDrones}</span></span>
                      )}
                  </p>
              </div>
          </div>
      </div>

      {showOverlay && (
        <div className="overlay-locked">
          <p>{getOverlayMessage()}</p>
          {showEndMissionButton && (
            <button
              className="end-mission-button"
              onClick={handleEndMission}
              disabled={isEndingMission}
            >
              {isEndingMission ? 'Terminando misión...' : 'Terminar misión'}
            </button>
          )}
        </div>
      )}

      <div className="analytics-grid">
        {charts.map((chart, index) => (
          <div key={index} className="chart-panel">
            <div className="chart-header">
              <h3 onClick={() => setExpandedChartIndex(index)} title="Haz click para ampliar el gráfico">
                {chart.title} ({chart.unit})
              </h3>
            </div>
            <div className="chart-container">
              <Line
                data={chart.data}
                options={{
                  ...chartOptions,
                  scales: {
                    ...chartOptions.scales,
                    y: {
                      ...chartOptions.scales.y,
                      title: {
                        display: true,
                        text: chart.unit,
                        font: {
                          family: 'Montserrat',
                          size: 12,
                        },
                        color: missionStarted ? '#666' : '#ccc',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Modal for expanded chart */}
      {expandedChartIndex !== null && charts[expandedChartIndex] && (
        <div className="chart-modal-overlay" onClick={() => setExpandedChartIndex(null)}>
          <div className="chart-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="chart-modal-header">
              <h3>{charts[expandedChartIndex].title} ({charts[expandedChartIndex].unit})</h3>
              <button className="chart-modal-close" onClick={() => setExpandedChartIndex(null)}>
                ✕ Cerrar
              </button>
            </div>
            <div className="chart-modal-body">
              <div className="chart-container">
                <Line
                  data={charts[expandedChartIndex].data}
                  options={{
                    ...chartOptions,
                    maintainAspectRatio: true,
                    aspectRatio: 2,
                    scales: {
                      ...chartOptions.scales,
                      y: {
                        ...chartOptions.scales.y,
                        title: {
                          display: true,
                          text: charts[expandedChartIndex].unit,
                          font: {
                            family: 'Montserrat',
                            size: 16,
                          },
                          color: missionStarted ? '#666' : '#ccc',
                        },
                        ticks: {
                          font: {
                            family: 'Montserrat',
                            size: 14,
                          },
                          color: missionStarted ? '#666' : '#ccc',
                        },
                      },
                      x: {
                        ...chartOptions.scales.x,
                        title: {
                          ...chartOptions.scales.x.title,
                          font: {
                            family: 'Montserrat',
                            size: 16,
                          },
                        },
                        ticks: {
                          font: {
                            family: 'Montserrat',
                            size: 14,
                          },
                          color: missionStarted ? '#666' : '#ccc',
                        },
                      },
                    },
                    elements: {
                      point: {
                        radius: missionStarted ? 3 : 0,
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
};

export default AnalyticsView;
