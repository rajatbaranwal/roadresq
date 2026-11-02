import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homePathFor } from "../utils/routes";

const RoleRoute = ({ children, role }) => {
  const { user } = useAuth();

  if (!user || user.role !== role) {
    return <Navigate to={homePathFor(user)} replace />;
  }

  return children;
};

export default RoleRoute;
