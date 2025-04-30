// File: HelpModal.js
// Author: Alan Qiao
// Purpose: This React component displays an interactive help modal for onboarding and documentation.
// It guides users through the WhaleScale measurement workflow via step-by-step instructions,
// includes keyboard navigation (arrow keys and escape), and supports both modal and list display modes.
// The tutorial dynamically renders sidebar field definitions and toggles visibility for specific sections.





import React, { useState, useEffect } from "react"
import "./HelpModal.css"

export default function HelpModal({ isOpen, onClose, mode = "docs", setHelpMode, setShowHelp }) {
  const [step, setStep] = useState(0)
  const [showSidebarDetails, setShowSidebarDetails] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose()
      } else if (mode === "onboarding" && e.key === "ArrowRight" && step < steps.length - 1) {
        setStep(s => s + 1)
      } else if (mode === "onboarding" && e.key === "ArrowLeft" && step > 0) {
        setStep(s => s - 1)
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
    }

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose, mode, step])

  // Focus trap for modal
  useEffect(() => {
    if (!isOpen) return;

    // Save the active element to restore focus later
    const activeElement = document.activeElement;

    // Return focus on cleanup
    return () => {
      if (activeElement) {
        activeElement.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null

  // Higher contrast styles
  const buttonStyles = {
    background: "#0056b3",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    margin: "0 5px",
    fontWeight: "bold"
  };

  const disabledButtonStyles = {
    ...buttonStyles,
    background: "#6c757d",
    cursor: "not-allowed",
    opacity: 0.7
  };

  const toggleButtonStyles = {
    background: "#2e7d32",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold"
  };

  const modalTitleStyles = {
    color: "#222222",
    borderBottom: "2px solid #0056b3",
    paddingBottom: "10px"
  };

  const contentTextStyles = {
    color: "#333333",
    lineHeight: "1.6"
  };

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
          <button 
            className="help-controls-button" 
            onClick={() => setShowSidebarDetails(prev => !prev)}
            aria-expanded={showSidebarDetails}
            aria-controls="sidebar-details"
            style={toggleButtonStyles}
          >
            {showSidebarDetails ? "Hide Sidebar Field Definitions" : "Show Sidebar Field Definitions"}
          </button>
          {showSidebarDetails && (
            <ul style={{ paddingLeft: "20px", color: "#333333" }} id="sidebar-details">
              <li><strong>Altitude</strong>: Drone height when the image was taken (in meters).</li>
              <li><strong>Altitude Offset</strong>: Manual adjustment added to altitude for calibration.</li>
              <li><strong>Image Width</strong>: Width of the image in pixels.</li>
              <li><strong>Image Height</strong>: Height of the image in pixels.</li>
              <li><strong>Focal Length</strong>: Camera lens focal length (in mm).</li>
              <li><strong>Field of View</strong>: Camera field of view angle (in degrees).</li>
              <li><strong>Sensor Width</strong>: Physical width of the camera's sensor (in mm).</li>
              <li><strong># Width Segments</strong>: Number of evenly spaced width cross-sections generated along the whale's spine.</li>
              <li><strong>Crosshair Size</strong>: Pixel diameter of crosshairs used to mark width points.</li>
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
    <div 
      className="help-modal-overlay" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="help-modal-title"
    >
      <div className="help-modal">
        {mode === "onboarding" ? (
          <>
            <h2 id="help-modal-title" style={modalTitleStyles}>{steps[step].title}</h2>
            <div className="help-step-text" aria-live="polite" style={contentTextStyles}>{steps[step].text}</div>
            <div className="help-controls" role="group" aria-label="Tutorial navigation">
              <button 
                disabled={step === 0} 
                onClick={() => setStep(s => s - 1)}
                aria-label="Previous step"
                style={step === 0 ? disabledButtonStyles : buttonStyles}
              >
                ← Back
              </button>
              <button 
                onClick={onClose}
                aria-label="Close tutorial"
                style={buttonStyles}
              >
                Close
              </button>
              <button 
                disabled={step === steps.length - 1} 
                onClick={() => setStep(s => s + 1)}
                aria-label="Next step"
                style={step === steps.length - 1 ? disabledButtonStyles : buttonStyles}
              >
                Next →
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="help-modal-title" style={modalTitleStyles}>📘 How to Use WhaleScale</h2>
            <ul className="help-list" style={contentTextStyles}>
              {steps.map((s, idx) => (
                <li key={idx}><strong>{s.title}</strong>: <div className="help-step-text">{s.text}</div></li>
              ))}
            </ul>
            <div className="help-controls">
            <button 
              onClick={() => {
                setHelpMode("onboarding");
                setShowHelp(true);
              }}
              aria-label="Start tutorial from beginning"
              style={buttonStyles}
            >
              Restart Tutorial
            </button>

              <button 
                onClick={onClose}
                aria-label="Close help"
                style={buttonStyles}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
