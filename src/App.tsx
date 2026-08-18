import { HashRouter, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import MapPage from "@/pages/MapPage";
import Letter from "@/pages/Letter";
import Messages from "@/pages/Messages";
import Gallery from "@/pages/Gallery";
import Admin from "@/pages/Admin";
import Posts from "@/pages/Posts";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/letter" element={<Letter />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="/posts/:id" element={<Posts />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </HashRouter>
  );
}
