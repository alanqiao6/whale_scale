import './Xcertainty.css';
import React from 'react';

const Xcertainty = ({toggleToXcertainty, toggleToMeasure}) => {
    return (
        <div className="xcertainty">
            <button onClick={toggleToMeasure}>Switch to Measure</button>
            <button onClick={toggleToXcertainty}>Switch to Xcertainty</button>
            <p>Xcertainty</p>
        </div>
    );
}

export default Xcertainty;