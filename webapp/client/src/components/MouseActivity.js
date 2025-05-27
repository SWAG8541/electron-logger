import React, { useState, useEffect } from 'react';
import { Card, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const MouseActivity = ({ selectedDate }) => {
  const [mouseData, setMouseData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMouseActivity = async () => {
      if (!selectedDate) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/mouse/${selectedDate}`);
        setMouseData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching mouse activity:', err);
        setError('Failed to load mouse activity data');
        setLoading(false);
      }
    };

    fetchMouseActivity();
  }, [selectedDate]);

  // Prepare chart data
  const prepareChartData = () => {
    // Sample data at regular intervals to avoid overwhelming the chart
    const sampledData = mouseData.filter((_, index) => index % 10 === 0);
    
    const labels = sampledData.map(data => data.time);
    
    const xData = {
      labels,
      datasets: [
        {
          label: 'X Position',
          data: sampledData.map(data => data.x),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        },
      ],
    };
    
    const yData = {
      labels,
      datasets: [
        {
          label: 'Y Position',
          data: sampledData.map(data => data.y),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        },
      ],
    };
    
    return { xData, yData };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Mouse Movement Over Time',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (!selectedDate) {
    return (
      <Alert variant="info">
        Please select a date to view mouse activity.
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

  if (mouseData.length === 0) {
    return (
      <Alert variant="warning">
        No mouse activity found for {selectedDate}.
      </Alert>
    );
  }

  const { xData, yData } = prepareChartData();

  return (
    <div>
      <h2 className="mb-4">Mouse Activity for {selectedDate}</h2>
      <p>Total mouse movements recorded: {mouseData.length}</p>
      
      <Row>
        <Col md={12}>
          <Card className="mb-4">
            <Card.Header>X Position Over Time</Card.Header>
            <Card.Body>
              <div className="mouse-activity-chart">
                <Line options={chartOptions} data={xData} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={12}>
          <Card className="mb-4">
            <Card.Header>Y Position Over Time</Card.Header>
            <Card.Body>
              <div className="mouse-activity-chart">
                <Line options={chartOptions} data={yData} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Card>
        <Card.Header>Activity Heatmap</Card.Header>
        <Card.Body>
          <p className="text-center">
            A heatmap visualization would be displayed here, showing the areas of the screen
            where the mouse was most active.
          </p>
        </Card.Body>
      </Card>
    </div>
  );
};

export default MouseActivity;
