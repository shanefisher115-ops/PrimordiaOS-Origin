import React from "react";
import ReactDOM from "react-dom/client";
import { PrimordiaShell } from "../shell/PrimordiaShell.jsx";

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <PrimordiaShell />
    </React.StrictMode>
  );
}
