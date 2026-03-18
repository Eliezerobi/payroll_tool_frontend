import { useMemo, useState } from "react";
import { API_BASE } from "../../config";

type ImportMetDeductibleResult = {
  eligible_patient_ids: number;
  updated: number;
  filename?: string;
};

export default function ImportMetDeductible() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<ImportMetDeductibleResult | null>(null);

  const token = useMemo(() => localStorage.getItem("token") || "", []);

  const handleUpload = async () => {
    setUploadError(null);
    setUploadResult(null);

    if (!file) {
      setUploadError("Please choose an Excel file first.");
      return;
    }

    const isExcel =
      file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls");

    if (!isExcel) {
      setUploadError("File must be an Excel file (.xlsx or .xls).");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // If your API is under /api, use:
      // const url = `${API_BASE}/api/patients/import-deductible-flags`;
      const url = `${API_BASE}/api/patients/import-deductible-flags`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // do NOT set Content-Type for FormData
        },
        body: formData,
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        // non-json response
      }

      if (!res.ok) {
        const detail = data?.detail || text || "Upload failed";
        throw new Error(detail);
      }

      setUploadResult(data as ImportMetDeductibleResult);
      setFile(null);
    } catch (e: any) {
      setUploadError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full bg-white shadow rounded-lg p-6 flex flex-col">
      <h2 className="text-xl font-bold mb-2">Import Met Deductible Flags</h2>

      <p className="text-sm text-gray-600 mb-4">
        Upload an Excel file containing{" "}
        <span className="font-mono">patient_id</span>,{" "}
        <span className="font-mono">Deductible</span>,{" "}
        <span className="font-mono">QMB</span>.
        <br />
        Rule: if <span className="font-mono">QMB == 0</span> and{" "}
        <span className="font-mono">Deductible == 0</span>, we set{" "}
        <span className="font-mono">patients.met_deductible = true</span>.
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block"
          />

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>

        {file && (
          <div className="text-sm text-gray-700">
            Selected: <span className="font-mono">{file.name}</span>
          </div>
        )}

        {uploadError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {uploadError}
          </div>
        )}

        {uploadResult && (
          <div className="text-sm bg-gray-50 border border-gray-200 rounded p-3">
            <div className="font-semibold mb-2">Import Result</div>

            <div className="grid grid-cols-2 gap-2">
              <div>Eligible patient_ids</div>
              <div className="font-mono">{uploadResult.eligible_patient_ids}</div>

              <div>Rows updated</div>
              <div className="font-mono">{uploadResult.updated}</div>

              {uploadResult.filename && (
                <>
                  <div>Filename</div>
                  <div className="font-mono break-words">{uploadResult.filename}</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
