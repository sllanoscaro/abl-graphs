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

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(false);

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

  // Sort function
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort missions
  const getFilteredAndSortedMissions = () => {
    let filtered = [...missions];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(mission =>
        mission.idmision.toString().includes(searchTerm) ||
        mission.planvuelo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply date range filter
    if (startDate) {
      filtered = filtered.filter(mission => {
        if (!mission.fechahora) return false;
        const missionDate = new Date(mission.fechahora);
        return missionDate >= new Date(startDate);
      });
    }

    if (endDate) {
      filtered = filtered.filter(mission => {
        if (!mission.fechahora) return false;
        const missionDate = new Date(mission.fechahora);
        // Set end date to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        return missionDate <= endOfDay;
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle date sorting
        if (sortConfig.key === 'fechahora') {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        }

        // Handle numeric sorting
        if (sortConfig.key === 'idmision') {
          aValue = Number(aValue);
          bValue = Number(bValue);
        }

        // Handle string sorting
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  };

  const filteredMissions = getFilteredAndSortedMissions();

  // Pagination logic
  const totalPages = Math.ceil(filteredMissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMissions = filteredMissions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, sortConfig.key, sortConfig.direction]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newSize) => {
    setItemsPerPage(newSize);
    setCurrentPage(1);
    setShowPageSizeSelector(false);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSortConfig({ key: null, direction: 'asc' });
    setCurrentPage(1);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img src="lista-de-rectangulos.png" alt="Logo" className="logo" />
            <div>
                <h2 className="view-title">Registro de misiones</h2>
                <p className="view-subtitle">En esta sección podrás consultar todas las misiones que se encuentren registradas en la base de datos.</p>
            </div>
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
        <>
          {/* Search and Filter Controls */}
          <div className="filter-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="Buscar por ID o Plan de Vuelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button
                  className="clear-search-btn"
                  onClick={() => setSearchTerm('')}
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="date-filters">
              <div className="date-input-group">
                <label htmlFor="start-date">Desde:</label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                />
              </div>

              <div className="date-input-group">
                <label htmlFor="end-date">Hasta:</label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                />
              </div>

              {(searchTerm || startDate || endDate) && (
                <button
                  className="clear-filters-btn"
                  onClick={clearFilters}
                  title="Limpiar todos los filtros"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>
          </div>

          {/* Results count and page size selector */}
          <div className="results-controls">
            {filteredMissions.length !== missions.length && (
              <div className="results-count">
                Mostrando {startIndex + 1}-{Math.min(endIndex, filteredMissions.length)} de {filteredMissions.length} misiones
              </div>
            )}
            {filteredMissions.length === missions.length && filteredMissions.length > 0 && (
              <div className="results-count">
                Total: {filteredMissions.length} misiones
              </div>
            )}

            <div className="page-size-selector-container">
              <label htmlFor="page-size-selector">Misiones por página:</label>
              <div className="page-size-dropdown">
                <button
                  className="page-size-button"
                  onClick={() => setShowPageSizeSelector(!showPageSizeSelector)}
                >
                  {itemsPerPage} ▼
                </button>
                {showPageSizeSelector && (
                  <div className="page-size-options">
                    {[5, 10, 15, 20, 25, 50].map(size => (
                      <button
                        key={size}
                        className={`page-size-option ${itemsPerPage === size ? 'active' : ''}`}
                        onClick={() => handleItemsPerPageChange(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {filteredMissions.length === 0 && (
            <div className="no-results-overlay">
              <p>No se encontraron misiones con los filtros aplicados.</p>
            </div>
          )}

          {filteredMissions.length > 0 && (
            <div className="missions-table-container">
              <table className="missions-table">
                <thead>
                  <tr>
                    <th
                      onClick={() => handleSort('idmision')}
                      className="sortable-header"
                      title="Click para ordenar"
                    >
                      ID Misión
                      {sortConfig.key === 'idmision' && (
                        <span className="sort-indicator">
                          {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </th>
                    <th
                      onClick={() => handleSort('planvuelo')}
                      className="sortable-header"
                      title="Click para ordenar"
                    >
                      Plan de Vuelo
                      {sortConfig.key === 'planvuelo' && (
                        <span className="sort-indicator">
                          {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </th>
                    <th
                      onClick={() => handleSort('fechahora')}
                      className="sortable-header"
                      title="Click para ordenar"
                    >
                      Fecha
                      {sortConfig.key === 'fechahora' && (
                        <span className="sort-indicator">
                          {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMissions.map((mission) => (
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

          {/* Pagination Controls */}
          {filteredMissions.length > 0 && totalPages > 1 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Página {currentPage} de {totalPages}
              </div>
              <div className="pagination-controls">
                <button
                  className="pagination-btn pagination-btn-prev"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  title="Página anterior"
                >
                  ← Anterior
                </button>

                <div className="pagination-numbers">
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    )
                  ))}
                </div>

                <button
                  className="pagination-btn pagination-btn-next"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  title="Página siguiente"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MissionsListView;
