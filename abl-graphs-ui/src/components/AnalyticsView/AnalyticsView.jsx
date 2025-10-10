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
  const [lastActivity, setLastActivity] = useState(null);

  // Poll mission status from API
  useEffect(() => {
    let isMounted = true;
    let intervalId = null;

    const checkMissionStatus = async () => {
      if (!isMounted) return;

      try {
        const response = await fetch('http://localhost:5000/api/mission/status');
        if (response.ok && isMounted) {
          const status = await response.json();
          setMissionStarted(status.active);
          setActiveDrones(status.active_drones);
          setCurrentMissionFile(status.current_mission_file);
          setLastActivity(status.last_activity);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error checking mission status:', error);
        }
      }
    };

    // Check immediately on mount
    checkMissionStatus();

    // Set up interval for periodic checks
    intervalId = setInterval(() => {
      if (isMounted) {
        checkMissionStatus();
      }
    }, 2000);

    // Cleanup function
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, []); // Empty dependency array ensures this runs only once

  // Determine overlay message based on mission state
  const getOverlayMessage = () => {
    if (!currentMissionFile) {
      return "Esperando datos...";
    } else if (currentMissionFile && !missionStarted) {
      return "Conexión perdida. Esperando datos...";
    }
    return "";
  };

  const showOverlay = !missionStarted;

  // Configuración base para todos los gráficos sin datos
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: false,
      },
      tooltip: {
        enabled: missionStarted, // Deshabilitar tooltips si no hay misión
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Tiempo',
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
        radius: missionStarted ? 3 : 0,
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
  const getChartData = (label, color) => ({
    labels: [],
    datasets: [
      {
        label: label,
        data: [],
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
      data: getChartData('Velocidad del viento', '#3498db'),
      status: missionStarted ? 'online' : 'waiting'
    },
    {
      title: 'Temperatura',
      unit: '°C',
      data: getChartData('Temperatura', '#e74c3c'),
      status: missionStarted ? 'online' : 'waiting'
    },
    {
      title: 'Presión Atmosférica',
      unit: 'hPa',
      data: getChartData('Presión', '#f39c12'),
      status: missionStarted ? 'online' : 'waiting'
    },
    {
      title: 'Humedad',
      unit: '%',
      data: getChartData('Humedad', '#27ae60'),
      status: missionStarted ? 'online' : 'waiting'
    },
    {
      title: 'Altura',
      unit: 'm',
      data: getChartData('Altura', '#9b59b6'),
      status: missionStarted ? 'online' : 'waiting'
    },
  ];

  return (
    <div className="analytics-view">
      <div className="analytics-header">
        <h2>Misión en tiempo real</h2>
        {missionStarted && (
          <p>
            Drones activos en la misión: <span className="drone-count">{activeDrones}</span>
          </p>
        )}
      </div>

      {showOverlay && (
        <div className="overlay-locked">
          <p>{getOverlayMessage()}</p>
        </div>
      )}

      <div className="analytics-grid">
        {charts.map((chart, index) => (
          <div key={index} className={`chart-panel ${!missionStarted ? 'disabled' : ''}`}>
            <div className="chart-header">
              <h3>{chart.title} ({chart.unit})</h3>
              <span className={`chart-status ${chart.status}`}>
                {chart.status === 'online' ? '● En línea' : '● Esperando'}
              </span>
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
    </div>
  );
};

export default AnalyticsView;
