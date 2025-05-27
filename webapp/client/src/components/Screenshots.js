import React, { useState, useEffect } from 'react';
import { Card, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';

const Screenshots = ({ selectedDate }) => {
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchScreenshots = async () => {
      if (!selectedDate) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/screenshots/${selectedDate}`);
        setScreenshots(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching screenshots:', err);
        setError('Failed to load screenshots');
        setLoading(false);
      }
    };

    fetchScreenshots();
  }, [selectedDate]);

  if (!selectedDate) {
    return (
      <Alert variant="info">
        Please select a date to view screenshots.
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        {error}
      </Alert>
    );
  }

  if (screenshots.length === 0) {
    return (
      <Alert variant="warning">
        No screenshots found for {selectedDate}.
      </Alert>
    );
  }

  return (
    <div>
      <h2 className="mb-4">Screenshots for {selectedDate}</h2>
      <p>Total screenshots: {screenshots.length}</p>
      
      {screenshots.map((screenshot) => (
        <div key={screenshot.id} className="screenshot-container mb-4">
          <div className="screenshot-header">
            <strong>Time: {screenshot.time}</strong>
          </div>
          <img 
            src={`data:image/png;base64,${screenshot.image}`} 
            alt={`Screenshot at ${screenshot.time}`} 
            className="screenshot-image"
          />
        </div>
      ))}
    </div>
  );
};

export default Screenshots;
