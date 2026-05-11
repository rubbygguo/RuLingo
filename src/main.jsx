import React from "react";
import { createRoot } from "react-dom/client";
import LearningApp from "./LearningApp.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LearningApp />
  </React.StrictMode>
);
