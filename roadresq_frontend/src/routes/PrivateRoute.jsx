// src/routes/PrivateRoute.jsx

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Otherwise, render the children component (protected page)
  return children;
};

export default PrivateRoute;
