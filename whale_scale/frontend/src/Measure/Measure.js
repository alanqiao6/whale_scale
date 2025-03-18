import './Measure.css';
import React from 'react';
import whaleDrawing from '../Images/whale_drawing.png';

const Measure = ({ toggleToXcertainty, toggleToMeasure}) => {
    return (
        <div className="measure">
            <button className="toggle" onClick={toggleToMeasure}>Switch to Measure</button>
            <button className="toggle" onClick={toggleToXcertainty}>Switch to Xcertainty</button>
            <p>Measure</p>
            <img src={whaleDrawing} alt="Whale Drawing" className="whale-image" />
        </div>
    );
}

export default Measure;