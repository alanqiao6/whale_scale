// HelpModal.js
import React, { useState, useEffect } from "react"
import "./HelpModal.css"

export default function HelpModal({ isOpen, onClose, mode = "docs", setHelpMode }) {
  const [step, setStep] = useState(0)
  const [internalIsOpen, setInternalIsOpen] = useState(isOpen)
  const [showSidebarDetails, setShowSidebarDetails] = useState(false)

  useEffect(() => {
    if (mode === "onboarding") {
      setInternalIsOpen(true)
    } else {
      setInternalIsOpen(isOpen)
    }
  }, [isOpen, mode])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setInternalIsOpen(false)
      }
    }
  
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  if (!internalIsOpen) return null

  const steps = [
    {
      title: "1. 📄 Upload an Image",
      text: "Click the 'Add Image' button on the sidebar/cartoon whale or upload a file directly to the cartoon whale to upload your image.",
    },
    {
      title: "2. 🔧 Set Width Segments + Fill in Sidebar",
      text: (
        <>
          Once a picture is uploaded, the sidebar should automatically update with metadata pulled from the image. Check fields and update if any values look wrong or are missing.<br /><br />
          <strong>Adjust <code># Width Segments</code></strong> to control how many cross-section measurements are generated along the spine.<br /><br />
          <button className="help-controls-button" onClick={() => setShowSidebarDetails(prev => !prev)}>
            {showSidebarDetails ? "Hide Sidebar Field Definitions" : "Show Sidebar Field Definitions"}
          </button>
          {showSidebarDetails && (
            <ul style={{ paddingLeft: "20px" }}>
              <li><strong>Altitude</strong>: Drone height when the image was taken (in meters).</li>
              <li><strong>Altitude Offset</strong>: Manual adjustment added to altitude for calibration.</li>
              <li><strong>Image Width</strong>: Width of the image in pixels.</li>
              <li><strong>Image Height</strong>: Height of the image in pixels.</li>
              <li><strong>Focal Length</strong>: Camera lens focal length (in mm).</li>
              <li><strong>Field of View</strong>: Camera field of view angle (in degrees).</li>
              <li><strong>Sensor Width</strong>: Physical width of the camera’s sensor (in mm).</li>
              <li><strong># Width Segments</strong>: Number of evenly spaced width cross-sections generated along the whale's spine.</li>
              <li><strong>Crosshair Size</strong>: Pixel diameter of crosshairs used to mark width points.</li>
              <li><strong>Crosshair Opacity</strong>: Transparency level of the crosshairs on the image.</li>
            </ul>
          )}
        </>
      )
    },
    {
      title: "3. Submit",
      text: "Submit the sidebar info!",
    },
    {
      title: "4. 📏 Use the Ruler Tool",
      text: "Click the 📏 tool in the top bar, then click two points on the image to define the main line. Move the crosshairs to the sides of the whale, then click finalize.",
    },
    {
      title: "5. 📐 Other Tools",
      text: "Use ✏️ to draw curves by clicking points, 🔲 to measure areas by clicking points outlining an area, and 📐 to measure angles using 3 points.",
    },
    {
      title: "6. ✅ Finalize & Export",
      text: "Once you finish a measurement, finalize it and export your results from the sidebar.",
    },
  ]

  return (
    <div className="help-modal-overlay">
      <div className="help-modal">
        {mode === "onboarding" ? (
          <>
            <h2>{steps[step].title}</h2>
            <div className="help-step-text">{steps[step].text}</div>
            <div className="help-controls">
              <button disabled={step === 0} onClick={() => setStep(s => s - 1)}>← Back</button>
              <button onClick={() => setInternalIsOpen(false)}>Close</button>
              <button disabled={step === steps.length - 1} onClick={() => setStep(s => s + 1)}>Next →</button>
            </div>
          </>
        ) : (
          <>
            <h2>📘 How to Use WhaleScale</h2>
            <ul className="help-list">
              {steps.map((s, idx) => (
                <li key={idx}><strong>{s.title}</strong>: <div className="help-step-text">{s.text}</div></li>
              ))}
            </ul>
            <div className="help-controls">
              {setHelpMode && <button onClick={() => {
                setHelpMode("onboarding")
                onClose()
              }}>Restart Tutorial</button>}
              <button onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
