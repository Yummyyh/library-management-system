import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BookOpen, CheckCircle2, CircleDollarSign,
  Clock, Library, RefreshCw, TrendingUp, Users,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { dashboardAPI } from '@/lib/api';

// ── Constants ────────────────────────────────────────────────
const COLORS = ['#059669', '#14b8a6', '#f97316', '#8b5cf6', '#ef4444', '#22c55e', '#f59e0b'];

// ── Formatters ───────────────────────────────────────────────
function numberFormat(value) {
  return new Intl.NumberFormat('en-US').format(value || 0);
}
function moneyFormat(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CNY' }).format(value || 0);
}

// ── StatCard — emerald‑themed frosted variant ────────────────
function StatCard({ title, value, subtitle, icon: Icon, tone = 'emerald' }) {
  const iconBg = {
    emerald: 'bg-emerald-600',
    teal:    'bg-teal-500',
    orange:  'bg-orange-500',
    purple:  'bg-purple-500',
    red:     'bg-red-500',
    blue:    'bg-blue-600',
  }[tone] || 'bg-emerald-600';

  const valueColor = {
    emerald: 'text-emerald-700',
    teal:    'text-teal-700',
    orange:  'text-orange-700',
    purple:  'text-purple-700',
    red:     'text-red-700',
    blue:    'text-blue-700',
  }[tone] || 'text-emerald-700';

  return (
    <div className="flex items-start justify-between gap-4 p-5 rounded-2xl
                    bg-white/60 backdrop-blur-sm border border-white/30
                    shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        <strong className={`block mt-2 mb-1 text-2xl font-extrabold tracking-tight ${valueColor}`}>{value}</strong>
        <span className="text-xs text-gray-400">{subtitle}</span>
      </div>
      <div className={`grid place-items-center w-11 h-11 rounded-xl text-white shrink-0 ${iconBg}`}>
        <Icon size={20} />
      </div>
    </div>
  );
}

// ── Panel — chart / list wrapper ─────────────────────────────
function Panel({ title, children }) {
  return (
    <div className="p-5 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/30 shadow-sm">
      <h2 className="text-base font-bold text-gray-700 mb-3 tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

// ── RankingList ──────────────────────────────────────────────
function RankingList({ items, emptyText }) {
  if (!items?.length) {
    return <div className="py-10 text-center text-sm text-gray-400 bg-gray-50/60 rounded-xl">{emptyText}</div>;
  }
  return (
    <div className="grid gap-2.5">
      {items.map((item, index) => (
        <div key={item.id || item.title}
             className="grid grid-cols-[36px_1fr_auto] items-center gap-3 p-3 rounded-xl
                        bg-emerald-50/40 border border-emerald-100/40">
          <span className="grid place-items-center w-8 h-8 rounded-lg text-white text-xs font-extrabold
                           bg-gradient-to-br from-emerald-600 to-teal-500">
            {index + 1}
          </span>
          <div className="min-w-0">
            <strong className="block text-sm text-gray-800 truncate">{item.title}</strong>
            <p className="text-xs text-gray-400">{item.author || 'Unknown author'}</p>
          </div>
          <em className="not-italic text-sm font-extrabold text-emerald-600">
            {item.count} {item.count === 1 ? 'time' : 'times'}
          </em>
        </div>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const data = await dashboardAPI.getSummary();
      setDashboard(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  // Map backend role/status labels to display‑friendly English
  const ROLE_LABEL = { STUDENT: 'Reader', LIBRARIAN: 'Librarian', ADMIN: 'Administrator' };
  const STATUS_LABEL = { ACTIVE: 'Active', DEACTIVATED: 'Deactivated' };

  const roleData   = useMemo(() =>
    (dashboard?.users?.byRole || []).map(r => ({ ...r, name: ROLE_LABEL[r.name] || r.name })),
  [dashboard]);
  const statusData = useMemo(() =>
    (dashboard?.users?.byStatus || []).map(s => ({ ...s, name: STATUS_LABEL[s.name] || s.name })),
  [dashboard]);

  // ── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full p-6 bg-transparent flex flex-col justify-start overflow-hidden">
        <div className="max-w-[1920px] w-full mx-auto h-full bg-white/90 backdrop-blur-[4px] rounded-2xl p-6 shadow-md border border-white/40 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-emerald-600">
            <RefreshCw className="animate-spin" size={36} />
            <span className="text-lg font-bold">Loading library operations data…</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────
  if (error) {
    return (
      <div className="h-full p-6 bg-transparent flex flex-col justify-start overflow-hidden">
        <div className="max-w-[1920px] w-full mx-auto h-full bg-white/90 backdrop-blur-[4px] rounded-2xl p-6 shadow-md border border-white/40 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-red-500">
            <AlertTriangle size={36} />
            <span className="text-lg font-bold">{error}</span>
            <button
              onClick={loadDashboard}
              className="mt-2 px-5 py-2 rounded-full bg-emerald-600 text-white text-sm font-semibold
                         hover:bg-emerald-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard content ──────────────────────────────────
  return (
    <div className="h-full p-6 bg-transparent flex flex-col justify-start overflow-hidden">
      <div className="max-w-[1920px] w-full mx-auto h-full bg-white/90 backdrop-blur-[4px] rounded-2xl p-6 shadow-md border border-white/40 flex flex-col overflow-hidden">

        {/* ── Header bar ──────────────────────────────── */}
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Operations Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Aggregate view of users, collections, borrowing, returns, overdue items, fines, and reading preferences.
            </p>
          </div>
          <button
            onClick={loadDashboard}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 text-white
                       text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* ── Source banner ───────────────────────────── */}
        <div className="flex-shrink-0 mb-4 px-4 py-2.5 rounded-xl text-sm text-emerald-700
                        bg-emerald-50/60 border border-emerald-100/60">
          Source: {dashboard.source === 'database' ? 'Main Prisma SQLite Database' : 'Built-in Mock Data'}
          &nbsp;· Updated: {new Date(dashboard.generatedAt).toLocaleString('en-US')}
        </div>

        {/* ── Scrollable content ──────────────────────── */}
        <div className="flex-1 w-full overflow-y-auto pr-1 space-y-5">

          {/* Row 1 — 4 key book/user metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Users"
              value={numberFormat(dashboard.users.total)}
              subtitle={`${dashboard.users.newIn7Days} new in last 7 days`}
              icon={Users} tone="emerald" />
            <StatCard title="Total Copies"
              value={numberFormat(dashboard.books.totalCopies)}
              subtitle={`${dashboard.books.totalTitles} book categories`}
              icon={Library} tone="teal" />
            <StatCard title="Active Loans"
              value={numberFormat(dashboard.books.activeBorrowed)}
              subtitle={`${dashboard.books.overdue} overdue`}
              icon={BookOpen} tone="orange" />
            <StatCard title="Today's Activity"
              value={`${dashboard.books.todayBorrowed}/${dashboard.books.todayReturned}`}
              subtitle="Borrowed / Returned today"
              icon={Activity} tone="purple" />
          </div>

          {/* Row 2 — 4 fine metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Fines"
              value={moneyFormat(dashboard.fines.total)}
              subtitle="All historic fines"
              icon={CircleDollarSign} tone="red" />
            <StatCard title="Today's Fines"
              value={moneyFormat(dashboard.fines.todayNew)}
              subtitle="Incurred today"
              icon={Users} tone="orange" />
            <StatCard title="Unpaid Fines"
              value={moneyFormat(dashboard.fines.unpaid)}
              subtitle="Pending payment"
              icon={Clock} tone="purple" />
            <StatCard title="Settled Fines"
              value={moneyFormat(dashboard.fines.settled)}
              subtitle="Paid or forgiven"
              icon={CheckCircle2} tone="teal" />
          </div>

          {/* Row 3 — 7‑day trend + category pie */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-4">
            <Panel title="7-Day Borrowing &amp; Return Trends">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboard.charts.sevenDayTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db30" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="borrow" name="Borrows" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="return" name="Returns" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Loans by Category">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={dashboard.charts.categoryBorrowShare} dataKey="value" nameKey="name"
                       cx="50%" cy="50%" outerRadius={95} label>
                    {dashboard.charts.categoryBorrowShare.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          {/* Row 4 — user roles + user status + cold-book summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Panel title="User Distribution by Role">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={roleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Count" fill="#059669" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="User Status">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name"
                       cx="50%" cy="50%" outerRadius={72} label>
                    {statusData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Inactive Books Count">
              <div className="flex flex-col items-center justify-center gap-2 min-h-[240px]
                              rounded-xl bg-gradient-to-br from-emerald-50/60 to-teal-50/40">
                <TrendingUp size={32} className="text-purple-500" />
                <strong className="text-5xl font-extrabold text-purple-700">
                  {dashboard.rankings.longNoBorrowCount}
                </strong>
                <span className="text-sm text-gray-500 text-center px-3">
                  Books designated as inactive or low-demand
                </span>
              </div>
            </Panel>
          </div>

          {/* Row 5 — TOP5 hot + cold books */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="🔥 Top 5 Popular Books">
              <RankingList items={dashboard.rankings.hotBooks} emptyText="No borrowing data yet" />
            </Panel>
            <Panel title="❄️ Inactive or Dormant Books">
              <RankingList items={dashboard.rankings.coldBooks} emptyText="No inactive or dormant books" />
            </Panel>
          </div>

        </div>{/* end scrollable */}

      </div>
    </div>
  );
}
