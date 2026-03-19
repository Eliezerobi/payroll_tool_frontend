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
  full_name: string;
  visiting_therapist: string;
  primary_insurance: string;
  secondary_insurance: string;
  diagnosis: string;
  medical_diagnosis: string;
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
    const map = new Map<string, { patientLabel: string; patientId: number | null; rows: UnpreparedVisit[] }>();
    for (const v of filteredVisits) {
      const patientId = v.patient_id ?? "unknown";
      const patientName = (v.full_name || "").trim() || `Patient ${patientId}`;
      const key = `${patientId}|${patientName}`;
      if (!map.has(key)) {
        map.set(key, { patientLabel: patientName, patientId: v.patient_id ?? null, rows: [] });
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
              key={group.patientLabel}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
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
    </div>
  );
}
