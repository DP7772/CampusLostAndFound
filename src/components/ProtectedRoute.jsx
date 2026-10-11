import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ allowedRole, children }) {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');

  if (!token || !storedUser) {
    // Agar login hi nahi kiya, direct home/login page par bhejo
    return <Navigate to="/" replace />;
  }

  try {
    const user = JSON.parse(storedUser);

    // Agar role match nahi karta (jaise student admin page kholne ki koshish kare)
    if (user.role !== allowedRole) {
      return <Navigate to="/" replace />;
    }

    return children;
  } catch {
    localStorage.clear();
    return <Navigate to="/" replace />;
  }
}
