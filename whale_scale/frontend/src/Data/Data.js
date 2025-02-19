import './Data.css'; // Import CSS for styling
import React from 'react';

const Data = ({message}) => {
    return (
        <div className="data">
            <p>{message} - this message is brought to you by our backend</p>
        </div>
    );
}

export default Data;