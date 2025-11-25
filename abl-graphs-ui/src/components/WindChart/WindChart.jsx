import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import * as d3 from "d3";

// Define un objeto de estilos para el contenedor principal
const containerStyle = {
  backgroundColor: '#1F1F1F',
  color: '#ffffff',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
};

// Define un objeto de estilos para los títulos
const titleStyle = {
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  fontSize: '3em',
  fontWeight: 'bold',
  color: '#636efa',
  marginBottom: '20px',
};

const WindContourPlot = () => {
  const [plotData, setPlotData] = useState({ x: [], y: [], z: [], scatterPoints: [] });

  useEffect(() => {
    const parseData = (d) => ({
      time: +d.time,
      height: +d.height,
      velocity: +d.velocity,
      direction: +d.direction, // Incluye el valor de dirección
    });

    d3.csv("/wind_data.csv", parseData).then((data) => {
      const times = Array.from(new Set(data.map((d) => d.time))).sort((a, b) => a - b);
      const heights = Array.from(new Set(data.map((d) => d.height))).sort((a, b) => a - b);

      const z = heights.map((h) =>
        times.map((t) => {
          const point = data.find((d) => d.time === t && d.height === h);
          return point ? point.velocity : null;
        })
      );

      // Crear datos para los puntos scatter
      const scatterPoints = {
        x: data.map((d) => d.time),
        y: data.map((d) => d.height),
        z: data.map((d) => d.velocity),
        direction: data.map((d) => d.direction), // Se incluye dirección
      };

      setPlotData({ x: times, y: heights, z, scatterPoints });
    });
  }, []);

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Mapa de Contornos</h2>
      <Plot
        data={[
          {
            x: plotData.x,
            y: plotData.y,
            z: plotData.z,
            type: "contour",
            colorscale: "Viridis",
            contours: {
              coloring: "heatmap",
              showlabels: true,
              labelfont: {
                color: "#ffffff",
                size: 16,
              },
            },
            colorbar: {
              title: { text: "Velocidad (m/s)", side: "right", font: { size: 20 } },
              titleside: "right",
              tickfont: {
                size: 20, // Aumenta el tamaño de la fuente de los valores del eje X
                color: '#ffffff', // Mantiene el color blanco
              },
            },
            hoverinfo: 'none', // Desactiva el hover para el mapa de contornos
          },
          {
            x: plotData.scatterPoints.x,
            y: plotData.scatterPoints.y,
            mode: "markers", // Scatter con marcadores
            type: "scatter",
            marker: {
              symbol: "arrow", // Usamos un triángulo apuntando hacia arriba
              color: "#ffffff", // Color de los marcadores
              size: 25, // Tamaño de los marcadores
              angle: plotData.scatterPoints.direction, // Usamos el valor de dirección como ángulo
            },
            name: "Dirección del Viento", // Nombre del trazo
          },
        ]}
        layout={{
          width: 1800,
          height: 700,
          paper_bgcolor: '#1F1F1F',
          plot_bgcolor: '#1F1F1F',
          font: {
            color: '#ffffff',
            weight: 'bold',
            family: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          },
          title: {
            text: "Velocidad del Viento",
            font: {
              size: 24,
              color: '#ffffff',
            },
          },
          margin: { l: 80, r: 80, t: 60, b: 60 },
          xaxis: {
            title: {
              text: "Tiempo (misiones)",
              font: {
                size: 20,
                color: '#ffffff',
              },
              standoff: 25,
            },
            tickfont: {
              size: 20,
              color: '#ffffff',
            },
          },
          yaxis: {
            title: {
              text: "Altura (m)",
              font: {
                size: 20,
                color: '#ffffff',
              },
              standoff: 25,
            },
            tickfont: {
              size: 20,
              color: '#ffffff',
            },
          },
        }}
      />
    </div>
  );
};

export default WindContourPlot;