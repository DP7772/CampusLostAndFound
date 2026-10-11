import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      
      {/* We will build these exact pages next */}
      {/* <Route path="/login" element={<Login />} /> */}
      {/* <Route path="/signup" element={<Signup />} /> */}
      {/* <Route path="/admin-login" element={<AdminLogin />} /> */}
    </Routes>
  );
}