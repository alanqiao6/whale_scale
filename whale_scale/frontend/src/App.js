import logo from './logo.svg';
import './App.css';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import Data from './Data';

function App() {
    const [message, setMessage] = useState("");

    useEffect(() => {
    axios.get('/home/')
        .then(response => {
            setMessage(response.data.message || "No message received");
        })
        .catch(error => console.error(error));
    }, []);

    return (
        <div className="app-container">
            <Navbar /> {/* Learned how to create different components here: https://www.youtube.com/watch?v=0sSYmRImgRY */}
            <Data /> 
            <div className="content">
                <h1>{message}</h1> 
                <p>temporary content</p>
            </div>
        </div>
    )
}

export default App;