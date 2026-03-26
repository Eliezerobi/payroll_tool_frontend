import { useState } from "react";
import { API_BASE } from "../../config";

type UploadResult = {
  inserted: number;
  updated: number;
  matched_existing?: number;
  checked_not_updated?: number;
  skipped?: number;
  total_rows: number;
  invalid_conversion_counts?: Record<string, number>;
};

export default function UploadMillinInvoices() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFile = (selectedFile: File | null) => {
    setFile(selectedFile);
    setResult(null);
    setMessage("");
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file.");
      return;
    }

    setUploading(true);
    setResult(null);
    setMessage("Uploading...");

    try {
      const form = new FormData();
      form.append("file", file, file.name);

      const res = await fetch(`${API_BASE}/api/millin-invoices/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: form,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.detail || data?.message || "Upload failed");
      }

      setResult(data);
      setMessage("Upload successful.");
    } catch (err: any) {
      setMessage(`Upload failed: ${err?.message || "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0] || null;
    handleFile(droppedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const hasInvalidConversions =
    result?.invalid_conversion_counts &&
    Object.keys(result.invalid_conversion_counts).length > 0;

  return (
    <div className="w-full bg-white shadow rounded-lg p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Import Millin Invoices</h1>

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      <div
        className={`w-full p-6 rounded-lg text-center cursor-pointer transition border-dashed border-2 flex flex-col items-center justify-center min-h-[220px]
          ${isDragging ? "bg-gray-300 border-gray-500" : "bg-gray-200 border-gray-300"} text-gray-800 font-medium`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById("millinFileUpload")?.click()}
      >
        <p className="text-lg">Click or drag file here to upload</p>

        <input
          type="file"
          id="millinFileUpload"
          accept=".xlsx,.xls"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm font-medium">{file.name}</span>
          </div>
        )}
      </div>

      {message && (
        <div className="mt-6 flex flex-col items-center justify-center text-center">
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-600 border-opacity-50 mb-2"></div>
              <p className="text-sm text-gray-700">{message}</p>
            </>
          ) : message.toLowerCase().includes("failed") || message.toLowerCase().includes("please select") ? (
            <>
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center mb-2">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-sm text-red-700">{message}</p>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mb-2">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-700">{message}</p>
            </>
          )}
        </div>
      )}

      {result && (
        <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm">
          <h2 className="text-lg font-semibold mb-3 text-gray-900">Import Summary</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white border rounded p-3">
              <div className="text-gray-500 text-xs uppercase tracking-wide">Inserted</div>
              <div className="text-xl font-semibold text-green-700">{result.inserted ?? 0}</div>
            </div>

            <div className="bg-white border rounded p-3">
              <div className="text-gray-500 text-xs uppercase tracking-wide">Updated</div>
              <div className="text-xl font-semibold text-blue-700">{result.updated ?? 0}</div>
            </div>

            <div className="bg-white border rounded p-3">
              <div className="text-gray-500 text-xs uppercase tracking-wide">Checked Only</div>
              <div className="text-xl font-semibold text-yellow-700">
                {result.checked_not_updated ?? 0}
              </div>
            </div>

            <div className="bg-white border rounded p-3">
              <div className="text-gray-500 text-xs uppercase tracking-wide">Matched Existing</div>
              <div className="text-xl font-semibold text-purple-700">
                {result.matched_existing ?? 0}
              </div>
            </div>

            <div className="bg-white border rounded p-3">
              <div className="text-gray-500 text-xs uppercase tracking-wide">Skipped</div>
              <div className="text-xl font-semibold text-red-700">{result.skipped ?? 0}</div>
            </div>

            <div className="bg-white border rounded p-3">
              <div className="text-gray-500 text-xs uppercase tracking-wide">Total Rows</div>
              <div className="text-xl font-semibold text-gray-900">{result.total_rows ?? 0}</div>
            </div>
          </div>

          {hasInvalidConversions && (
            <div className="mt-4 border border-yellow-300 bg-yellow-50 rounded p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">Invalid Conversion Counts</h3>
              <div className="space-y-1 text-yellow-800">
                {Object.entries(result.invalid_conversion_counts!).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4">
                    <span>{key}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
