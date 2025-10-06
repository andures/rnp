import { useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContextType";

export const useTheme = () => useContext(ThemeContext);
