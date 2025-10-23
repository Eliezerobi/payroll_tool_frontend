import { useState } from "react";
import { NavLink } from "react-router-dom";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-t-lg transition ${
      isActive
        ? "bg-blue-400 shadow-blue-500/50 text-blue-900 font-bold"
        : "hover:bg-blue-300 text-blue-900"
    }`;

  return (
    <header className="bg-blue-200 px-4 shadow pr-2">
      <div className="flex items-center justify-between">

        <button
          className="md:hidden text-blue-800 focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <nav className="hidden md:flex  text-blue-900 font-medium">
          <NavLink to="/home" className={navLinkClass}>Home</NavLink>
          <NavLink to="/uploadpatients" className={navLinkClass}>Upload Patients</NavLink>
          <NavLink to="/uploadpayroll" className={navLinkClass}>Upload Payroll</NavLink>
          <NavLink to="/uploadhold" className={navLinkClass}>Upload Hold</NavLink>
          <NavLink to="/history" className={navLinkClass}>History</NavLink>
          <NavLink to="/billingexport" className={navLinkClass}>Billing Export</NavLink>
          
        </nav>
        <h1 className="text-xl font-bold text-blue-900">Payroll Tool</h1>
      </div>

      {menuOpen && (
        <nav className="md:hidden mt-3 flex flex-col space-y-2 text-blue-900 font-medium">
          <NavLink to="/home" className={navLinkClass} onClick={() => setMenuOpen(false)}>Home</NavLink>
          <NavLink to="/uploadpayroll" className={navLinkClass} onClick={() => setMenuOpen(false)}>Upload Payroll</NavLink>
          <NavLink to="/uploadpatients" className={navLinkClass} onClick={() => setMenuOpen(false)}>Upload Patients</NavLink>
          <NavLink to="/uploadhold" className={navLinkClass} onClick={() => setMenuOpen(false)}>Upload Hold</NavLink>
          <NavLink to="/history" className={navLinkClass} onClick={() => setMenuOpen(false)}>History</NavLink>
          <NavLink to="/billingexport" className={navLinkClass} onClick={() => setMenuOpen(false)}>Billing Export</NavLink>
        </nav>
      )}
    </header>
  );
}
