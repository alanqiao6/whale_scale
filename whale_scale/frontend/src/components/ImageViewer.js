import "./ImageViewer.css";
import React, { useState } from "react";

export default function ImageViewer({ image, onImageUpload }) {

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      onImageUpload(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      onImageUpload(file);
    }
  };

  return (
    <div className="image-container" onDragOver={handleDragOver} onDrop={handleDrop}>
      <label htmlFor="image-upload" className="upload-label">
        <input type="file" id="image-upload" accept="image/*" onChange={handleImageUpload} hidden />
        <div className="upload-area">
          <img
            src={image || "https://png.pngtree.com/png-clipart/20221117/ourmid/pngtree-cute-cartoon-whale-png-image_6461281.png"}  // cartoon whale
            alt="Cartoon Whale"
            className="upload-placeholder"
          />

          {/* Second Image Right Below the Whale */}
          <img
            src="https://static-00.iconduck.com/assets.00/upload-icon-2048x2048-eu9n5hco.png" // upload image
            alt="Upload image"
            className="second-image"
          />
          {!image && <p className="upload-text">Upload image here or drag file here</p>}
        </div>
      </label>
    </div>
  );
}
