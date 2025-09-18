import React, { useState } from 'react';

const App = () => {
  const [status, setStatus] = useState('');

  // Function to handle button click and make the GET request to the Flask API
  const checkDbHealth = async () => {
    setStatus('checking');

    try {
      const response = await fetch('http://localhost:5000/api/db/health');
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  // Define button styles based on status
  const getButtonStyle = () => {
    if (status === 'checking') {
      return { backgroundColor: 'blue', color: 'white' };
    }
    if (status === 'success') {
      return { backgroundColor: 'green', color: 'white' };
    }
    if (status === 'error') {
      return { backgroundColor: 'red', color: 'white' };
    }
    return { backgroundColor: 'gray', color: 'white' }; // Default
  };

  return (
    <div>
      <button onClick={checkDbHealth} style={getButtonStyle()} disabled={status === 'checking'}>
        {status === 'checking' ? 'Checking...' : 'Check DB Health'}
      </button>
    </div>
  );
};

export default App;
