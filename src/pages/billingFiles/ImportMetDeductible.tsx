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
  const [isDragging, setIsDragging] = useState(false);

  const token = useMemo(() => localStorage.getItem("token") || "", []);

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
    setUploadError(null);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    setUploadError(null);
    setUploadResult(null);

    if (!file) {
      setUploadError("Please choose an Excel file first.");
      return;
    }

    const isExcel =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls");

    if (!isExcel) {
      setUploadError("File must be an Excel file (.xlsx or .xls).");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const url = `${API_BASE}/api/patients/import-deductible-flags`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0] || null;
    handleFileSelect(droppedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
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

      <div className="flex flex-col gap-4">
        <div
          className={`w-full p-6 rounded-lg text-center cursor-pointer transition border-dashed border-2 flex flex-col items-center justify-center min-h-[220px]
            ${isDragging ? "bg-gray-300 border-gray-500" : "bg-gray-200 border-gray-300"} text-gray-800 font-medium`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById("metDeductibleFileUpload")?.click()}
        >
          <p className="text-lg">Click or drag file here to upload</p>

          <input
            type="file"
            id="metDeductibleFileUpload"
            accept=".xlsx,.xls"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            className="hidden"
          />

          {file && (
            <div className="mt-4 flex items-center gap-2 text-green-700">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span className="text-sm font-medium">{file.name}</span>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>

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