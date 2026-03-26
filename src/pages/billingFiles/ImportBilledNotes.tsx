import { useMemo, useState } from "react";
import { API_BASE } from "../../config";

type ImportResult = {
  ok: boolean;
  processed: number;
  created_billing_status: number;
  updated_visits: number;
  missing_note_ids: number[];
  duplicate_note_ids: number[];
  already_billed_note_ids: number[];
  skip_if_already_billed: boolean;
};

export default function ImportBilledNotes() {
  const [billedFile, setBilledFile] = useState<File | null>(null);
  const [skipIfAlreadyBilled, setSkipIfAlreadyBilled] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const token = useMemo(() => localStorage.getItem("token") || "", []);

  const handleFileSelect = (file: File | null) => {
    setBilledFile(file);
    setUploadError(null);
    setUploadResult(null);
  };

  const handleUploadAlreadyBilled = async () => {
    setUploadError(null);
    setUploadResult(null);

    if (!billedFile) {
      setUploadError("Please choose an Excel file first.");
      return;
    }

    const isExcel =
      billedFile.name.toLowerCase().endsWith(".xlsx") ||
      billedFile.name.toLowerCase().endsWith(".xls");

    if (!isExcel) {
      setUploadError("File must be an Excel file (.xlsx or .xls).");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", billedFile);

      const url = `${API_BASE}/api/billing/import-billed-excel?skip_if_already_billed=${
        skipIfAlreadyBilled ? "true" : "false"
      }`;

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

      setUploadResult(data as ImportResult);
      setBilledFile(null);
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
      <h2 className="text-xl font-bold mb-2">Import Already Billed Notes</h2>
      <p className="text-sm text-gray-600 mb-4">
        Upload an Excel file containing <span className="font-mono">note_id</span> (required) and optionally{" "}
        <span className="font-mono">billed_date</span>. This will mark matching visits as billed and create
        corresponding <span className="font-mono">billing_status</span> rows.
      </p>

      <div className="flex flex-col gap-4">
        <div
          className={`w-full p-6 rounded-lg text-center cursor-pointer transition border-dashed border-2 flex flex-col items-center justify-center min-h-[220px]
            ${isDragging ? "bg-gray-300 border-gray-500" : "bg-gray-200 border-gray-300"} text-gray-800 font-medium`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById("billedNotesFileUpload")?.click()}
        >
          <p className="text-lg">Click or drag file here to upload</p>

          <input
            type="file"
            id="billedNotesFileUpload"
            accept=".xlsx,.xls"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            className="hidden"
          />

          {billedFile && (
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
              <span className="text-sm font-medium">{billedFile.name}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={skipIfAlreadyBilled}
              onChange={(e) => setSkipIfAlreadyBilled(e.target.checked)}
            />
            Skip rows where visit is already billed
          </label>

          <button
            onClick={handleUploadAlreadyBilled}
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
              <div>Processed</div>
              <div className="font-mono">{uploadResult.processed}</div>

              <div>Created billing_status</div>
              <div className="font-mono">{uploadResult.created_billing_status}</div>

              <div>Updated visits</div>
              <div className="font-mono">{uploadResult.updated_visits}</div>

              <div>Missing note_ids</div>
              <div className="font-mono">{uploadResult.missing_note_ids?.length || 0}</div>

              <div>Duplicate note_ids</div>
              <div className="font-mono">{uploadResult.duplicate_note_ids?.length || 0}</div>

              <div>Already billed (skipped)</div>
              <div className="font-mono">{uploadResult.already_billed_note_ids?.length || 0}</div>
            </div>

            {(uploadResult.missing_note_ids?.length || 0) > 0 && (
              <div className="mt-3">
                <div className="font-semibold">Missing note_ids (first 50)</div>
                <div className="font-mono break-words">
                  {uploadResult.missing_note_ids.slice(0, 50).join(", ")}
                  {uploadResult.missing_note_ids.length > 50 ? " ..." : ""}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}