import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import UploadVisits from "./pages/UploadVisits";
import UploadHold from "./pages/UploadHold";
import Header from "./components/Header";
import HistoryPage from "./pages/History"; // 👈 make sure file is `src/pages/History.tsx`
import UploadPatients from "./pages/UploadPatients";
import ExportBillableNotes from "./pages/BillingFiles";
import ImportHelloNoteVisits from "./pages/ImportVisits";
import ImportPatients from "./pages/ImportPatients";
import BillingYearView from "./pages/billing/yearView";
import BillingMonthView from "./pages/billing/monthView";
import BillingDayView from "./pages/billing/dayView";


export default function App() {
  const token = localStorage.getItem("token");
  const location = useLocation();

  const isLoggedIn = Boolean(token);
  const isLoginPage =
    location.pathname === "/" || location.pathname === "/login";

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-900">
      {/* Show header only if logged in and not on login page */}
      {isLoggedIn && !isLoginPage && <Header />}

      <Routes>
        <Route
          path="/"
          element={<Navigate to={isLoggedIn ? "/home" : "/login"} replace />}
        />
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/home" replace /> : <Login />}
        />
        <Route
          path="/home"
          element={isLoggedIn ? <Home /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/uploadvisits"
          element={isLoggedIn ? <UploadVisits /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/importvisits"
          element={isLoggedIn ? <ImportHelloNoteVisits/> : <Navigate to="/login" replace />}
        />
        <Route
          path="/importpatients"
          element={isLoggedIn ? <ImportPatients /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/uploadpatients"
          element={isLoggedIn ? <UploadPatients /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/billingfiles"
          element={isLoggedIn ? <ExportBillableNotes /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/uploadhold"
          element={isLoggedIn ? <UploadHold /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/history"
          element={isLoggedIn ? <HistoryPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/billing/calendar"
          element={isLoggedIn ? <BillingYearView /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/billing/calendar/:year"
          element={isLoggedIn ? <BillingYearView /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/billing/calendar/:year/:month"
          element={isLoggedIn ? <BillingMonthView /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/billing/calendar/:year/:month/:day"
          element={isLoggedIn ? <BillingDayView /> : <Navigate to="/login" replace />}
        />

        <Route
          path="*"
          element={<Navigate to={isLoggedIn ? "/home" : "/login"} replace />}
        />
      </Routes>
    </div>
  );
}
