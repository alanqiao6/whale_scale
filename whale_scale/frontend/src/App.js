import logo from './logo.svg';
import './App.css';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import Data from './Data';
import Xcertainty from './Xcertainty';
import Measure from './Measure';

function App() {
    const [message, setMessage] = useState("");
    const [isMeasureVisible, setIsMeasureVisible] = useState(true); 

    useEffect(() => {
    axios.get('/home/')
        .then(response => {
            setMessage(response.data.message || "No message received");
        })
        .catch(error => console.error(error));
    }, []);

    const toggleToMeasure = () => {
        setIsMeasureVisible(true);
    };

    const toggleToXcertainty = () => {
        setIsMeasureVisible(false); 
    };
    return (
        <div className="app-container">
            <Navbar /> {/* Learned how to create different components here: https://www.youtube.com/watch?v=0sSYmRImgRY */}
            <Data /> 
            <div className="toggle-buttons">
                <button onClick={toggleToMeasure}>Show Measure</button>
                <button onClick={toggleToXcertainty}>Show Xcertainty</button>
            </div>

            {isMeasureVisible ? 
                <Measure toggleToXcertainty={toggleToXcertainty} /> : 
                <Xcertainty toggleToMeasure={toggleToMeasure} />}
            {/*<div className="content">
                <h1>{message}</h1> 
                <p>temporary content</p>
            </div> */}
        </div>
    )
}

export default App;