import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import RootRouter from "./RootRouter";
import { AuthProvider } from "./context/AuthContext";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RootRouter />
    </AuthProvider>
  </StrictMode>
);
  