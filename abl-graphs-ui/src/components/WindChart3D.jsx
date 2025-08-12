import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import * as d3 from "d3";

// Estilos del contenedor principal
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

const titleStyle = {
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  fontSize: '3em',
  fontWeight: 'bold',
  color: '#636efa',
  marginBottom: '20px',
};

// Función de interpolación
const interpolateTriangle = (points, density = 10) => {
  const [p1, p2, p3] = points;
  const results = [];

  for (let i = 0; i <= density; i++) {
    for (let j = 0; j <= density - i; j++) {
      const a = i / density;
      const b = j / density;
      const c = 1 - a - b;
      const x = a * p1.x + b * p2.x + c * p3.x;
      const y = a * p1.y + b * p2.y + c * p3.y;
      const velocity = a * p1.velocity + b * p2.velocity + c * p3.velocity;
      results.push({ x, y, z: p1.height, velocity });
    }
  }
  return results;
};

const WindIsosurface3Drones = () => {
  const [traces, setTraces] = useState([]);

  useEffect(() => {
    d3.csv("/wind_isosurface_data.csv", (d) => ({
      drone: +d.drone,
      x: +d.x,
      y: +d.y,
      height: +d.height,
      velocity: +d.velocity,
    })).then((data) => {
      const heights = [...new Set(data.map((d) => d.height))].sort(
        (a, b) => a - b
      );
      const newTraces = [];
      let minVelocity = d3.min(data, (p) => p.velocity);
      let maxVelocity = d3.max(data, (p) => p.velocity);

      // Ajusta la escala de colores globalmente
      const colorscale = "Viridis";

      heights.forEach((h, index) => {
        const layerPoints = data.filter((d) => d.height === h);
        if (layerPoints.length === 3) {
          const interpolated = interpolateTriangle(layerPoints, 20);
          newTraces.push({
            type: "mesh3d",
            x: interpolated.map((p) => p.x),
            y: interpolated.map((p) => p.y),
            z: interpolated.map((p) => p.z),
            intensity: interpolated.map((p) => p.velocity),
            colorscale: colorscale,
            cmin: minVelocity,
            cmax: maxVelocity,
            opacity: 0.5,
            // La barra de colores solo se muestra en la primera traza
            showscale: index === 0,
            colorbar: {
                title: { text: "Velocidad (m/s)", side: "right", font: { size: 20, weight: "bold" } },
                titleside: "right",
                tickfont: { color: "#ffffff", weight: "bold" },
                x: 1, // Posición de la barra de colores
                y: 0.5, // Centrado verticalmente
                len: 0.7, // Longitud de la barra de colores
            },
          });
        }
      });

      setTraces(newTraces);
    });
  }, []);

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Volumen Atmosférico</h2>
      <Plot
        data={traces}
        layout={{
          width: 1200,
          height: 800,
          title: {
            text: "Velocidad del Viento",
            font: { size: 24, color: "#ffffff", weight: "bold" },
            x: 0.5,
            xanchor: "center",
          },
          scene: {
            xaxis: {
              title: { text: "X (m)", font: { color: "#fff", size: 20, weight: "bold" } },
              tickfont: { color: "#fff" },
              gridcolor: "#5c6068",
            },
            yaxis: {
              title: { text: "Y (m)", font: { color: "#fff", size: 20, weight: "bold" } },
              tickfont: { color: "#fff" },
              gridcolor: "#5c6068",
            },
            zaxis: {
              title: { text: "Altura (m)", font: { color: "#fff", size: 20, weight: "bold" } },
              tickfont: { color: "#fff" },
              gridcolor: "#5c6068",
            },
            camera: {
              eye: { x: 1.5, y: 1.5, z: 1.5 },
              center: { x: 0, y: 0, z: 0 },
            },
          },
          paper_bgcolor: "#1F1F1F",
          plot_bgcolor: "#1F1F1F",
          font: { color: "#fff" },
          margin: { l: 0, r: 0, t: 80, b: 0 },
        }}
      />
    </div>
  );
};

export default WindIsosurface3Drones;