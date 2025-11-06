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

        {/* ✅ Mobile toggle */}
        <button
          className="md:hidden text-blue-800 focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        {/* ✅ DESKTOP NAV */}
        <nav className="hidden md:flex text-blue-900 font-medium space-x-2">

          <NavLink to="/home" className={navLinkClass}>Home</NavLink>

          {/* ✅ SELF UPLOAD (Parent dropdown) */}
          <div className="relative group">
            <button className="px-4 py-2 rounded-t-lg hover:bg-blue-300">
              Self Upload
            </button>

            <div className="absolute hidden group-hover:block bg-blue-200 shadow-lg rounded-b-lg p-2">

              {/* ✅ Manual Upload subsection */}
              <div>
                <div className="font-semibold px-2 py-1">Manual Upload</div>
                <NavLink to="/uploadvisits" className="block px-4 py-2 hover:bg-blue-300">
                  Visits
                </NavLink>
                <NavLink to="/uploadhold" className="block px-4 py-2 hover:bg-blue-300">
                  Hold
                </NavLink>
                <NavLink to="/uploadpatients" className="block px-4 py-2 hover:bg-blue-300">
                  Patients
                </NavLink>
              </div>

              <hr className="my-2 border-blue-300" />

              {/* ✅ Automatic Upload subsection */}
              <div>
                <div className="font-semibold px-2 py-1">Automatic Upload</div>
                <NavLink to="/importvisits" className="block px-4 py-2 hover:bg-blue-300">
                  Visits
                </NavLink>
                <NavLink to="/importpatients" className="block px-4 py-2 hover:bg-blue-300">
                  Patients
                </NavLink>
              </div>

            </div>
          </div>

          <NavLink to="/history" className={navLinkClass}>History</NavLink>
          <NavLink to="/billingexport" className={navLinkClass}>Billing Export</NavLink>
        </nav>

        <h1 className="text-xl font-bold text-blue-900">Visits</h1>
      </div>

      {/* ✅ MOBILE NAV */}
      {menuOpen && (
        <nav className="md:hidden mt-3 flex flex-col space-y-2 text-blue-900 font-medium">

          <NavLink to="/home" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            Home
          </NavLink>

          {/* ✅ SELF UPLOAD (mobile expandable sections) */}
          <div className="flex flex-col bg-blue-100 rounded">
            <span className="px-4 py-2 font-bold">Self Upload</span>

            <div className="pl-4 pb-2">
              <div className="font-semibold py-1">Manual Upload</div>
              <NavLink to="/uploadvisits" className={navLinkClass} onClick={() => setMenuOpen(false)}>Visits</NavLink>
              <NavLink to="/uploadhold" className={navLinkClass} onClick={() => setMenuOpen(false)}>Hold</NavLink>
              <NavLink to="/uploadpatients" className={navLinkClass} onClick={() => setMenuOpen(false)}>Patients</NavLink>

              <div className="font-semibold py-1 mt-2">Automatic Upload</div>
              <NavLink to="/importvisits" className={navLinkClass} onClick={() => setMenuOpen(false)}>Visits</NavLink>
              <NavLink to="/importpatients" className={navLinkClass} onClick={() => setMenuOpen(false)}>Patients</NavLink>
            </div>
          </div>

          <NavLink to="/history" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            History
          </NavLink>
          <NavLink to="/billingexport" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            Billing Export
          </NavLink>

        </nav>
      )}
    </header>
  );
}
