import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import UploadPayroll from "./pages/UploadPayroll";
import UploadHold from "./pages/UploadHold";
import Header from "./components/Header";
import HistoryPage from "./pages/History"; // 👈 make sure file is `src/pages/History.tsx`
import UploadPatients from "./pages/UploadPatients";
import ExportBillableNotes from "./pages/BillingExport";

export default function App() {
  const token = localStorage.getItem("token");
  const location = useLocation();

  const isLoggedIn = Boolean(token);
  const isLoginPage = location.pathname === "/";

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-900">
      {/* Show header only if logged in and not on login page */}
      {isLoggedIn && !isLoginPage && <Header />}

      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/home"
          element={isLoggedIn ? <Home /> : <Navigate to="/" replace />}
        />
        <Route
          path="/uploadpayroll"
          element={isLoggedIn ? <UploadPayroll /> : <Navigate to="/" replace />}
        />
        <Route
          path="/uploadpatients"
          element={isLoggedIn ? <UploadPatients /> : <Navigate to="/" replace />}
        />
        <Route
          path="/billingexport"
          element={isLoggedIn ? <ExportBillableNotes /> : <Navigate to="/" replace />}
        />
        <Route
          path="/uploadhold"
          element={isLoggedIn ? <UploadHold /> : <Navigate to="/" replace />}
        />
        <Route
          path="/history"
          element={isLoggedIn ? <HistoryPage /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}