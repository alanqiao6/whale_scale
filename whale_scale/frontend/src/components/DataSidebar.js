// Author: Jason Fitzpatrick
"use client";

import React, { useState } from "react";
import "./Sidebar.css";

export default function DataSidebar({ selectedData }) {
  const [task, setTask] = useState("Body Condition");

  const taskDescriptions = {
    "Body Condition": "Calculates Body Area Index (BAI), surface area, and body volume using TL + widths.\nProvide one measurement of type 'TL' and 3 or more measurements of type 'TL_wXX.XX'."
  };

  const endpointMap = {
    "Body Condition": "/api/collatrix/calculate_body_condition/",
    save: "/api/body_conditions/"
  };

  const extractNumericSuffix = (str) => {
    const match = str.match(/TL_w(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  };

  const extractKeyWithPrefix = (obj, prefix) => {
    const key = Object.keys(obj).find(k => k.startsWith(prefix));
    return key ? obj[key] : null;
  };

  const validateAndRun = async () => {
    if (!selectedData || selectedData.length === 0) {
      alert("No measurements selected.");
      return;
    }

    const typeTL = selectedData.filter(d => d.measurement_type === "TL");
    const typeWidths = selectedData.filter(d => d.measurement_type?.startsWith("TL_w"));

    if (typeTL.length < 1 || typeWidths.length < 3) {
      alert("Must select one TL and at least 3 TL_wXX.XX measurements.");
      return;
    }

    try {
      const csrftoken = document.cookie.match(/csrftoken=([^;]*)/)?.[1] || "";

      const tlMeasurement = "TL";
      const suffixes = typeWidths.map(w => extractNumericSuffix(w.measurement_type)).filter(v => v != null);
      const lower = Math.min(...suffixes);
      const upper = Math.max(...suffixes);
      const interval = (upper - lower) / (suffixes.length - 1);

      const transformedMeasurements = selectedData.map(row => ({
        Image_ID: row.user_image_path,
        Image: row.user_image_path,
        [tlMeasurement]: row.scaled_dimension,
        ...Object.fromEntries(
          typeWidths.map(w => [w.measurement_type, w.scaled_dimension])
        )
      }));

      const payload = {
        measurements: transformedMeasurements,
        bv_method: "Circle",
        bai_method: "Parabola",
        tl_name: tlMeasurement,
        interval,
        lower,
        upper
      };

      const response = await fetch(endpointMap[task], {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      var result = await response.json();
      result = result[0]
      const surface_area = extractKeyWithPrefix(result, "SA_");
      const body_volume = extractKeyWithPrefix(result, "BVcir_");
      const body_area_index = extractKeyWithPrefix(result, "BAIpar_");
      const image = result.Image;

      if (surface_area && body_volume && body_area_index && image) {
        const saveResponse = await fetch(endpointMap.save, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken
          },
          credentials: "include",
          body: JSON.stringify({
            image,
            image_id: image,
            surface_area,
            body_volume,
            body_area_index,
            increment: interval,
            measurement_ids: selectedData.map(row => row.id)
          })
        });

        const saveResult = await saveResponse.json();
        console.log("Saved body condition entry:", saveResult);
      }
    } catch (err) {
      console.error("Failed to run analysis:", err);
    }
  };

  return (
    <div className="sidebar">
      <h2>Data</h2>
      <h3>Analysis: Body Condition</h3>
      <div style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.5" }}>
        {taskDescriptions[task]}
      </div>
      <button className="update-button" onClick={validateAndRun}>Run</button>
    </div>
  );
}
