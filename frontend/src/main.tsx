import React from "react";
import ReactDOM from "react-dom/client";
// Thứ tự CSS quan trọng: tokens + base trước, component sau.
import "./index.css";
import "./app.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
