import { PrimordiaBoot } from "./shell/BootSequence.js";
export { PrimordiaShell } from "./shell/PrimordiaShell.js";
export { PrimordiaBoot } from "./shell/BootSequence.js";

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", () => {
      PrimordiaBoot();
    });
  } else {
    PrimordiaBoot();
  }
}

