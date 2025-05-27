import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner } from 'react-bootstrap';
import axios from 'axios';
import moment from 'moment';

const Dashboard = ({ selectedDate }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!selectedDate) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/summary/${selectedDate}`);
        setSummary(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching summary:', err);
        setError('Failed to load activity summary');
        setLoading(false);
      }
    };

    fetchSummary();
  }, [selectedDate]);

  if (!selectedDate) {
    return (
      <Card>
        <Card.Body>
          <p className="text-center">Please select a date to view activity summary.</p>
        </Card.Body>
      </Card>
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
      <Card className="text-center text-danger">
        <Card.Body>
          <p>{error}</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="mb-4">Activity Summary for {selectedDate}</h2>
      
      <Row>
        <Col md={4}>
          <Card className="summary-card">
            <Card.Header>Screenshots</Card.Header>
            <Card.Body>
              <h3>{summary.screenshotCount}</h3>
              <p>Total screenshots captured</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="summary-card">
            <Card.Header>Keystrokes</Card.Header>
            <Card.Body>
              <h3>{summary.keystrokeCount}</h3>
              <p>Total keystrokes recorded</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="summary-card">
            <Card.Header>Mouse Movements</Card.Header>
            <Card.Body>
              <h3>{summary.mouseMovementCount}</h3>
              <p>Total mouse positions recorded</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mt-4">
        <Col md={6}>
          <Card className="summary-card">
            <Card.Header>Activity Period</Card.Header>
            <Card.Body>
              {summary.startTime && summary.endTime ? (
                <>
                  <p>
                    <strong>Start Time:</strong> {moment(summary.startTime).format('HH:mm:ss')}
                  </p>
                  <p>
                    <strong>End Time:</strong> {moment(summary.endTime).format('HH:mm:ss')}
                  </p>
                  <p>
                    <strong>Duration:</strong> {summary.activeDuration.toFixed(2)} hours
                  </p>
                </>
              ) : (
                <p>No activity recorded for this date</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="summary-card">
            <Card.Header>Activity Overview</Card.Header>
            <Card.Body>
              <p>
                On {selectedDate}, there were {summary.screenshotCount} screenshots taken at random intervals.
              </p>
              <p>
                {summary.keystrokeCount > 0 
                  ? `A total of ${summary.keystrokeCount} keystrokes were recorded.` 
                  : 'No keyboard activity was recorded.'}
              </p>
              <p>
                {summary.mouseMovementCount > 0 
                  ? `Mouse movement was tracked with ${summary.mouseMovementCount} position records.` 
                  : 'No mouse activity was recorded.'}
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
