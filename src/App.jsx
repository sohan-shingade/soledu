import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import MevCourse from "./courses/mev/MevCourse";
import EcosystemCourse from "./courses/ecosystem/EcosystemCourse";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/mev" element={<MevCourse />} />
      <Route path="/ecosystem" element={<EcosystemCourse />} />
    </Routes>
  );
}
