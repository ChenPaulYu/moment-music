import { BrowserRouter, Routes, Route } from "react-router-dom";
import Entryway from "@/pages/Entryway";
import Library from "@/pages/Library";
import WriteMode from "@/pages/WriteMode";
import ListenMode from "@/pages/ListenMode";
import MoveMode from "@/pages/MoveMode";
import BeMode from "@/pages/BeMode";
import MomentPlayer from "@/pages/MomentPlayer";
import Profile from "@/pages/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Entryway />} />
        <Route path="/library" element={<Library />} />
        <Route path="/write" element={<WriteMode />} />
        <Route path="/listen" element={<ListenMode />} />
        <Route path="/move" element={<MoveMode />} />
        <Route path="/be" element={<BeMode />} />
        <Route path="/player" element={<MomentPlayer />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}
