import { useState, useEffect } from 'react';
import { API_BASE } from "../../config";

const BillingFileExport = () => {
  const [primaryInsurance, setPrimaryInsurance] = useState('');
  const [insuranceOptions, setInsuranceOptions] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInsuranceOptions = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/primary-insurances`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setInsuranceOptions(data.insurances || []);
        }
      } catch (error) {
        console.error('Failed to fetch insurance options:', error);
      }
    };

    fetchInsuranceOptions();
  }, []);

  const handleExport = async () => {
    if (!startDate || !endDate || !primaryInsurance) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const url = `${API_BASE}/api/timely-filling-notes?primary_insurance=${encodeURIComponent(primaryInsurance)}&start_date=${startDate}&end_date=${endDate}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Export failed");
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `timely_filling_notes_${startDate}_to_${endDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(`⚠️ Failed to export: ${err?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white shadow rounded-lg p-6 flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Export Timely Filling Notes</h1>

      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Primary Insurance</label>
          <select
            value={primaryInsurance}
            onChange={(e) => setPrimaryInsurance(e.target.value)}
            className="border rounded px-2 py-1 min-w-48"
          >
            <option value="">Select Insurance</option>
            {insuranceOptions.map((insurance) => (
              <option key={insurance} value={insurance}>
                {insurance}
              </option>
            ))}
          </select>
        </div>

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
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-40 disabled:opacity-50"
      >
        {loading ? "Exporting..." : "Export"}
      </button>
    </div>
  );
};

export default BillingFileExport;