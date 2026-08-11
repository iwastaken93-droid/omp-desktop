import { Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "./components/landing/LandingPage";
import { Studio } from "./components/app/Studio";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<Studio />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
