import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../config";

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

export type MonthSummary = {
  year: number;
  month: number; // 1-12
  billing: BillingBucket;
  reconcile: ReconcileBucket;
};

async function fetchYearSummary(year: number): Promise<MonthSummary[]> {
  const token = localStorage.getItem("token"); // adjust key if yours differs

  const res = await fetch(`${API_BASE}/api/billing/calendar/year-summary?year=${year}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to load year summary (${res.status})`);
  }

  return res.json();
}



const MONTH_LABELS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

function sumBilling(b: BillingBucket) {
  return (
    (b.notReadyToBill ?? 0) +
    (b.heldForDeductible ?? 0) + 
    (b.readyToBill ?? 0) +
    (b.sentToBilling ?? 0) +
    (b.billed ?? 0) +
    (b.issues ?? 0) +
    (b.paid ?? 0) +
    (b.denied ?? 0)
  );
}


function sumReconcile(r: ReconcileBucket) {
  return (r.ar ?? 0) + (r.paid ?? 0) + (r.reconciled ?? 0) + (r.denied ?? 0);
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (part / total) * 100));
}

/**
 * "Pill band" = a single rounded bar split into segments by percent.
 * Uses Tailwind default colors; adjust to your preference.
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


function MonthCard(props: { summary: MonthSummary; onClick: () => void }) {
  const { summary } = props;

  const billingSegments = useMemo(
    () => [
      { key: "unprepared", label: "Unprepared", value: summary.billing.notReadyToBill ?? 0, className: "bg-gray-200" },
      { key: "heldForDeductible", label: "Held for Deductible", value: summary.billing.heldForDeductible ?? 0, className: "bg-orange-400" },
      { key: "ready", label: "Ready", value: summary.billing.readyToBill ?? 0, className: "bg-yellow-300" },
      { key: "sentToBilling", label: "Sent to Billing", value: summary.billing.sentToBilling ?? 0, className: "bg-orange-200" },
      { key: "billed", label: "Billed", value: summary.billing.billed ?? 0, className: "bg-sky-400" },
      { key: "issues", label: "Issues", value: summary.billing.issues ?? 0, className: "bg-red-400" },
      { key: "paid", label: "Paid", value: summary.billing.paid ?? 0, className: "bg-green-500" },
      { key: "denied", label: "Denied", value: summary.billing.denied ?? 0, className: "bg-black" },

    ],
    [summary]
  );

  const reconcileSegments = useMemo(
    () => [
      { key: "ar", label: "AR", value: summary.reconcile.ar, className: "bg-yellow-200" },
      { key: "paid", label: "Paid", value: summary.reconcile.paid, className: "bg-orange-200" },
      { key: "reconciled", label: "Reconciled", value: summary.reconcile.reconciled, className: "bg-emerald-600" },
      { key: "denied", label: "Denied", value: summary.reconcile.denied, className: "bg-black" }, // to match billing colors
    ],
    [summary]
  );

  const billingTotal = sumBilling(summary.billing);
  const reconcileTotal = sumReconcile(summary.reconcile);

  const USD_ACCOUNTING = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Accounting-style: negatives as (1,234) instead of -1,234
  function formatUSDAccounting(value: number) {
    if (value == null) return USD_ACCOUNTING.format(0);
    const n = Number(value) || 0;
    if (n < 0) return `(${USD_ACCOUNTING.format(Math.abs(n))})`;
    return USD_ACCOUNTING.format(n);
  }





  return (
    <button
      type="button"
      onClick={props.onClick}
      className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {MONTH_LABELS[summary.month - 1]}
          </div>
          <div className="text-xs text-slate-500">{summary.year}</div>
        </div>

        <div className="text-right text-xs text-slate-600">
          <div>
            Billing: <span className="font-semibold">{billingTotal.toLocaleString()}</span>
          </div>
          <div>
            Recon: <span className="font-semibold">{formatUSDAccounting(reconcileTotal)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <PillBand segments={billingSegments} totalLabel="Billing" />
        <PillBand
          segments={reconcileSegments}
          totalLabel="Reconcile"
          format={formatUSDAccounting}
        />      
      </div>

      <div className="mt-4 text-xs text-slate-500 group-hover:text-slate-700">
        Click to open month →
      </div>
    </button>
  );
}

export default function BillingYearView() {
  const navigate = useNavigate();

  const [year, setYear] = useState<number>(() => new Date().getFullYear());
  const [months, setMonths] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchYearSummary(year);
        if (!alive) return;
        // Ensure sorted 1..12
        setMonths([...data].sort((a, b) => a.month - b.month));
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load year summary");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [year]);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">Calendar</div>
          <div className="text-sm text-slate-600">12-month overview → click a month to drill in.</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-300"
            onClick={() => setYear((y) => y - 1)}
          >
            ← {year - 1}
          </button>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">
            {year}
          </div>

          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-300"
            onClick={() => setYear((y) => y + 1)}
          >
            {year + 1} →
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {months.map((m) => (
            <MonthCard
              key={`${m.year}-${m.month}`}
              summary={m}
              onClick={() => navigate(`/billing/calendar/${m.year}/${String(m.month).padStart(2, "0")}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
