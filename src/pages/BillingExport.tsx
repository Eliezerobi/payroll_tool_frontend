import { useState } from "react";
import { API_BASE } from "../config";  // ✅ import the shared constant

export default function ExportBillableNotes() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const handleExport = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }

    try {
      const url = `${API_BASE}/api/billable-notes?start_date=${startDate}&end_date=${endDate}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`, // assuming you store JWT
        },
      });

      if (!res.ok) {
        throw new Error("Export failed");
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `billable_notes_${startDate}_to_${endDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert(`⚠️ Failed to export: ${err.message}`);
    }
  };

  return (
    <div className="h-full w-full bg-gray-100 p-6 flex flex-col">
      <div className="w-full bg-white shadow rounded-lg p-6 flex flex-col">
        <h1 className="text-2xl font-bold mb-4">Export Billable Notes</h1>

        <div className="flex gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
        </div>

        <button
          onClick={handleExport}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-40"
        >
          Export
        </button>
      </div>
    </div>
  );
}
