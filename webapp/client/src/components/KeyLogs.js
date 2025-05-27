import React, { useState, useEffect } from 'react';
import { Table, Card, Spinner, Alert, Form, Pagination } from 'react-bootstrap';
import axios from 'axios';

const KeyLogs = ({ selectedDate }) => {
  const [keylogs, setKeylogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);

  useEffect(() => {
    const fetchKeylogs = async () => {
      if (!selectedDate) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/keylogs/${selectedDate}`);
        setKeylogs(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching keylogs:', err);
        setError('Failed to load keyboard logs');
        setLoading(false);
      }
    };

    fetchKeylogs();
  }, [selectedDate]);

  // Filter keylogs based on search term
  const filteredKeylogs = keylogs.filter(log => 
    log.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredKeylogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredKeylogs.length / itemsPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (!selectedDate) {
    return (
      <Alert variant="info">
        Please select a date to view keyboard logs.
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

  if (keylogs.length === 0) {
    return (
      <Alert variant="warning">
        No keyboard logs found for {selectedDate}.
      </Alert>
    );
  }

  return (
    <div>
      <h2 className="mb-4">Keyboard Logs for {selectedDate}</h2>
      <p>Total keystrokes: {keylogs.length}</p>
      
      <Card className="mb-4">
        <Card.Body>
          <Form.Group>
            <Form.Label>Search by key:</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter key to search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
            />
          </Form.Group>
        </Card.Body>
      </Card>
      
      <Table striped bordered hover responsive className="keylog-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Time</th>
            <th>Key</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((log, index) => (
            <tr key={log.id}>
              <td>{indexOfFirstItem + index + 1}</td>
              <td>{log.time}</td>
              <td>{log.key}</td>
              <td>{log.state}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      
      {totalPages > 1 && (
        <Pagination className="justify-content-center">
          <Pagination.First 
            onClick={() => paginate(1)} 
            disabled={currentPage === 1}
          />
          <Pagination.Prev 
            onClick={() => paginate(currentPage - 1)} 
            disabled={currentPage === 1}
          />
          
          {[...Array(totalPages).keys()].map(number => {
            // Show only a window of pages around current page
            if (
              number + 1 === 1 || 
              number + 1 === totalPages || 
              (number + 1 >= currentPage - 2 && number + 1 <= currentPage + 2)
            ) {
              return (
                <Pagination.Item
                  key={number + 1}
                  active={number + 1 === currentPage}
                  onClick={() => paginate(number + 1)}
                >
                  {number + 1}
                </Pagination.Item>
              );
            } else if (
              number + 1 === currentPage - 3 || 
              number + 1 === currentPage + 3
            ) {
              return <Pagination.Ellipsis key={number + 1} />;
            }
            return null;
          })}
          
          <Pagination.Next 
            onClick={() => paginate(currentPage + 1)} 
            disabled={currentPage === totalPages}
          />
          <Pagination.Last 
            onClick={() => paginate(totalPages)} 
            disabled={currentPage === totalPages}
          />
        </Pagination>
      )}
    </div>
  );
};

export default KeyLogs;
