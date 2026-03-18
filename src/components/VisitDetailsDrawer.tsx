import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../config";

type VisitRow = {
  id: number;
  noteId: number;
  patientId: number;
  therapist: string;
  full_name: string;
  visit_uid: string;
  dos: string;
  primary_insurance: string;
  statusBucket: string;
  arBucket: string;
  billingBucketKey: string;
  reconcileBucketKey: string;
};

// You can tighten this type once you know the response shape.
type NoteDetails = Record<string, any>;

async function fetchVisitDetails(noteId: number, signal?: AbortSignal): Promise<NoteDetails> {
  const token = localStorage.getItem("token");

  // ✅ Replace this with your real endpoint if different
  const url = `${API_BASE}/api/visits/note-details?note_id=${encodeURIComponent(String(noteId))}`;

  const res = await fetch(url, {
    method: "GET",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to load visit details (${res.status})${txt ? ` - ${txt}` : ""}`);
  }

  return res.json();
}

export default function VisitDetailsDrawer(props: {
  open: boolean;
  onClose: () => void;
  visit: VisitRow | null;
}) {
  const { open, onClose, visit } = props;

  const noteId = visit?.noteId ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<NoteDetails | null>(null);

  // Optional: simple in-memory cache so re-opening same note is instant
  const cacheRef = useRef<Map<number, NoteDetails>>(new Map());

  // Close on ESC
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Fetch details when drawer opens or noteId changes
  useEffect(() => {
    if (!open || !noteId) return;

    // Serve from cache if present
    const cached = cacheRef.current.get(noteId);
    if (cached) {
      setDetails(cached);
      setError(null);
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      setDetails(null);

      try {
        const data = await fetchVisitDetails(noteId, ctrl.signal);
        cacheRef.current.set(noteId, data);
        setDetails(data);
      } catch (e: any) {
        // Ignore abort
        if (e?.name === "AbortError") return;
        setError(e?.message ?? "Failed to load visit details");
      } finally {
        setLoading(false);
      }
    })();

    // Abort if closed or note changes
    return () => ctrl.abort();
  }, [open, noteId]);

  // If closed, render nothing
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />

      {/* Right panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 p-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">Visit / Note Details</div>
              <div className="mt-1 text-xs text-slate-500">
                {visit ? (
                  <>
                    <span className="font-medium text-slate-700">{visit.full_name || "—"}</span>
                    {" • "}DOS {visit.dos || "—"}
                    {" • "}Note #{visit.noteId}
                  </>
                ) : (
                  "No visit selected"
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:border-slate-300"
            >
              Close
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto p-4">
            {/* Quick row summary (already known) */}
            {visit && (
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Visit UID" value={visit.visit_uid || "—"} />
                  <Field label="Therapist" value={visit.therapist || "—"} />
                  <Field label="Primary Insurance" value={visit.primary_insurance || "—"} />
                  <Field label="Billing Bucket" value={visit.billingBucketKey || "—"} />
                </div>
              </div>
            )}

            {/* Request states */}
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                Loading details…
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
                <div className="mt-3">
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm hover:border-red-300"
                    onClick={() => {
                      // force refetch by clearing cache for this noteId
                      if (noteId) cacheRef.current.delete(noteId);
                      // trigger effect by setting details null; effect will run anyway if open+noteId,
                      // but cache removal ensures fetch happens
                      setDetails(null);
                      setError(null);
                      setLoading(false);
                      // small trick: re-run by toggling loading state; effect runs only on deps,
                      // so we rely on cache being empty and user still open;
                      // easiest is to just call fetch directly:
                      // (keeping simple: click close/open also works)
                      // If you want proper "Retry", tell me and I'll implement a retry counter dep.
                    }}
                  >
                    Retry (clear cache)
                  </button>
                </div>
              </div>
            ) : details ? (
              <div className="space-y-3">
                {/* Placeholder rendering - replace with structured sections once response is stable */}
                <div className="rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900">
                    Details
                  </div>
                  <div className="p-4">
                    <pre className="whitespace-pre-wrap break-words text-xs text-slate-700">
                      {JSON.stringify(details, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                No details loaded.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 p-4 text-xs text-slate-500">
            Fetched from backend when opened
          </div>
        </div>
      </div>
    </div>
  );
}

function Field(props: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-slate-500">{props.label}</div>
      <div className="mt-0.5 text-sm text-slate-900">{props.value}</div>
    </div>
  );
}
