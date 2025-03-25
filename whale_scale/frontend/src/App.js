"use client";
import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import ImageViewer from "./components/ImageViewer";
import Data from "./components/Data";
import * as exifr from "exifr"; // Import EXIF reader
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("measure");
  const [image, setImage] = useState(null);
  const [metadata, setMetadata] = useState({ focalLength: "", altitude: "" });

  const handleImageUpload = async (file) => {
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);

      // Extract metadata using exifr
      try {
        const exifData = await exifr.parse(file);
        console.log("Extracted Metadata:", exifData);

        setMetadata({
          focalLength: exifData?.FocalLength || "",
          altitude: exifData?.GPSAltitude || "",
        });

      } catch (error) {
        console.error("Error extracting metadata:", error);
      }
    }
  };

  return (
    <div className="app-container">
      <Sidebar metadata={metadata} onImageUpload={handleImageUpload} />
      <div className="main-content">
        <TopBar activeTab={activeTab} setActiveTab={setActiveTab} />
        <ImageViewer image={image} onImageUpload={handleImageUpload} />
        <Data />
      </div>
    </div>
  );
}

