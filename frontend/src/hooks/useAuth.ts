import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContextType";

export const useAuth = () => useContext(AuthContext);
