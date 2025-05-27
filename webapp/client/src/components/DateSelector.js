import React from 'react';
import { Form, Card, Spinner } from 'react-bootstrap';

const DateSelector = ({ dates, selectedDate, onDateChange, loading }) => {
  if (loading) {
    return (
      <Card>
        <Card.Body className="d-flex justify-content-center align-items-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <span className="ms-2">Loading dates...</span>
        </Card.Body>
      </Card>
    );
  }

  if (dates.length === 0) {
    return (
      <Card>
        <Card.Body>
          <p className="text-center mb-0">No activity data available.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Body>
        <Form.Group>
          <Form.Label>Select Date:</Form.Label>
          <Form.Select 
            value={selectedDate} 
            onChange={(e) => onDateChange(e.target.value)}
          >
            {dates.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </Card.Body>
    </Card>
  );
};

export default DateSelector;
