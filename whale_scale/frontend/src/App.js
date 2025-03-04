"use client"
import React from 'react';

import { useState } from "react"
import Sidebar from "./components/Sidebar"
import TopBar from "./components/TopBar"
import ImageViewer from "./components/ImageViewer"
import Data from "./components/Data";
import "./App.css"

export default function App() {
  const [activeTab, setActiveTab] = useState("measure")
  const [image, setImage] = useState()
  
  const handleImageUpload = (file) => {
    if (file) {
      setImage(URL.createObjectURL(file));
    }
  };

  return (
    <div className="app-container">
      <Sidebar onImageUpload={handleImageUpload} />
      <div className="main-content">
        <TopBar activeTab={activeTab} setActiveTab={setActiveTab} />
        <ImageViewer image={image} onImageUpload={handleImageUpload} />
        <Data />
      </div>
    </div>
  );
}


