import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { Container, Row, Col, Navbar, Nav } from 'react-bootstrap';
import Dashboard from './components/Dashboard';
import Screenshots from './components/Screenshots';
import KeyLogs from './components/KeyLogs';
import MouseActivity from './components/MouseActivity';
import DateSelector from './components/DateSelector';
import './App.css';

function App() {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch available dates
    const fetchDates = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/dates');
        setDates(response.data);
        
        // Set the most recent date as selected
        if (response.data.length > 0) {
          setSelectedDate(response.data[0]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dates:', error);
        setLoading(false);
      }
    };

    fetchDates();
  }, []);

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  return (
    <Router>
      <div className="App">
        <Navbar bg="dark" variant="dark" expand="lg">
          <Container>
            <Navbar.Brand href="/">Activity Logger Dashboard</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                <Nav.Link href="/">Dashboard</Nav.Link>
                <Nav.Link href="/screenshots">Screenshots</Nav.Link>
                <Nav.Link href="/keylogs">Key Logs</Nav.Link>
                <Nav.Link href="/mouse">Mouse Activity</Nav.Link>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <Container className="mt-4">
          <Row className="mb-4">
            <Col>
              <DateSelector 
                dates={dates} 
                selectedDate={selectedDate} 
                onDateChange={handleDateChange} 
                loading={loading}
              />
            </Col>
          </Row>

          <Routes>
            <Route 
              path="/" 
              element={<Dashboard selectedDate={selectedDate} />} 
            />
            <Route 
              path="/screenshots" 
              element={<Screenshots selectedDate={selectedDate} />} 
            />
            <Route 
              path="/keylogs" 
              element={<KeyLogs selectedDate={selectedDate} />} 
            />
            <Route 
              path="/mouse" 
              element={<MouseActivity selectedDate={selectedDate} />} 
            />
          </Routes>
        </Container>
      </div>
    </Router>
  );
}

export default App;
