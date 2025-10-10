import React, { useState, useEffect } from 'react';
import "./DbStatusButton.css"

export default function DbStatusButton({
  endpoint = "http://localhost:5000/api/db/health",
  onStatusChange,
  initialStatus = "default",
}) {
  
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {setStatus(initialStatus);}, [initialStatus]);

  const checkDbHealth = async (e) => {
    e?.preventDefault?.();
    setStatus("checking");

    try {
      const response = await fetch(endpoint);
      await response.json();

      if (response.ok) {
        setStatus("success");
        onStatusChange?.(true);
      } else {
        setStatus("error");
        onStatusChange?.(false);
      }
    } catch (error) {
      setStatus("error");
      onStatusChange?.(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={checkDbHealth}
        className={`db-status-button ${status}`}
        disabled={status === 'checking'}
      >
        {status === 'checking'
          ? 'Conectando...'
          : status === 'success'
          ? '¡Conexión establecida!'
          : status === 'error'
          ? '¡Error de conexión!'
          : 'Verificar conexión'}
      </button>
    </div>
  );
};
