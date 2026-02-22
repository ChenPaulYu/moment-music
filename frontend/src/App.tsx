import { BrowserRouter, Routes, Route } from "react-router-dom";
import Entryway from "@/pages/Entryway";
import Library from "@/pages/Library";
import WriteMode from "@/pages/WriteMode";
import ListenMode from "@/pages/ListenMode";
import MoveMode from "@/pages/MoveMode";
import BeMode from "@/pages/BeMode";
import MomentPlayer from "@/pages/MomentPlayer";
import Setup from "@/pages/Setup";
import Prompts from "@/pages/Prompts";

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
        <Route path="/player/:jobId" element={<MomentPlayer />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/prompts" element={<Prompts />} />
        <Route path="/prompts/:tab" element={<Prompts />} />
      </Routes>
    </BrowserRouter>
  );
}
