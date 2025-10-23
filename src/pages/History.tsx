import { useState } from "react";
const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface Visit {
  id: number;
  visit_uid:string;
  patient_id: number;
  first_name: string;
  last_name: string;
  note: string;
  note_date: string | null;
  visit_type: string | null;
  case_description: string | null;
  note_number: number;
  supervising_therapist: string|null;
  visiting_therapist: string;
}

type SortColumn = keyof Visit | null;
type SortDirection = "asc" | "desc";

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);

  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");


  const fetchHistory = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append("query", search);

    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE}/api/payroll/history?${params.toString()}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 401) {
      // login expired → bounce back to login
      window.location.href = "/login";
      return;
    }

    const data = await res.json();
    setVisits(data);
    setLoading(false);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedVisits = [...visits].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    }
    return sortDirection === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  return (
    <div className="min-h-screen bg-white p-6 space-y-4">
      <h1 className="text-xl font-bold">Payroll Visit History</h1>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by Patient ID, Name, or Case"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") fetchHistory();
          }}
          className="border p-2 rounded w-80"
        />
        <button
          onClick={fetchHistory}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Search
        </button>
      </div>

      {loading && <p>Loading...</p>}

      <table className="min-w-full border mt-4">
        <thead className="bg-gray-100">
          <tr>
            {[
              ["id", "ID"],
              ["visit_uid", "Visit Unique ID"],
              ["patient_id", "Patient ID"],
              ["last_name", "Last Name"],
              ["first_name", "First Name"],
              ["case_description", "Case"],
              ["note", "Note"],
              ["note_number", "#"],
              ["note_date", "Date"],
              ["visit_type", "Type"],
              ["visiting_therapist", "Therapist"],
              ["supervising_therapist", "Supervisor"],
            ].map(([col, label]) => (
              <th
                key={col}
                onClick={() => handleSort(col as SortColumn)}
                className="border px-2 py-1 cursor-pointer select-none hover:bg-gray-200"
              >
                {label}
                {sortColumn === col && (
                  <span>{sortDirection === "asc" ? " ▲" : " ▼"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedVisits.map((v) => (
            <tr key={v.id}>
              <td className="border px-2 py-1">{v.id}</td>
              <td className="border px-2 py-1">{v.visit_uid}</td>
              <td className="border px-2 py-1">{v.patient_id}</td>
              <td className="border px-2 py-1">{v.last_name}</td>
              <td className="border px-2 py-1">{v.first_name}</td>
              <td className="border px-2 py-1">{v.case_description}</td>
              <td className="border px-2 py-1">{v.note}</td>
              <td className="border px-2 py-1">{v.note_number}</td>
              <td className="border px-2 py-1">{v.note_date}</td>
              <td className="border px-2 py-1">{v.visit_type}</td>
              <td className="border px-2 py-1">{v.visiting_therapist}</td>
              <td className="border px-2 py-1">{v.supervising_therapist}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
