import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homePathFor } from "../utils/routes";

// Login/register are only for signed-out visitors
const GuestRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? <Navigate to={homePathFor(user)} replace /> : children;
};

export default GuestRoute;
