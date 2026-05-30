import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/login";
import ChatPage from "./pages/chat";
import Register from "./pages/register";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
