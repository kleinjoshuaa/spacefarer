import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles.css";

// Note: React.StrictMode is intentionally not used. Its dev-only double
// mount/unmount of effects would create and destroy two Phaser.Game instances
// in quick succession, which the WebGL/physics loop does not tolerate cleanly.
const root = document.getElementById("root");
if (!root) throw new Error("Root element not found.");

createRoot(root).render(<App />);
