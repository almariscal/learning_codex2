import clsx from "clsx";
import { Link, useLocation } from "react-router-dom";

import ThemeToggle from "./ThemeToggle";

const links = [
  { to: "/", label: "Inicio" },
  { to: "/admin", label: "Panel RRHH" },
  { to: "/employee", label: "Mi plaza" }
];

const Navbar = (): JSX.Element => {
  const location = useLocation();

  return (
    <header className="bg-white shadow-sm dark:border-b dark:border-slate-800 dark:bg-slate-900">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
        <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">Parking Allocator</span>
        <div className="flex items-center gap-4">
          <ul className="flex gap-4 text-sm font-medium text-slate-600 dark:text-slate-300">
            {links.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={clsx(
                    "rounded px-3 py-2 transition",
                    location.pathname === link.to
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                      : "hover:text-indigo-500 dark:hover:text-indigo-300"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
