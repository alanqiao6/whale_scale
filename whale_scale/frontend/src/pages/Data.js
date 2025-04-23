import React, { useEffect, useState } from "react";
import { CSVLink } from "react-csv";
import axios from "axios";
import "../App.css";

export default function Data() {
  const [results, setResults] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);

  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

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

  const handleDelete = async () => {
    if (selectedRows.length === 0) {
      alert("No rows selected for deletion.");
      return;
    }
  
    const idsToDelete = selectedRows.map(index => results[index].id);
  
    try {
      const csrftoken = getCookie("csrftoken") || getCookie("dev_csrftoken") || getCookie("prod_csrftoken");
  
      const response = await fetch("/api/measurements/", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        body: JSON.stringify({ ids: idsToDelete }),
      });
  
      if (!response.ok) {
        throw new Error("Delete request failed");
      }
  
      const deletedIds = await response.json();
  
      // Filter out deleted rows from local state
      const remaining = results.filter((item) => !idsToDelete.includes(item.id));
      setResults(remaining);
      setSelectedRows([]);
  
      console.log("Deleted:", deletedIds);
    } catch (error) {
      console.error("Error deleting measurements:", error);
    }
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
        <div className="controls" style={{ textAlign: "left" }}>
          <h3>Column Selector</h3>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "left", maxWidth: "90%", margin: "0 auto" }}>
            {Object.keys(results[0]).map((key, index) => (
              <label
                key={key}
                style={{ margin: "4px 2px", width: `${100 / 10}%` }} // Roughly 10 columns per row = 3 rows
              >
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(key)}
                  onChange={() => handleColumnToggle(key)}
                />
                {key}
              </label>
            ))}
          </div>
          <div style={{ marginTop: 20, marginBottom: 20 }}>
            <CSVLink data={csvData} headers={headers} filename="selected_measurements.csv">
              <button>Export Selected to CSV</button>
            </CSVLink>
            <button onClick={handleDelete} style={{ marginLeft: 10 }}>Delete Selected</button>
          </div>
        </div>

        <div style={{ overflowX: "auto", margin: "0 0", maxWidth: "90%" }}>
          <table className="data-table" style={{ tableLayout: "auto", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>Select</th>
                {selectedColumns.map((col) => (
                  <th key={col} style={{ whiteSpace: "nowrap", padding: "4px", border: "1px solid #ccc" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((row, index) => (
                <tr key={index}>
                  <td style={{ textAlign: "center", border: "1px solid #ccc" }}>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(index)}
                      onChange={() => handleRowSelect(index)}
                    />
                  </td>
                  {selectedColumns.map((col) => (
                    <td key={col} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: "1px solid #ccc", padding: "0px" }}>
                      {col === "coordinate_data"
                        ? JSON.stringify(row[col]).slice(0, 100) + "…"
                        : typeof row[col] === "object" && row[col] !== null
                        ? JSON.stringify(row[col]).slice(0, 100) + "…"
                        : row[col] ?? "None"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
