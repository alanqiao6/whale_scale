import React, { useEffect, useState } from "react";
import "./Data.css";

export default function Data() {
  // State to store the fetched user credentials
  const [userCredentials, setUserCredentials] = useState([]);

  // useEffect hook to fetch the data on component mount
  useEffect(() => {
    fetch('http://localhost:8000/api/user_credentials/')
      .then(response => response.json())
      .then(data => {
        console.log(data);
        setUserCredentials(data); // Save the fetched data to state
      })
      .catch(error => console.error('Error fetching user credentials:', error));
  }, []); // Empty dependency array ensures it runs once when the component is mounted

  return (
    <div className="data-section">
      <h2>Data</h2>
      <div className="data-content">
        {userCredentials.length > 0 ? (
          <ul>
            {userCredentials.map((user, index) => (
              <li key={index}>
                Info: {user.username} {user.data}
              </li>
            ))}
          </ul>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </div>
  );
}
