import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import MevCourse from "./courses/mev/MevCourse";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/mev" element={<MevCourse />} />
    </Routes>
  );
}
