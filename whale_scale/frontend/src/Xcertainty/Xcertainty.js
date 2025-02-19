import './Xcertainty.css';
import React from 'react';

const Xcertainty = ({toggleToXcertainty, toggleToMeasure}) => {
    return (
        <div className="xcertainty">
            <button className="toggle" onClick={toggleToMeasure}>Switch to Measure</button>
            <button className="toggle" onClick={toggleToXcertainty}>Switch to Xcertainty</button>
            <p>Xcertainty</p>
        </div>
    );
}

export default Xcertainty;