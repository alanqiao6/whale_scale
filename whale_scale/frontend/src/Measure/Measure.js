import './Measure.css';
import React from 'react';

const Measure = ({ toggleToXcertainty, toggleToMeasure}) => {
    return (
        <div className="measure">
            <button onClick={toggleToMeasure}>Switch to Measure</button>
            <button onClick={toggleToXcertainty}>Switch to Xcertainty</button>
            <p>Measure</p>
        </div>
    );
}

export default Measure;