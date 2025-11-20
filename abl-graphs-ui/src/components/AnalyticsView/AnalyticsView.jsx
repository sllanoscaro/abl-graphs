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
  const [missionStarted, setMissionStarted] = useState(false);
  const [sensorData, setSensorData] = useState({
    timestamps: [],
    velocidad_viento: [],
    presion: [],
    temperatura: [],
    humedad: [],
    altura: []
  });
  const [expandedChartIndex, setExpandedChartIndex] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [timeWindowSeconds, setTimeWindowSeconds] = useState(60); // Default: 60 seconds

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

          // Update sensor data if mission is active and has data
          if (result.status.active && result.data.length > 0) {
            const timestamps = result.data.map(entry => entry.timestamp || '');
            const velocidad_viento = result.data.map(entry => entry.velocidad_viento || 0);
            const presion = result.data.map(entry => entry.presion || 0);
            const temperatura = result.data.map(entry => entry.temperatura || 0);
            const humedad = result.data.map(entry => entry.humedad || 0);
            const altura = result.data.map(entry => entry.altura || 0);

            // Apply sliding window: show only last N seconds of data
            const startIndex = Math.max(0, timestamps.length - timeWindowSeconds);

            setSensorData({
              timestamps: timestamps.slice(startIndex),
              velocidad_viento: velocidad_viento.slice(startIndex),
              presion: presion.slice(startIndex),
              temperatura: temperatura.slice(startIndex),
              humedad: humedad.slice(startIndex),
              altura: altura.slice(startIndex)
            });
          }
          // If mission is not active, clear data
          else if (!result.status.active) {
            setSensorData({
              timestamps: [],
              velocidad_viento: [],
              presion: [],
              temperatura: [],
              humedad: [],
              altura: []
            });
          }
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
    }, 1000);

    // Cleanup function
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, [timeWindowSeconds]); // Re-run when time window changes

  // Determine overlay message based on mission state
  const getOverlayMessage = () => {
    return "No se registran datos entrantes.";
  };

  const showOverlay = !missionStarted;

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
          text: 'Tiempo (s)',
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

  // Setup chart data
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
      unit: 'Velocidad (m/s)',
      data: getChartData('Velocidad del viento', '#3498db', 'velocidad_viento'),
      status: missionStarted ? 'online' : 'waiting'
    },
    {
      title: 'Temperatura',
      unit: 'Temperatura (°C)',
      data: getChartData('Temperatura', '#e74c3c', 'temperatura'),
      status: missionStarted ? 'online' : 'waiting'
    },
    {
      title: 'Presión Atmosférica',
      unit: 'Presión (Pa)',
      data: getChartData('Presión', '#f39c12', 'presion'),
      status: missionStarted ? 'online' : 'waiting'
    },
    {
      title: 'Humedad',
      unit: 'Humedad (%)',
      data: getChartData('Humedad', '#27ae60', 'humedad'),
      status: missionStarted ? 'online' : 'waiting'
    },
    {
      title: 'Altura',
      unit: 'Altura (m)',
      data: getChartData('Altura', '#9b59b6', 'altura'),
      status: missionStarted ? 'online' : 'waiting'
    },
  ];

  return (
    <div className="analytics-view">
      <div className="analytics-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <img src="legumbres.png" alt="Logo" className="logo" />
                  <div>
                      <h2 className="view-title">Misión en tiempo real</h2>
                      <p className="view-subtitle">
                          En esta sección podrás ver las gráficas de los datos recolectados en tiempo real.
                          {missionStarted && (
                              <span> • Drones activos: <span className="drone-count">1</span></span>
                          )}
                      </p>
                  </div>
              </div>

              {/* Time Window Selector */}
              <div className="time-window-selector-container">
                <label htmlFor="time-window-selector">Ventana de tiempo:</label>
                <div className="time-window-dropdown">
                  <button
                    className="time-window-button"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    {timeWindowSeconds < 60
                      ? `${timeWindowSeconds}s`
                      : `${Math.floor(timeWindowSeconds / 60)}min`} ▼
                  </button>
                  {showSettings && (
                    <div className="time-window-options">
                      {[30, 60, 120, 180, 300].map(seconds => (
                        <button
                          key={seconds}
                          className={`time-window-option ${timeWindowSeconds === seconds ? 'active' : ''}`}
                          onClick={() => {
                            setTimeWindowSeconds(seconds);
                            setShowSettings(false);
                          }}
                        >
                          {seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}min`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
          </div>
      </div>

      {showOverlay && (
        <div className="overlay-locked">
          <p>{getOverlayMessage()}</p>
        </div>
      )}

      <div className="analytics-grid">
        {charts.map((chart, index) => (
          <div key={index} className="chart-panel">
            <div className="chart-header">
              <h3 onClick={() => setExpandedChartIndex(index)} title="Haz click para ampliar el gráfico">
                {chart.title}
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
              <h3>{charts[expandedChartIndex].title}</h3>
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
