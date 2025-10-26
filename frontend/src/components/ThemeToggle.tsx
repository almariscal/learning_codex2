import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

import { useTheme } from "../context/ThemeContext";

const IconButton = ({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element => (
  <button
    {...props}
    className={clsx(
      "flex h-9 w-9 items-center justify-center rounded-full border",
      "border-slate-200 bg-white text-slate-600 transition hover:border-indigo-400 hover:text-indigo-500",
      "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-indigo-300"
    )}
  >
    {children}
  </button>
);

const ThemeToggle = (): JSX.Element => {
  const { theme, toggleTheme } = useTheme();

  return (
    <IconButton onClick={toggleTheme} aria-label="Cambiar tema">
      {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </IconButton>
  );
};

export default ThemeToggle;
