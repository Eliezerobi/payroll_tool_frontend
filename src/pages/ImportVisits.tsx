import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function ImportHelloNoteVisits() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isAllStatus, setIsAllStatus] = useState(true);
  const [isAllStatusWithHold, setIsAllStatusWithHold] = useState(false);
  const [isFinalizedDate, setIsFinalizedDate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ Linked behavior: one must always be ON
  const handleAllStatusChange = (value: boolean) => {
    if (value) {
      setIsAllStatus(true);
      setIsAllStatusWithHold(false);
    } else {
      // prevent both from turning off → switch to the other
      setIsAllStatus(false);
      setIsAllStatusWithHold(true);
    }
  };

  const handleAllStatusWithHoldChange = (value: boolean) => {
    if (value) {
      setIsAllStatus(false);
      setIsAllStatusWithHold(true);
    } else {
      // prevent both from turning off → switch to the other
      setIsAllStatus(true);
      setIsAllStatusWithHold(false);
    }
  };


  const handleImport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem("token");
      console.log("🔑 token being sent:", localStorage.getItem("token"));
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/import-hellonote-visits?` +
        new URLSearchParams({
          dateFrom,
          dateTo,
          isAllStatus: String(isAllStatus),
          isAllStatusWithHold: String(isAllStatusWithHold),
          isFinalizedDate: String(isFinalizedDate),
        }),
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setResult(response.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        // AxiosError type-safe access
        setError(err.response?.data?.detail || err.message || "Unknown error occurred");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error occurred");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 flex justify-center">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle>📥 Import HelloNote Visits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Switch
              checked={isAllStatus}
              onCheckedChange={handleAllStatusChange}
            />
            <Label>Finalized</Label>
          </div>

          <div className="flex items-center space-x-3">
            <Switch
              checked={isAllStatusWithHold}
              onCheckedChange={handleAllStatusWithHoldChange}
            />
            <Label>Finalized With Hold</Label>
          </div>


          <div className="flex items-center space-x-3">
            <Switch
              checked={isFinalizedDate}
              onCheckedChange={setIsFinalizedDate}
            />
            <Label>Use Finalized Date</Label>
          </div>

          <Button
            onClick={handleImport}
            disabled={loading || !dateFrom || !dateTo}
            className="w-full"
          >
            {loading ? "Importing..." : "Start Import"}
          </Button>

          {error && (
            <div className="text-red-500 font-semibold text-sm mt-3">
              ❌ {error}
            </div>
          )}

          {result && (
            <div className="mt-4 bg-gray-50 rounded-lg p-3 border text-sm text-gray-700">
              <p>✅ {result.message}</p>
              <p>Inserted: {result.inserted_count}</p>
              <p>Skipped: {result.skipped?.length || 0}</p>
              <p>UIDs Created: {result.visit_uids_created}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
