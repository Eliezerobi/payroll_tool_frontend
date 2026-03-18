import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../../config";
import VisitDetailsDrawer from "../../components/VisitDetailsDrawer";


type BillingBucket = {
  notReadyToBill: number;
  heldForDeductible: number;
  readyToBill: number;
  billed: number;
  sentToBilling: number;
  issues: number;
  paid: number;
  denied: number;
};

type ReconcileBucket = {
  ar: number;
  paid: number;
  reconciled: number;
  denied: number;
};

type DaySummary = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  billing: BillingBucket;
  reconcile: ReconcileBucket;
};

// Raw visit row from backend
type BackendVisitRow = {
  id: number;
  note_id: number;
  note_date: string; // YYYY-MM-DD
  patient_id: number;
  primary_insurance: string | null;
  visiting_therapist: string | null;
  full_name: string | null;
  visit_uid: string | null;
  statusBucket: string | null; // e.g. "unprepared"
  arBucket: string | null; // e.g. "ar"
};

// What the UI displays in tables/cards
type VisitRow = {
  id: number;
  noteId: number;
  patientId: number;
  therapist: string;
  full_name: string;
  visit_uid: string;
  dos: string; // YYYY-MM-DD (from note_date)
  primary_insurance: string;
  statusBucket: string;
  arBucket: string;
  billingBucketKey: string;
  reconcileBucketKey: string;
};

// Day-summary response includes visits
type DaySummaryResponse = DaySummary & {
  visits: BackendVisitRow[];
};

function fromISODate(iso: string) {
  // iso: YYYY-MM-DD (treat as local date)
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function addDaysISO(iso: string, deltaDays: number) {
  const dt = fromISODate(iso);
  dt.setDate(dt.getDate() + deltaDays);
  const y = dt.getFullYear();
  const m = dt.getMonth() + 1;
  const d = dt.getDate();
  return { y, m, d, iso: toISODate(y, m, d) };
}


function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toISODate(y: number, m: number, d: number) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

// --- Accounting-style USD formatter (same pattern as month view) ---
const USD_ACCOUNTING = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
function formatUSDAccounting(value: number) {
  const n = Number(value) || 0;
  if (n < 0) return `(${USD_ACCOUNTING.format(Math.abs(n))})`;
  return USD_ACCOUNTING.format(n);
}

// pagination
const PAGE_SIZE = 5;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function bucketPageKey(viewMode: "billing" | "reconcile", bucketKey: string) {
  return `${viewMode}:${bucketKey}`;
}

/**
 * Map backend statusBucket -> billing bucket key used in UI.
 */
const STATUS_BUCKET_TO_BILLING_KEY: Record<string, keyof BillingBucket> = {
  unprepared: "notReadyToBill",
  held_for_deductible: "heldForDeductible",
  ready_to_bill: "readyToBill",

    // allow alternative names if they appear
  notReadyToBill: "notReadyToBill",
  heldForDeductible: "heldForDeductible",
  readyToBill: "readyToBill",


  sentToBilling: "sentToBilling",
  billed: "billed",
  issues: "issues",
  paid: "paid",
  denied: "denied",
};

/**
 * Map backend arBucket -> reconcile bucket key used in UI.
 */
const AR_BUCKET_TO_RECONCILE_KEY: Record<string, keyof ReconcileBucket> = {
  ar: "ar",
  paid: "paid",
  reconciled: "reconciled",
  denied: "denied",
};

async function fetchDaySummaryWithVisits(dateISO: string): Promise<DaySummaryResponse> {
  const token = localStorage.getItem("token");

  const res = await fetch(
    `${API_BASE}/api/billing/calendar/day-summary?date=${encodeURIComponent(dateISO)}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to load day summary (${res.status}) ${txt ? `- ${txt}` : ""}`);
  }

  return res.json();
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (part / total) * 100));
}

/**
 * Top pill band stays.
 * Legend items are clickable via optional onClick per segment.
 */
function PillBand(props: {
  segments: { key: string; label: string; value: number; className: string; onClick?: () => void }[];
  totalLabel: string;
  format?: (n: number) => string;
}) {
  const total = props.segments.reduce((a, s) => a + s.value, 0);
  const fmt = props.format ?? ((n: number) => n.toLocaleString());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span className="font-medium">{props.totalLabel}</span>
        <span>{fmt(total)}</span>
      </div>

      <div className="h-7 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-50">
        <div className="flex h-full w-full">
          {props.segments.map((s) => {
            const width = pct(s.value, total);
            if (width <= 0) return null;
            return (
              <div
                key={s.key}
                className={`${s.className} h-full`}
                style={{ width: `${width}%` }}
                title={`${s.label}: ${fmt(s.value)}`}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
        {props.segments.map((s) => {
          const clickable = typeof s.onClick === "function";
          const Comp: any = clickable ? "button" : "div";
          return (
            <Comp
              key={s.key}
              type={clickable ? "button" : undefined}
              onClick={s.onClick}
              className={
                clickable
                  ? "inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-slate-100"
                  : "inline-flex items-center gap-1"
              }
              title={clickable ? `Show ${s.label}` : undefined}
            >
              <span className={`inline-block h-2 w-2 rounded-sm ${s.className}`} />
              <span>{s.label}</span>
              <span className="text-slate-400">({fmt(s.value)})</span>
            </Comp>
          );
        })}
      </div>
    </div>
  );
}

function compareVisitUid(a: string, b: string) {
  const aa = (a ?? "").trim();
  const bb = (b ?? "").trim();
  if (!aa && !bb) return 0;
  if (!aa) return 1;
  if (!bb) return -1;
  return aa.localeCompare(bb, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * One bucket = one square card with a table.
 * In grid view: paginate 5 per page.
 * In single-bucket view: pass pageSize very large to effectively disable pagination.
 */
function BucketCard(props: {
  title: string;
  rows: VisitRow[];
  page: number; // 1-based
  pageSize: number;
  onPageChange: (nextPage: number) => void;
  onRowClick?: (row: VisitRow) => void;
}) {
  const { title, rows, page, pageSize, onPageChange } = props;

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = clamp(page, 1, totalPages);

  const startIdx = (safePage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageRows = rows.slice(startIdx, endIdx);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">
          {total.toLocaleString()} rows
          {total > pageSize ? (
            <span className="ml-2">
              (Page {safePage} of {totalPages})
            </span>
          ) : null}
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs text-slate-600">
              <th className="border-b border-slate-200 px-3 py-2">Patient</th>
              <th className="border-b border-slate-200 px-3 py-2">Visit UID</th>
              <th className="border-b border-slate-200 px-3 py-2">Therapist</th>
              <th className="border-b border-slate-200 px-3 py-2">P. Insurance</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={4}>
                  No visits.
                </td>
              </tr>
            ) : (
              pageRows.map((v) => (
                <tr
                  key={String(v.id)}
                  className={
                    props.onRowClick
                      ? "cursor-pointer hover:bg-slate-50"
                      : "hover:bg-slate-50"
                  }
                  onClick={props.onRowClick ? () => props.onRowClick!(v) : undefined}
                  role={props.onRowClick ? "button" : undefined}
                  tabIndex={props.onRowClick ? 0 : undefined}
                  onKeyDown={
                    props.onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") props.onRowClick!(v);
                        }
                      : undefined
                  }
                >
                  <td className="border-b border-slate-100 px-3 py-2">{v.full_name}</td>
                  <td className="border-b border-slate-100 px-3 py-2">{v.visit_uid}</td>
                  <td className="border-b border-slate-100 px-3 py-2">{v.therapist}</td>
                  <td className="border-b border-slate-100 px-3 py-2">{v.primary_insurance}</td>
                </tr>
              ))

            )}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:border-slate-300 disabled:opacity-50"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
          >
            Prev
          </button>

          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 hover:border-slate-300 disabled:opacity-50"
              disabled={safePage <= 1}
              onClick={() => onPageChange(1)}
              title="First page"
            >
              «
            </button>

            <span className="text-slate-600">
              {safePage} / {totalPages}
            </span>

            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 hover:border-slate-300 disabled:opacity-50"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(totalPages)}
              title="Last page"
            >
              »
            </button>
          </div>

          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:border-slate-300 disabled:opacity-50"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function BillingDayView() {
  const navigate = useNavigate();
  const params = useParams();

  // -----------------------------
  // Drawer state
  // -----------------------------
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitRow | null>(null);

  const openVisitDrawer = (v: VisitRow) => {
    setSelectedVisit(v);
    setDrawerOpen(true);
  };

  const closeVisitDrawer = () => {
    setDrawerOpen(false);
    // optional:
    // setSelectedVisit(null);
  };

  // -----------------------------
  // Route params -> date
  // -----------------------------
  const year = Number(params.year);
  const month = Number(params.month);
  const day = Number(params.day);

  const dateISO = useMemo(() => {
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    return toISODate(year, month, day);
  }, [year, month, day]);

  const prevDay = useMemo(() => {
    if (!dateISO) return null;
    return addDaysISO(dateISO, -1);
  }, [dateISO]);

  const nextDay = useMemo(() => {
    if (!dateISO) return null;
    return addDaysISO(dateISO, 1);
  }, [dateISO]);

  function goPrevDay() {
    if (!prevDay) return;
    navigate(`/billing/calendar/${prevDay.y}/${pad2(prevDay.m)}/${pad2(prevDay.d)}`);
  }

  function goNextDay() {
    if (!nextDay) return;
    navigate(`/billing/calendar/${nextDay.y}/${pad2(nextDay.m)}/${pad2(nextDay.d)}`);
  }





  // -----------------------------
  // Data state
  // -----------------------------
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"billing" | "reconcile">("billing");
  const [activeBucket, setActiveBucket] = useState<string | null>(null);

  // paging per bucket (only relevant when showing ALL cards)
  const [pageByBucket, setPageByBucket] = useState<Record<string, number>>({});

  // -----------------------------
  // Fetch day summary + visits
  // -----------------------------
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!dateISO) return;

      setLoading(true);
      setError(null);

      try {
        const data = await fetchDaySummaryWithVisits(dateISO);
        if (!alive) return;

        setSummary({
          year: data.year,
          month: data.month,
          day: data.day,
          billing: {
            notReadyToBill: data.billing?.notReadyToBill ?? 0,
            heldForDeductible: data.billing?.heldForDeductible ?? 0,
            readyToBill: data.billing?.readyToBill ?? 0,
            sentToBilling: data.billing?.sentToBilling ?? 0,
            billed: data.billing?.billed ?? 0,
            issues: data.billing?.issues ?? 0,
            paid: data.billing?.paid ?? 0,
            denied: data.billing?.denied ?? 0,
          },
          reconcile: {
            ar: data.reconcile?.ar ?? 0,
            paid: data.reconcile?.paid ?? 0,
            reconciled: data.reconcile?.reconciled ?? 0,
            denied: data.reconcile?.denied ?? 0,
          },
        });

        const normalized: VisitRow[] = (data.visits ?? []).map((r) => {
          const statusBucket = (r.statusBucket ?? "").trim();
          const arBucket = (r.arBucket ?? "").trim();

          const billingKey = STATUS_BUCKET_TO_BILLING_KEY[statusBucket] ?? "notReadyToBill";
          const reconcileKey = AR_BUCKET_TO_RECONCILE_KEY[arBucket] ?? "ar";

          return {
            id: r.id,
            noteId: r.note_id,
            patientId: r.patient_id,
            therapist: r.visiting_therapist ?? "",
            full_name: r.full_name ?? "",
            visit_uid: r.visit_uid ?? "",
            dos: r.note_date,
            primary_insurance: r.primary_insurance ?? "",
            statusBucket: statusBucket || "",
            arBucket: arBucket || "",
            billingBucketKey: String(billingKey),
            reconcileBucketKey: String(reconcileKey),
          };
        });

        setVisits(normalized);

        // reset view/filter/paging when the day changes
        setViewMode("billing");
        setActiveBucket(null);
        setPageByBucket({});
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load day view");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [dateISO]);

  // -----------------------------
  // Bucket definitions
  // -----------------------------
  const billingBucketsDef = useMemo(
    () => [
      { key: "notReadyToBill", label: "Unprepared" },
      { key: "heldForDeductible", label: "Held for Deductible" }, // ✅ add
      { key: "readyToBill", label: "Ready" },
      { key: "sentToBilling", label: "Sent to Billing" },
      { key: "billed", label: "Billed" },
      { key: "issues", label: "Issues" },
      { key: "paid", label: "Paid" },
      { key: "denied", label: "Denied" },
    ],
    []
  );

  const reconcileBucketsDef = useMemo(
    () => [
      { key: "ar", label: "AR" },
      { key: "paid", label: "Paid" },
      { key: "reconciled", label: "Reconciled" },
      { key: "denied", label: "Denied" },
    ],
    []
  );

  // -----------------------------
  // Bucketed + sorted visits
  // -----------------------------
  const visitsByBillingBucket = useMemo(() => {
    const map = new Map<string, VisitRow[]>();
    for (const b of billingBucketsDef) map.set(b.key, []);

    for (const v of visits) {
      const key = v.billingBucketKey;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }

    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => compareVisitUid(a.visit_uid, b.visit_uid));
      map.set(k, arr);
    }

    return map;
  }, [visits, billingBucketsDef]);

  const visitsByReconcileBucket = useMemo(() => {
    const map = new Map<string, VisitRow[]>();
    for (const b of reconcileBucketsDef) map.set(b.key, []);

    for (const v of visits) {
      const key = v.reconcileBucketKey;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }

    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => compareVisitUid(a.visit_uid, b.visit_uid));
      map.set(k, arr);
    }

    return map;
  }, [visits, reconcileBucketsDef]);

  // -----------------------------
  // Pill segments
  // -----------------------------
  const billingSegments = useMemo(() => {
    if (!summary) return [];
    return [
        {
        key: "notReadyToBill",
        label: "Unprepared",
        value: summary.billing.notReadyToBill,
        className: "bg-gray-200",
        onClick: () => {
          setViewMode("billing");
          setActiveBucket("notReadyToBill");
        },
      },
      {
        key: "heldForDeductible",
        label: "Held for Deductible",
        value: summary.billing.heldForDeductible,
        className: "bg-purple-300", // pick any Tailwind color you like
        onClick: () => {
          setViewMode("billing");
          setActiveBucket("heldForDeductible");
        },
      },
      {
        key: "readyToBill",
        label: "Ready",
        value: summary.billing.readyToBill,
        className: "bg-yellow-300",
        onClick: () => {
          setViewMode("billing");
          setActiveBucket("readyToBill");
        },
      },
      {
        key: "sentToBilling",
        label: "Sent to Billing",
        value: summary.billing.sentToBilling,
        className: "bg-orange-200",
        onClick: () => {
          setViewMode("billing");
          setActiveBucket("sentToBilling");
        },
      },
      {
        key: "billed",
        label: "Billed",
        value: summary.billing.billed,
        className: "bg-sky-400",
        onClick: () => {
          setViewMode("billing");
          setActiveBucket("billed");
        },
      },
      {
        key: "issues",
        label: "Issues",
        value: summary.billing.issues,
        className: "bg-red-400",
        onClick: () => {
          setViewMode("billing");
          setActiveBucket("issues");
        },
      },
      {
        key: "paid",
        label: "Paid",
        value: summary.billing.paid,
        className: "bg-green-500",
        onClick: () => {
          setViewMode("billing");
          setActiveBucket("paid");
        },
      },
      {
        key: "denied",
        label: "Denied",
        value: summary.billing.denied,
        className: "bg-black",
        onClick: () => {
          setViewMode("billing");
          setActiveBucket("denied");
        },
      },
    ];
  }, [summary]);

  const reconcileSegments = useMemo(() => {
    if (!summary) return [];
    return [
      {
        key: "ar",
        label: "AR",
        value: summary.reconcile.ar,
        className: "bg-yellow-200",
        onClick: () => {
          setViewMode("reconcile");
          setActiveBucket("ar");
        },
      },
      {
        key: "paid",
        label: "Paid",
        value: summary.reconcile.paid,
        className: "bg-orange-200",
        onClick: () => {
          setViewMode("reconcile");
          setActiveBucket("paid");
        },
      },
      {
        key: "reconciled",
        label: "Reconciled",
        value: summary.reconcile.reconciled,
        className: "bg-emerald-600",
        onClick: () => {
          setViewMode("reconcile");
          setActiveBucket("reconciled");
        },
      },
      {
        key: "denied",
        label: "Denied",
        value: summary.reconcile.denied,
        className: "bg-black",
        onClick: () => {
          setViewMode("reconcile");
          setActiveBucket("denied");
        },
      },
    ];
  }, [summary]);

  // -----------------------------
  // Active title helper
  // -----------------------------
  const activeTitle = useMemo(() => {
    if (!activeBucket) return null;
    if (viewMode === "billing") {
      return billingBucketsDef.find((b) => b.key === activeBucket)?.label ?? activeBucket;
    }
    return reconcileBucketsDef.find((b) => b.key === activeBucket)?.label ?? activeBucket;
  }, [activeBucket, viewMode, billingBucketsDef, reconcileBucketsDef]);

  // -----------------------------
  // Guard: invalid route
  // -----------------------------
  if (!dateISO) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Invalid route params. Expected /billing/calendar/:year/:month/:day
        </div>
      </div>
    );
  }

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">Day View</div>
          <div className="text-sm text-slate-600">{dateISO}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-300"
            onClick={goPrevDay}
            disabled={!prevDay}
            title="Previous day"
          >
            ← Prev day
          </button>

          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-300"
            onClick={() => navigate(`/billing/calendar/${year}/${pad2(month)}`)}
          >
            Month
          </button>

          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-300"
            onClick={goNextDay}
            disabled={!nextDay}
            title="Next day"
          >
            Next day →
          </button>

          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-300"
            onClick={() => {
              setActiveBucket(null);
              setPageByBucket({});
            }}
            title="Show all bucket cards"
          >
            Clear filter
          </button>
        </div>
      </div>


      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading || !summary ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading…</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <PillBand segments={billingSegments} totalLabel="Billing" />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <PillBand segments={reconcileSegments} totalLabel="Reconcile" format={formatUSDAccounting} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setViewMode("billing");
                setActiveBucket(null);
                setPageByBucket({});
              }}
              className={`rounded-xl border px-3 py-2 text-sm ${
                viewMode === "billing"
                  ? "border-slate-300 bg-slate-900 text-white"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              Billing buckets
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode("reconcile");
                setActiveBucket(null);
                setPageByBucket({});
              }}
              className={`rounded-xl border px-3 py-2 text-sm ${
                viewMode === "reconcile"
                  ? "border-slate-300 bg-slate-900 text-white"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              Reconcile buckets
            </button>

            {activeBucket && (
              <div className="text-sm text-slate-600">
                Showing: <span className="font-semibold">{viewMode}</span> /{" "}
                <span className="font-semibold">{activeTitle}</span>
              </div>
            )}
          </div>

          {/* BUCKET CARDS GRID */}
          {viewMode === "billing" ? (
            activeBucket ? (
              <BucketCard
                title={activeTitle ?? activeBucket}
                rows={visitsByBillingBucket.get(activeBucket) ?? []}
                page={1}
                pageSize={999999}
                onPageChange={() => {}}
                onRowClick={openVisitDrawer}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {billingBucketsDef.map((b) => {
                  const key = bucketPageKey("billing", b.key);
                  const page = pageByBucket[key] ?? 1;
                  return (
                    <BucketCard
                      key={b.key}
                      title={b.label}
                      rows={visitsByBillingBucket.get(b.key) ?? []}
                      page={page}
                      pageSize={PAGE_SIZE}
                      onPageChange={(next) => setPageByBucket((prev) => ({ ...prev, [key]: next }))}
                      onRowClick={openVisitDrawer}
                    />
                  );
                })}
              </div>
            )
          ) : activeBucket ? (
            <BucketCard
              title={activeTitle ?? activeBucket}
              rows={visitsByReconcileBucket.get(activeBucket) ?? []}
              page={1}
              pageSize={999999}
              onPageChange={() => {}}
              onRowClick={openVisitDrawer}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {reconcileBucketsDef.map((b) => {
                const key = bucketPageKey("reconcile", b.key);
                const page = pageByBucket[key] ?? 1;
                return (
                  <BucketCard
                    key={b.key}
                    title={b.label}
                    rows={visitsByReconcileBucket.get(b.key) ?? []}
                    page={page}
                    pageSize={PAGE_SIZE}
                    onPageChange={(next) => setPageByBucket((prev) => ({ ...prev, [key]: next }))}
                    onRowClick={openVisitDrawer}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Drawer (kept OUT of the bucket/table code) */}
      <VisitDetailsDrawer open={drawerOpen} onClose={closeVisitDrawer} visit={selectedVisit} />
    </div>
  );
}
