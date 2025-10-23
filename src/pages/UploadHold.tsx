import { useState } from "react";
import { apiFetch } from "../components/ApiWrapper";

export default function UploadHold() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

    const handleUpload = async () => {
    if (!file) {
        setMessage("Please select a file to upload");
        return;
    }

    setMessage("Uploading file...");
    setErrorDetails([]); // reset previous errors

    try {
        const formData = new FormData();
        formData.append("file", file);

        const { res, result } = await apiFetch(
          "http://localhost:8002/api/upload-hold-file",
          {
            method: "POST",
            body: formData,
          }
        );
        if (!res.ok) {
        const detail = result?.detail;
        if (typeof detail === "string") {
            setMessage("⚠️ Upload failed");
            setErrorDetails([detail]);
        } else if (detail?.message) {
            setMessage("⚠️ Upload failed");
            setErrorDetails([detail.message]);
        } else {
            setMessage("⚠️ Upload failed");
            setErrorDetails(["Unknown error"]);
        }
        return;
        }

        // ✅ success
        setMessage(result.message ?? "Upload successful");

        // Collect skipped + backend errors
        const skipped = result.skipped
        ? result.skipped.map((id: number) => `Note ID ${id} already exists`)
        : [];

        const errors = result.errors ?? [];

        setErrorDetails([...skipped, ...errors]);
    } catch (err: any) {
        setMessage("⚠️ Upload failed");
        setErrorDetails([err.message ?? "Unexpected error"]);
    }
    };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  return (
    <div className="h-full w-full bg-gray-100 p-6 flex flex-col">
      <div className="w-full flex-grow bg-white shadow rounded-lg p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Upload Payroll Report</h1>
          <button
            onClick={handleUpload}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Upload
          </button>
        </div>

        {/* Drag-and-drop area */}
        <div
          className={`flex-grow w-full p-6 rounded-lg text-center cursor-pointer transition border-dashed border-2 flex flex-col items-center justify-center
            ${isDragging ? "bg-gray-300 border-gray-500" : "bg-gray-200 border-gray-300"} text-gray-800 font-medium`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById("fileUpload")?.click()}
        >
          <p className="text-lg">Click or drag file here to upload</p>

          <input
            type="file"
            id="fileUpload"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
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

        {/* Status message */}
        {message && (
          <div className="mt-6 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-700">{message}</p>
          </div>
        )}

        {/* Error details */}
        {errorDetails.length > 0 && (
          <div className="mt-6 p-4 border border-red-400 bg-red-50 rounded text-sm text-red-800">
            <h2 className="font-semibold mb-2">
              ⚠️ Did not upload these for the following reason
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              {errorDetails.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
