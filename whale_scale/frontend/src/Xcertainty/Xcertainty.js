import './Xcertainty.css';
import React from 'react';
import XcertDrawing from '../Images/xcertainty_placeholder.png';


const Xcertainty = ({toggleToXcertainty, toggleToMeasure}) => {
    return (
        <div className="xcertainty">
            <button className="toggle" onClick={toggleToMeasure}>Switch to Measure</button>
            <button className="toggle" onClick={toggleToXcertainty}>Switch to Xcertainty</button>
            <p>Xcertainty</p>
            <img src={XcertDrawing} alt="Temporary Xcertainty" className="xcert-image" />
        </div>
    );
}

export default Xcertainty;