import React, { useEffect, useState } from "react";
import { CSVLink } from "react-csv";
import axios from "axios";
import "../App.css";

export default function Data() {
  const [results, setResults] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);

  useEffect(() => {
    axios.get("/api/measurements/")
      .then(response => {
        setResults(response.data);
        if (response.data.length > 0) {
          setSelectedColumns(Object.keys(response.data[0]));
        }
      })
      .catch(error => {
        console.error("Error fetching measurement data:", error);
      });
  }, []);

  if (!results || results.length === 0) {
    return (
      <div className="app-container">
        <div className="main-content">
          <p>No measurements yet.</p>
        </div>
      </div>
    );
  }

  const handleRowSelect = (index) => {
    setSelectedRows((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleColumnToggle = (key) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((col) => col !== key) : [...prev, key]
    );
  };

  const handleDelete = () => {
    alert("Simulated deletion. Connect to backend to persist changes.");
  };

  const headers = selectedColumns.map((col) => ({ label: col, key: col }));
  const csvData = selectedRows.map((index) => {
    const row = results[index];
    return Object.fromEntries(
      selectedColumns.map((col) => [col, row[col] ?? "None"])
    );
  });

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="controls">
          <h3>Column Selector</h3>
          {Object.keys(results[0]).map((key) => (
            <label key={key} style={{ marginRight: 10 }}>
              <input
                type="checkbox"
                checked={selectedColumns.includes(key)}
                onChange={() => handleColumnToggle(key)}
              />
              {key}
            </label>
          ))}
          <div style={{ marginTop: 10 }}>
            <CSVLink data={csvData} headers={headers} filename="selected_measurements.csv">
              <button>Export Selected to CSV</button>
            </CSVLink>
            <button onClick={handleDelete} style={{ marginLeft: 10 }}>Delete Selected</button>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Select</th>
              {selectedColumns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row, index) => (
              <tr key={index}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(index)}
                    onChange={() => handleRowSelect(index)}
                  />
                </td>
                {selectedColumns.map((col) => (
                  <td key={col}>{row[col] ?? "None"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}