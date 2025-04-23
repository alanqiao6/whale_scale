import React, { useEffect, useState } from "react";
import { CSVLink } from "react-csv";
import "../App.css";

export default function Data({ onSelectedDataChange }) {
  const [results, setResults] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [editedResults, setEditedResults] = useState({});
  const [bodyConditions, setBodyConditions] = useState([]);
  const [selectedBCRows, setSelectedBCRows] = useState([]);

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

  const defaultColumns = [
    "subject_name",
    "id",
    "measurement_type",
    "user_image_path",
    "scaled_dimension",
    "pixel_count",
    "pixel_dimension"
  ];

  useEffect(() => {
    fetch("/api/measurements/", {
      method: "GET",
      credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => {
        setResults(data);
        if (data.length > 0) {
          const allKeys = Object.keys(data[0]);
          const filtered = defaultColumns.filter(col => allKeys.includes(col));
          setSelectedColumns(filtered);
        }
      })
      .catch((error) => {
        console.error("Error fetching measurement data:", error);
      });
  
    fetch("/api/body_conditions/", {
      method: "GET",
      credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => setBodyConditions(data))
      .catch((error) => console.error("Error fetching body condition data:", error));
  }, []);

  useEffect(() => {
    const selected = selectedRows.map(index => ({
      ...results[index],
      ...(editedResults[index] || {})
    }));
    onSelectedDataChange(selected);
  }, [selectedRows, editedResults, results, onSelectedDataChange]);

  if (!results || results.length === 0) {
    return (
      <div className="app-container">
        <div className="main-content">
          <p>No measurements yet.</p>
        </div>
      </div>
    );
  }

  const handleInputChange = (index, key, value) => {
    setEditedResults(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      const csrftoken = getCookie("csrftoken") || getCookie("dev_csrftoken") || getCookie("prod_csrftoken");
      const updates = Object.entries(editedResults);

      for (const [index, updatesForRow] of updates) {
        const rowId = results[index].id;
        const updatedRow = { ...results[index], ...updatesForRow };

        await fetch(`/api/measurements/`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken
          },
          body: JSON.stringify(updatedRow)
        });
      }

      // Refresh data after save
      const updated = results.map((row, index) => ({
        ...row,
        ...(editedResults[index] || {})
      }));
      setResults(updated);
      setEditedResults({});
      alert("Changes saved successfully.");
    } catch (error) {
      console.error("Failed to save changes:", error);
    }
  };

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

  const handleBCDelete = async () => {
    if (selectedBCRows.length === 0) {
      alert("No body condition rows selected for deletion.");
      return;
    }

    const idsToDelete = selectedBCRows.map(index => bodyConditions[index].id);

    try {
      const csrftoken = getCookie("csrftoken") || getCookie("dev_csrftoken") || getCookie("prod_csrftoken");
      const response = await fetch("/api/body_conditions/", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      if (!response.ok) throw new Error("Delete request failed");

      setBodyConditions(prev => prev.filter(bc => !idsToDelete.includes(bc.id)));
      setSelectedBCRows([]);
    } catch (error) {
      console.error("Error deleting body condition rows:", error);
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
            <button onClick={handleSave} style={{ marginLeft: 10 }}>Save Changes</button>
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
                    <td key={col} style={{ maxWidth: 180, border: "1px solid #ccc", padding: "4px" }}>
                      {col === "id" ? (
                        <span>{row[col]}</span>
                      ) : (
                        <input
                          type="text"
                          value={editedResults[index]?.[col] ?? row[col] ?? ""}
                          onChange={(e) => handleInputChange(index, col, e.target.value)}
                          style={{ width: "100%", border: "none", background: "transparent" }}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

        {/* Body Condition Table */}
        <h2 style={{ marginTop: "40px" }}>Body Condition Table</h2>
        {bodyConditions.length === 0 ? (
          <p>No body condition entries yet.</p>
        ) : (
          <div style={{ overflowX: "auto", margin: "0 0", maxWidth: "90%" }}>
            <table className="data-table" style={{ tableLayout: "auto", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Image</th>
                  <th>Surface Area</th>
                  <th>Volume</th>
                  <th>BAI</th>
                  <th>Increment</th>
                  <th>Measurement IDs</th>
                </tr>
              </thead>
              <tbody>
                {bodyConditions.map((row, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedBCRows.includes(index)}
                        onChange={() =>
                          setSelectedBCRows(prev =>
                            prev.includes(index)
                              ? prev.filter(i => i !== index)
                              : [...prev, index]
                          )
                        }
                      />
                    </td>
                    <td>{row.image}</td>
                    <td>{row.surface_area.toFixed(3)}</td>
                    <td>{row.body_volume.toFixed(3)}</td>
                    <td>{row.body_area_index.toFixed(2)}</td>
                    <td>{row.increment}</td>
                    <td>{row.measurement_ids.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleBCDelete} style={{ marginTop: 10 }}>Delete Selected Body Condition Rows</button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
