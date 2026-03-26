import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../../config";
import VisitDetailsDrawer from "../../components/VisitDetailsDrawer";

type UnpreparedVisit = {
  id: number;
  note_date: string;
  note_id: number;
  note: string;
  patient_id: number;
  case_id: number | null;
  case_description: string;
  primary_ins_id: string;
  full_name: string;
  visiting_therapist: string;
  primary_insurance: string;
  secondary_ins_id: string;
  secondary_insurance: string;
  ref_provider_npi: string;
  referring_provider: string;
  diagnosis: string;
  medical_diagnosis: string;
  cpt_code: string;
  auth_number: string;
  rendering_provider_npi: string;
  visit_uid: string;
  issue_keys: string[];
  issue_labels: string[];
};

type UnpreparedResponse = {
  total: number;
  count: number;
  limit: number;
  offset: number;
  issue_labels?: Record<string, string>;
  visits: UnpreparedVisit[];
};

type InsuranceOptions = {
  primary_insurance: string[];
  secondary_insurance: string[];
};

const FETCH_BATCH = 500;

const ISSUE_ORDER = [
  "primary_insurance",
  "secondary_insurance",
  "diagnosis",
  "medical_diagnosis",
  "diagnosis_blocked_code",
] as const;

const FALLBACK_ISSUE_LABELS: Record<string, string> = {
  primary_insurance: "Primary Insurance",
  secondary_insurance: "Secondary Insurance",
  diagnosis: "Diagnosis",
  medical_diagnosis: "Medical Diagnosis",
  diagnosis_blocked_code: "Diagnosis Blocked Code",
};

type IssueKey = "all" | (typeof ISSUE_ORDER)[number];
type DateSort = "desc" | "asc";
type BulkEditField =
  | "primary_insurance"
  | "secondary_insurance"
  | "primary_ins_id"
  | "secondary_ins_id"
  | "ref_provider_npi"
  | "referring_provider"
  | "diagnosis"
  | "visiting_therapist"
  | "cpt_code"
  | "auth_number"
  | "medical_diagnosis"
  | "rendering_provider_npi";

type BulkEditForm = Record<BulkEditField, string>;

type DrawerVisit = {
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

export default function BillingIssuesView() {
  const [visits, setVisits] = useState<UnpreparedVisit[]>([]);
  const [issueLabels, setIssueLabels] = useState<Record<string, string>>(FALLBACK_ISSUE_LABELS);
  const [total, setTotal] = useState(0);
  const [activeIssue, setActiveIssue] = useState<IssueKey>("all");
  const [dateSort, setDateSort] = useState<DateSort>("desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<DrawerVisit | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditSaving, setBulkEditSaving] = useState(false);
  const [bulkEditError, setBulkEditError] = useState<string | null>(null);
  const [bulkEditPatientKey, setBulkEditPatientKey] = useState<string | null>(null);
  const [insuranceOptions, setInsuranceOptions] = useState<InsuranceOptions>({
    primary_insurance: [],
    secondary_insurance: [],
  });
  const [bulkEditForm, setBulkEditForm] = useState<BulkEditForm>({
    primary_insurance: "",
    secondary_insurance: "",
    primary_ins_id: "",
    secondary_ins_id: "",
    ref_provider_npi: "",
    referring_provider: "",
    diagnosis: "",
    visiting_therapist: "",
    cpt_code: "",
    auth_number: "",
    medical_diagnosis: "",
    rendering_provider_npi: "",
  });

  const openVisitDrawer = (v: UnpreparedVisit) => {
    setSelectedVisit({
      id: v.id,
      noteId: v.note_id,
      patientId: v.patient_id,
      therapist: v.visiting_therapist || "",
      full_name: v.full_name || "",
      visit_uid: v.visit_uid || "",
      dos: v.note_date,
      primary_insurance: v.primary_insurance || "",
      statusBucket: "issues",
      arBucket: "ar",
      billingBucketKey: "issues",
      reconcileBucketKey: "ar",
    });
    setDrawerOpen(true);
  };

  const closeVisitDrawer = () => {
    setDrawerOpen(false);
  };

  const openBulkEdit = (patientKey: string) => {
    setBulkEditPatientKey(patientKey);
    setBulkEditError(null);
    setBulkEditForm({
      primary_insurance: "",
      secondary_insurance: "",
      primary_ins_id: "",
      secondary_ins_id: "",
      ref_provider_npi: "",
      referring_provider: "",
      diagnosis: "",
      visiting_therapist: "",
      cpt_code: "",
      auth_number: "",
      medical_diagnosis: "",
      rendering_provider_npi: "",
    });
    setBulkEditOpen(true);
  };

  const closeBulkEdit = () => {
    setBulkEditOpen(false);
    setBulkEditPatientKey(null);
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        let allVisits: UnpreparedVisit[] = [];
        let nextOffset = 0;
        let expectedTotal = 0;
        let firstResponse = true;
        let latestIssueLabels: Record<string, string> | null = null;

        while (true) {
          const res = await fetch(
            `${API_BASE}/api/billing/unprepared?limit=${FETCH_BATCH}&offset=${nextOffset}`,
            {
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            }
          );

          if (!res.ok) {
            throw new Error(`Failed to load issues (${res.status})`);
          }

          const data: UnpreparedResponse = await res.json();
          if (firstResponse) {
            expectedTotal = data.total ?? 0;
            firstResponse = false;
            if (data.issue_labels) {
              latestIssueLabels = data.issue_labels;
            }
          }

          const batch = data.visits ?? [];
          allVisits = allVisits.concat(batch);
          nextOffset += batch.length;

          if (batch.length === 0 || allVisits.length >= expectedTotal) {
            break;
          }
        }

        if (!alive) return;

        setVisits(allVisits);
        setTotal(expectedTotal || allVisits.length);
        if (latestIssueLabels) {
          setIssueLabels({ ...FALLBACK_ISSUE_LABELS, ...latestIssueLabels });
        }
      } catch (e) {
        if (!alive) return;
        setError((e as Error).message || "Failed to load issues");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/visits/insurance-options`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) return;
        const data = (await res.json()) as InsuranceOptions;
        if (!alive) return;
        setInsuranceOptions({
          primary_insurance: data.primary_insurance ?? [],
          secondary_insurance: data.secondary_insurance ?? [],
        });
      } catch {
        // keep page functional without blocking bulk edit
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const issueCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: visits.length,
      ...Object.fromEntries(ISSUE_ORDER.map((k) => [k, 0])),
    };

    for (const v of visits) {
      const uniqueIssues = new Set(v.issue_keys || []);
      for (const key of uniqueIssues) {
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }

    return counts;
  }, [visits]);

  const filteredVisits = useMemo(() => {
    if (activeIssue === "all") return visits;
    return visits.filter((v) => (v.issue_keys || []).includes(activeIssue));
  }, [activeIssue, visits]);

  const groupedByPatient = useMemo(() => {
    const map = new Map<string, { patientKey: string; patientLabel: string; patientId: number | null; rows: UnpreparedVisit[] }>();
    for (const v of filteredVisits) {
      const patientId = v.patient_id ?? "unknown";
      const patientName = (v.full_name || "").trim() || `Patient ${patientId}`;
      const key = `${patientId}|${patientName}`;
      if (!map.has(key)) {
        map.set(key, { patientKey: key, patientLabel: patientName, patientId: v.patient_id ?? null, rows: [] });
      }
      map.get(key)!.rows.push(v);
    }

    const groups = Array.from(map.values());
    groups.sort((a, b) => {
      const aAnchorDate =
        dateSort === "asc"
          ? a.rows.reduce((min, row) => (!min || row.note_date < min ? row.note_date : min), "")
          : a.rows.reduce((max, row) => (!max || row.note_date > max ? row.note_date : max), "");

      const bAnchorDate =
        dateSort === "asc"
          ? b.rows.reduce((min, row) => (!min || row.note_date < min ? row.note_date : min), "")
          : b.rows.reduce((max, row) => (!max || row.note_date > max ? row.note_date : max), "");

      if (aAnchorDate === bAnchorDate) {
        return a.patientLabel.localeCompare(b.patientLabel);
      }
      if (dateSort === "asc") {
        return aAnchorDate < bAnchorDate ? -1 : 1;
      }
      return aAnchorDate > bAnchorDate ? -1 : 1;
    });
    for (const g of groups) {
      g.rows.sort((a, b) =>
        dateSort === "desc"
          ? (a.note_date < b.note_date ? 1 : -1)
          : (a.note_date > b.note_date ? 1 : -1)
      );
    }
    return groups;
  }, [filteredVisits, dateSort]);

  const selectedBulkGroup = useMemo(
    () => groupedByPatient.find((g) => g.patientKey === bulkEditPatientKey) ?? null,
    [groupedByPatient, bulkEditPatientKey]
  );

  const bulkPlaceholders = useMemo(() => {
    const out: Record<BulkEditField, string> = {
      primary_insurance: "",
      secondary_insurance: "",
      primary_ins_id: "",
      secondary_ins_id: "",
      ref_provider_npi: "",
      referring_provider: "",
      diagnosis: "",
      visiting_therapist: "",
      cpt_code: "",
      auth_number: "",
      medical_diagnosis: "",
      rendering_provider_npi: "",
    };
    if (!selectedBulkGroup) return out;

    const keys = Object.keys(out) as BulkEditField[];
    for (const key of keys) {
      const distinct = new Set<string>();
      for (const row of selectedBulkGroup.rows) {
        const val = String((row as any)[key] ?? "").trim();
        if (val) distinct.add(val);
      }
      if (distinct.size === 1) out[key] = Array.from(distinct)[0];
      else if (distinct.size > 1) out[key] = "many";
      else out[key] = "";
    }
    return out;
  }, [selectedBulkGroup]);

  async function submitBulkEdit() {
    if (!selectedBulkGroup) return;
    setBulkEditSaving(true);
    setBulkEditError(null);
    try {
      const token = localStorage.getItem("token");
      const updates: Partial<BulkEditForm> = {};
      for (const [k, v] of Object.entries(bulkEditForm)) {
        if ((v ?? "").trim() !== "") {
          updates[k as BulkEditField] = v;
        }
      }
      if (Object.keys(updates).length === 0) {
        throw new Error("Enter at least one field to update.");
      }

      const noteIds = Array.from(
        new Set(selectedBulkGroup.rows.map((r) => r.note_id).filter((n): n is number => Boolean(n)))
      );
      if (!noteIds.length) {
        throw new Error("No note IDs found for this patient group.");
      }

      const res = await fetch(`${API_BASE}/api/visits/bulk-update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          note_ids: noteIds,
          updates,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Bulk update failed (${res.status})${txt ? ` - ${txt}` : ""}`);
      }

      const updatedRows = selectedBulkGroup.rows.map((row) => ({
        ...row,
        ...updates,
      }));
      const updatedById = new Map(updatedRows.map((r) => [r.id, r]));
      setVisits((prev) => prev.map((v) => updatedById.get(v.id) ?? v));

      closeBulkEdit();
    } catch (e) {
      setBulkEditError((e as Error).message || "Failed bulk update");
    } finally {
      setBulkEditSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-bold text-slate-900">Issues</div>
          <div className="text-sm text-slate-600">
            All unprepared visits across dates.
          </div>
        </div>

        <div className="text-sm text-slate-600">
          Total unprepared: <span className="font-semibold">{total.toLocaleString()}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveIssue("all")}
          className={`rounded-full px-3 py-1.5 text-sm ${
            activeIssue === "all"
              ? "bg-slate-900 text-white"
              : "border border-slate-300 bg-white text-slate-700"
          }`}
        >
          All ({issueCounts.all ?? 0})
        </button>
        {ISSUE_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveIssue(key)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              activeIssue === key
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            {issueLabels[key] ?? key} ({issueCounts[key] ?? 0})
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-slate-600">Sort by date:</span>
        <button
          type="button"
          onClick={() => setDateSort("desc")}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            dateSort === "desc"
              ? "bg-slate-900 text-white"
              : "border border-slate-300 bg-white text-slate-700"
          }`}
        >
          Newest first
        </button>
        <button
          type="button"
          onClick={() => setDateSort("asc")}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            dateSort === "asc"
              ? "bg-slate-900 text-white"
              : "border border-slate-300 bg-white text-slate-700"
          }`}
        >
          Oldest first
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading issues...
        </div>
      ) : groupedByPatient.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No problematic notes found for this issue.
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByPatient.map((group) => (
            <div
              key={group.patientKey}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">
                    {group.patientId ? (
                      <a
                        href={`https://emr.appv2.hellonote.com/app/main/patients/${group.patientId}/information`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 underline hover:text-blue-900"
                      >
                        {group.patientLabel}
                      </a>
                    ) : (
                      group.patientLabel
                    )}
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-slate-400"
                    onClick={() => openBulkEdit(group.patientKey)}
                  >
                    Bulk Edit Patient
                  </button>
                </div>
                <div className="text-xs text-slate-600">
                  {group.rows.length} problematic note{group.rows.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs text-slate-600">
                      <th className="border-b border-slate-200 px-3 py-2">DOS</th>
                      <th className="border-b border-slate-200 px-3 py-2">Note</th>
                      <th className="border-b border-slate-200 px-3 py-2">Case</th>
                      <th className="border-b border-slate-200 px-3 py-2">Therapist</th>
                      <th className="border-b border-slate-200 px-3 py-2">Primary Insurance</th>
                      <th className="border-b border-slate-200 px-3 py-2">Secondary Insurance</th>
                      <th className="border-b border-slate-200 px-3 py-2">Diagnosis</th>
                      <th className="border-b border-slate-200 px-3 py-2">Medical Diagnosis</th>
                      <th className="border-b border-slate-200 px-3 py-2">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((v) => (
                      <tr
                        key={v.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => openVisitDrawer(v)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") openVisitDrawer(v);
                        }}
                      >
                        <td className="border-b border-slate-100 px-3 py-2">{v.note_date}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{v.note || "-"}</td>
                        <td className="border-b border-slate-100 px-3 py-2">
                          {v.patient_id && v.case_id ? (
                            <a
                              href={`https://emr.appv2.hellonote.com/app/main/patients/${v.patient_id}/cases/${v.case_id}/notes`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 underline hover:text-blue-900"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {v.case_description || `Case ${v.case_id}`}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2">{v.visiting_therapist || "-"}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{v.primary_insurance || "-"}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{v.secondary_insurance || "-"}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{v.diagnosis || "-"}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{v.medical_diagnosis || "-"}</td>
                        <td className="border-b border-slate-100 px-3 py-2">
                          {(v.issue_labels || []).join(", ") || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <VisitDetailsDrawer open={drawerOpen} onClose={closeVisitDrawer} visit={selectedVisit} />

      {bulkEditOpen && selectedBulkGroup && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={closeBulkEdit} aria-hidden="true" />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between border-b border-slate-200 p-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Bulk Edit Patient Issues</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {selectedBulkGroup.patientLabel} • {selectedBulkGroup.rows.length} notes
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeBulkEdit}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:border-slate-300"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {bulkEditError && (
                  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {bulkEditError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {(Object.keys(bulkEditForm) as BulkEditField[]).map((key) => (
                    <div key={key} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="mb-1 text-[11px] font-medium text-slate-500">
                        {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </div>
                      {key === "primary_insurance" ? (
                        <>
                          <input
                            type="text"
                            list="bulk-primary-insurance-options"
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                            value={bulkEditForm[key]}
                            onChange={(e) =>
                              setBulkEditForm((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            placeholder={bulkPlaceholders[key] || "Leave blank to keep unchanged"}
                          />
                          <datalist id="bulk-primary-insurance-options">
                            {insuranceOptions.primary_insurance.map((opt) => (
                              <option key={opt} value={opt} />
                            ))}
                          </datalist>
                        </>
                      ) : key === "secondary_insurance" ? (
                        <>
                          <input
                            type="text"
                            list="bulk-secondary-insurance-options"
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                            value={bulkEditForm[key]}
                            onChange={(e) =>
                              setBulkEditForm((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            placeholder={bulkPlaceholders[key] || "Leave blank to keep unchanged"}
                          />
                          <datalist id="bulk-secondary-insurance-options">
                            {insuranceOptions.secondary_insurance.map((opt) => (
                              <option key={opt} value={opt} />
                            ))}
                          </datalist>
                        </>
                      ) : (
                        <input
                          type="text"
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                          value={bulkEditForm[key]}
                          onChange={(e) =>
                            setBulkEditForm((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          placeholder={bulkPlaceholders[key] || "Leave blank to keep unchanged"}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 p-4">
                <button
                  type="button"
                  onClick={submitBulkEdit}
                  disabled={bulkEditSaving}
                  className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {bulkEditSaving ? "Saving..." : "Submit Bulk Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
