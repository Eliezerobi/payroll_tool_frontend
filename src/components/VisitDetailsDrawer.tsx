import { useEffect, useMemo, useRef, useState } from "react";
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

type NoteDetails = Record<string, any>;
type InsuranceOptions = {
  primary_insurance: string[];
  secondary_insurance: string[];
};

const EDITABLE_KEYS = new Set([
  "primary_insurance",
  "secondary_insurance",
  "primary_ins_id",
  "secondary_ins_id",
  "ref_provider_npi",
  "referring_provider",
  "diagnosis",
  "visiting_therapist",
  "cpt_code",
  "auth_number",
  "medical_diagnosis",
  "rendering_provider_npi",
]);

const READ_ONLY_KEYS = new Set(["id", "created_at", "updated_at", "uploaded_at"]);
const TEXTAREA_KEYS = new Set(["diagnosis", "medical_diagnosis", "comments", "review_reason", "billed_comment"]);
const NUMBER_KEYS = new Set([
  "note_id",
  "patient_id",
  "note_number",
  "total_units",
  "uploaded_by",
  "case_id",
  "review_by",
  "note_group_id",
  "note_version",
]);
const BOOLEAN_KEYS = new Set(["hold", "billed", "paid", "review_needed"]);
const DATE_KEYS = new Set(["case_date", "note_date", "finalized_date", "date_billed", "date_of_birth"]);
const DATETIME_KEYS = new Set(["time_in", "time_out"]);

function labelize(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function toLocalDateTimeInput(v: string) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatValueForRead(key: string, value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  if (BOOLEAN_KEYS.has(key)) return value ? "True" : "False";
  return String(value);
}

async function fetchVisitDetails(noteId: number, signal?: AbortSignal): Promise<NoteDetails> {
  const token = localStorage.getItem("token");
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

async function updateVisitDetails(noteId: number, payload: Record<string, any>): Promise<NoteDetails> {
  const token = localStorage.getItem("token");
  const url = `${API_BASE}/api/visits/note-details?note_id=${encodeURIComponent(String(noteId))}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to save visit details (${res.status})${txt ? ` - ${txt}` : ""}`);
  }
  return res.json();
}

async function fetchInsuranceOptions(signal?: AbortSignal): Promise<InsuranceOptions> {
  const token = localStorage.getItem("token");
  const url = `${API_BASE}/api/visits/insurance-options`;
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
    throw new Error(`Failed to load insurance options (${res.status})${txt ? ` - ${txt}` : ""}`);
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<NoteDetails | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [insuranceOptions, setInsuranceOptions] = useState<InsuranceOptions>({
    primary_insurance: [],
    secondary_insurance: [],
  });
  const cacheRef = useRef<Map<number, NoteDetails>>(new Map());

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const data = await fetchInsuranceOptions(ctrl.signal);
        setInsuranceOptions({
          primary_insurance: data.primary_insurance ?? [],
          secondary_insurance: data.secondary_insurance ?? [],
        });
      } catch {
        // Keep drawer functional even if options endpoint fails.
      }
    })();
    return () => ctrl.abort();
  }, [open]);

  useEffect(() => {
    if (!open || !noteId) return;

    const cached = cacheRef.current.get(noteId);
    if (cached) {
      setDetails(cached);
      setForm(cached);
      setEditing(false);
      setError(null);
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      setSaveMessage(null);
      setEditing(false);
      setDetails(null);
      try {
        const data = await fetchVisitDetails(noteId, ctrl.signal);
        cacheRef.current.set(noteId, data);
        setDetails(data);
        setForm(data);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message ?? "Failed to load visit details");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [open, noteId]);

  const editableKeys = useMemo(() => {
    if (!details) return [];
    return Object.keys(details).filter((k) => EDITABLE_KEYS.has(k));
  }, [details]);

  function setField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave() {
    if (!noteId) return;
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const payload: Record<string, any> = {};
      for (const key of editableKeys) {
        let v = form[key];
        if (NUMBER_KEYS.has(key)) {
          if (v === "" || v === null || v === undefined) v = null;
          else v = Number(v);
        } else if (BOOLEAN_KEYS.has(key)) {
          if (v === "" || v === null || v === undefined) v = null;
          else if (typeof v === "string") v = v === "true";
        } else if (DATE_KEYS.has(key) || DATETIME_KEYS.has(key)) {
          if (v === "" || v === null || v === undefined) v = null;
        }
        payload[key] = v;
      }

      const updated = await updateVisitDetails(noteId, payload);
      cacheRef.current.set(noteId, updated);
      setDetails(updated);
      setForm(updated);
      setEditing(false);
      setSaveMessage("Saved successfully.");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save visit details");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />

      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-slate-200 p-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">Visit / Note Details</div>
              <div className="mt-1 text-xs text-slate-500">
                {visit ? (
                  <>
                    <span className="font-medium text-slate-700">{visit.full_name || "—"}</span>
                    {" • "}DOS {visit.dos || "—"} {" • "}Note #{visit.noteId}
                  </>
                ) : (
                  "No visit selected"
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!editing ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    setSaveMessage(null);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:border-slate-300"
                >
                  Pencil Edit
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setForm(details ?? {});
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:border-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Submit"}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:border-slate-300"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {saveMessage && (
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {saveMessage}
              </div>
            )}

            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading details…</div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            ) : details ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {Object.keys(details).map((key) => {
                    const readOnly = READ_ONLY_KEYS.has(key);
                    const isEditableField = EDITABLE_KEYS.has(key);
                    const value = form[key];
                    const label = labelize(key);

                    return (
                      <div key={key} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="mb-1 text-[11px] font-medium text-slate-500">{label}</div>
                        {!editing || readOnly || !isEditableField ? (
                          <div className="text-sm text-slate-900">{formatValueForRead(key, details[key])}</div>
                        ) : TEXTAREA_KEYS.has(key) ? (
                          <textarea
                            className="min-h-[80px] w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                            value={value ?? ""}
                            onChange={(e) => setField(key, e.target.value)}
                          />
                        ) : BOOLEAN_KEYS.has(key) ? (
                          <select
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                            value={value === null || value === undefined ? "" : String(value)}
                            onChange={(e) => setField(key, e.target.value)}
                          >
                            <option value="">(empty)</option>
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                        ) : DATE_KEYS.has(key) ? (
                          <input
                            type="date"
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                            value={value ? String(value).slice(0, 10) : ""}
                            onChange={(e) => setField(key, e.target.value)}
                          />
                        ) : DATETIME_KEYS.has(key) ? (
                          <input
                            type="datetime-local"
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                            value={value ? toLocalDateTimeInput(String(value)) : ""}
                            onChange={(e) => setField(key, e.target.value)}
                          />
                        ) : NUMBER_KEYS.has(key) ? (
                          <input
                            type="number"
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                            value={value ?? ""}
                            onChange={(e) => setField(key, e.target.value)}
                          />
                        ) : key === "primary_insurance" ? (
                          <>
                            <input
                              type="text"
                              list="primary-insurance-options"
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                              value={value ?? ""}
                              onChange={(e) => setField(key, e.target.value)}
                              placeholder="Search or type a new value"
                            />
                            <datalist id="primary-insurance-options">
                              {insuranceOptions.primary_insurance.map((opt) => (
                                <option key={opt} value={opt} />
                              ))}
                            </datalist>
                          </>
                        ) : key === "secondary_insurance" ? (
                          <>
                            <input
                              type="text"
                              list="secondary-insurance-options"
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                              value={value ?? ""}
                              onChange={(e) => setField(key, e.target.value)}
                              placeholder="Search or type a new value"
                            />
                            <datalist id="secondary-insurance-options">
                              {insuranceOptions.secondary_insurance.map((opt) => (
                                <option key={opt} value={opt} />
                              ))}
                            </datalist>
                          </>
                        ) : (
                          <input
                            type="text"
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                            value={value ?? ""}
                            onChange={(e) => setField(key, e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No details loaded.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
