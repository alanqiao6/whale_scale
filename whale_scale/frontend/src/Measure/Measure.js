import './Measure.css';
import React from 'react';

const Measure = ({ toggleToXcertainty, toggleToMeasure}) => {
    return (
        <div className="measure">
            <button className="toggle" onClick={toggleToMeasure}>Switch to Measure</button>
            <button className="toggle" onClick={toggleToXcertainty}>Switch to Xcertainty</button>
            <p>Measure</p>
        </div>
    );
}

export default Measure;