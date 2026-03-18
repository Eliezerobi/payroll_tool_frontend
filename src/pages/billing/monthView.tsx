import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../../config";


type MonthBuckets = {
  billing: BillingBucket;
  reconcile: ReconcileBucket;
};

type MonthSummaryResponse = {
  year: number;
  month: number;
} & MonthBuckets & {
  days: Array<{ day: number } & MonthBuckets>;
};

type BillingBucket = {
  notReadyToBill: number;
  heldForDeductible: number;
  readyToBill: number;
  sentToBilling: number;
  billed: number;
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

export type DaySummary = {
  date: string; // YYYY-MM-DD
  billing: BillingBucket;
  reconcile: ReconcileBucket;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (part / total) * 100));
}

function sumBilling(b: BillingBucket) {
  return b.notReadyToBill +  b.heldForDeductible + b.readyToBill +  b.sentToBilling + b.billed + b.issues + b.paid + b.denied;
}

function sumReconcile(r: ReconcileBucket) {
  return r.ar + r.paid + r.reconciled + r.denied;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(y: number, m1to12: number, d: number) {
  return `${y}-${pad2(m1to12)}-${pad2(d)}`;
}

function daysInMonth(year: number, month1to12: number) {
  return new Date(year, month1to12, 0).getDate();
}

function weekdayOfFirst(year: number, month1to12: number) {
  // JS month is 0-based
  return new Date(year, month1to12 - 1, 1).getDay(); // 0=Sun..6=Sat
}

/**
 * Placeholder month summary.
 * Replace later with GET /billing/calendar/month-summary?year=YYYY&month=MM
 */
async function fetchMonthSummary(year: number, month: number): Promise<DaySummary[]> {
  const token = localStorage.getItem("token"); // adjust key if needed

  const res = await fetch(
    `${API_BASE}/api/billing/calendar/month-summary?year=${year}&month=${month}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to load month summary (${res.status})`);
  }

  const data: MonthSummaryResponse = await res.json();

  // Convert backend "days" into the DaySummary[] your UI already expects
  return data.days.map((d) => ({
    date: toISODate(data.year, data.month, d.day),
    billing: d.billing,
    reconcile: d.reconcile,
  }));
}


/**
 * Pill band component (same concept as year view).
 */
function PillBand(props: {
  segments: { key: string; label: string; value: number; className: string }[];
  totalLabel: string;
  format?: (n: number) => string;
}) {
  const total = props.segments.reduce((a, s) => a + s.value, 0);
  const fmt = props.format ?? ((n: number) => n.toLocaleString());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] text-slate-600">
        <span className="font-medium">{props.totalLabel}</span>
        <span>{fmt(total)}</span>
      </div>

      <div className="h-5 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-50">
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

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-600">
        {props.segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-sm ${s.className}`} />
            <span>{s.label}</span>
            <span className="text-slate-400">({fmt(s.value)})</span>
          </div>
        ))}
      </div>
    </div>
  );
}


function DayCell(props: {
  day: number;
  isoDate: string;
  summary?: DaySummary;
  onClick: () => void;
}) {
  const { summary } = props;

  const billingSegments = useMemo(() => {
    const b = summary?.billing ?? {
      notReadyToBill: 0,  heldForDeductible: 0, readyToBill: 0, sentToBilling: 0, billed: 0, issues: 0, paid: 0, denied: 0,
    };
    return [
      { key: "unprepared", label: "Unprepared", value: b.notReadyToBill, className: "bg-gray-200" },
      { key: "heldForDeductible", label: "Held for Deductible", value: b.heldForDeductible, className: "bg-orange-400" },
      { key: "ready", label: "Ready", value: b.readyToBill, className: "bg-yellow-300" },
      { key: "sentToBilling", label: "Sent to Billing", value: b.sentToBilling, className: "bg-orange-200" },
      { key: "billed", label: "Billed", value: b.billed, className: "bg-sky-400" },
      { key: "issues", label: "Issues", value: b.issues, className: "bg-red-400" },
      { key: "paid", label: "Paid", value: b.paid, className: "bg-green-500" },
      { key: "denied", label: "Denied", value: b.denied, className: "bg-black" },
    ];
  }, [summary]);

  const reconcileSegments = useMemo(() => {
    const r = summary?.reconcile ?? { ar: 0, paid: 0, reconciled: 0, denied: 0 };
    return [
      { key: "ar", label: "AR", value: r.ar, className: "bg-yellow-200" },
      { key: "paid", label: "Paid", value: r.paid, className: "bg-orange-200" },
      { key: "reconciled", label: "Reconciled", value: r.reconciled, className: "bg-emerald-600" },
      { key: "denied", label: "Denied", value: r.denied, className: "bg-black" },
    ];
  }, [summary]);

  const billingTotal = summary ? sumBilling(summary.billing) : 0;
  const reconcileTotal = summary ? sumReconcile(summary.reconcile) : 0;

  return (
    <button
      type="button"
      onClick={props.onClick}
      className="group flex h-full w-full flex-col rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
      title={props.isoDate}
    >
      <div className="flex items-start justify-between">
        <div className="text-sm font-semibold text-slate-900">{props.day}</div>
        <div className="text-right text-[11px] text-slate-600">
          <div>
            B: <span className="font-semibold">{billingTotal.toLocaleString()}</span>
          </div>
          <div>
            R: <span className="font-semibold">{formatUSDAccounting(reconcileTotal)}</span>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-3">
        <PillBand segments={billingSegments} totalLabel="Billing" />
        <PillBand
          segments={reconcileSegments}
          totalLabel="Reconcile"
          format={formatUSDAccounting}
        />
      </div>

      <div className="mt-auto pt-2 text-[11px] text-slate-500 group-hover:text-slate-700">
        Click to open day →
      </div>
    </button>
  );
}

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



export default function BillingMonthView() {
  const navigate = useNavigate();
  const params = useParams();

  // Expected route: /billing/calendar/:year/:month
  const routeYear = Number(params.year);
  const routeMonth = Number(params.month);

  const now = new Date();
  const initialYear = Number.isFinite(routeYear) && routeYear > 1900 ? routeYear : now.getFullYear();
  const initialMonth =
    Number.isFinite(routeMonth) && routeMonth >= 1 && routeMonth <= 12 ? routeMonth : now.getMonth() + 1;

  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // keep state in sync if route changes externally
  useEffect(() => {
    if (Number.isFinite(routeYear) && routeYear > 1900 && routeYear !== year) setYear(routeYear);
    if (Number.isFinite(routeMonth) && routeMonth >= 1 && routeMonth <= 12 && routeMonth !== month) setMonth(routeMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.year, params.month]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMonthSummary(year, month);
        if (!alive) return;
        setDays(data);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load month summary");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [year, month]);

  const totalDays = daysInMonth(year, month);
  const firstWeekday = weekdayOfFirst(year, month);

  const byDate = useMemo(() => {
    const m = new Map<string, DaySummary>();
    for (const d of days) m.set(d.date, d);
    return m;
  }, [days]);

  function goPrevMonth() {
    const prev = new Date(year, month - 2, 1); // month-2 because month is 1-based
    const y = prev.getFullYear();
    const m = prev.getMonth() + 1;
    setYear(y);
    setMonth(m);
    navigate(`/billing/calendar/${y}/${pad2(m)}`);
  }

  function goNextMonth() {
    const next = new Date(year, month, 1); // month because month is 1-based
    const y = next.getFullYear();
    const m = next.getMonth() + 1;
    setYear(y);
    setMonth(m);
    navigate(`/billing/calendar/${y}/${pad2(m)}`);
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">
            {MONTH_LABELS[month - 1]} {year}
          </div>
          <div className="text-sm text-slate-600">Month view → click a day to drill into visits.</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-300"
            onClick={goPrevMonth}
          >
            ← Prev
          </button>

          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-300"
            onClick={() => navigate(`/billing/calendar`)}
          >
            Year
          </button>

          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-300"
            onClick={goNextMonth}
          >
            Next →
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading…</div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-7 gap-2">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="px-2 pb-1 text-xs font-semibold text-slate-600">
                {d}
              </div>
            ))}

            {Array.from({ length: firstWeekday }, (_, i) => (
              <div key={`pad-${i}`} />
            ))}

            {Array.from({ length: totalDays }, (_, i) => {
              const day = i + 1;
              const iso = toISODate(year, month, day);
              const summary = byDate.get(iso);

              return (
                <div key={iso} className="min-h-[220px]">
                  <DayCell
                    day={day}
                    isoDate={iso}
                    summary={summary}
                    onClick={() => navigate(`/billing/calendar/${year}/${pad2(month)}/${pad2(day)}`)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
