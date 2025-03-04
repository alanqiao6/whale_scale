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

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <TopBar activeTab={activeTab} setActiveTab={setActiveTab} />
        <ImageViewer />
        <Data />
      </div>
    </div>
  )
}


