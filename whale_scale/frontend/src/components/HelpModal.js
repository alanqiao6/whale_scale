// HelpModal.js
import React, { useState } from "react"
import "./HelpModal.css"

export default function HelpModal({ isOpen, onClose, mode = "docs" }) {
  const steps = [
    {
      title: "📄 Upload an Image",
      text: "Click the 'Add Image' button on the sidebar to upload your image.",
    },
    {
      title: "🔧 Set Width Segments",
      text: "Adjust the '# Width Segments' in the sidebar to control measurement resolution.",
    },
    {
      title: "📏 Use the Ruler Tool",
      text: "Click the 📏 tool in the top bar, then click two points on the image to define the main line.",
    },
    {
      title: "📐 Other Tools",
      text: "Use ✏️ to draw curves, 🔲 to measure areas, and 📐 to measure angles using 3 points.",
    },
    {
      title: "✅ Finalize & Export",
      text: "Once you finish a measurement, finalize it and export your results from the sidebar.",
    },
  ]

  const [step, setStep] = useState(0)

  if (!isOpen) return null

  return (
    <div className="help-modal-overlay">
      <div className="help-modal">
        {mode === "onboarding" ? (
          <>
            <h2>{steps[step].title}</h2>
            <p>{steps[step].text}</p>
            <div className="help-controls">
              <button disabled={step === 0} onClick={() => setStep(s => s - 1)}>← Back</button>
              <button onClick={onClose}>Close</button>
              <button disabled={step === steps.length - 1} onClick={() => setStep(s => s + 1)}>Next →</button>
            </div>
          </>
        ) : (
          <>
            <h2>📘 How to Use WhaleScale</h2>
            <ul className="help-list">
              {steps.map((s, idx) => (
                <li key={idx}><strong>{s.title}</strong>: {s.text}</li>
              ))}
            </ul>
            <div className="help-controls">
              <button onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
