import logo from './logo.svg';
import './App.css';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
    const [message, setMessage] = useState("");

    useEffect(() => {
    axios.get('/home/')
        .then(response => {
            setMessage(response.data.message || "No message received");
        })
        .catch(error => console.error(error));
    }, []);

    return <h1>{message}</h1>;
}

export default App;