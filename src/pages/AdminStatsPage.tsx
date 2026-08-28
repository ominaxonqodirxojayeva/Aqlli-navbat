import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  SkipForward,
  Timer,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Hourglass,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, EmptyState, Spinner, StatCard } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import {
  supabase,
  type DailyStat,
  type HourlyStat,
  type Organization,
  type OrgBreakdownRow,
  type OrgStats,
} from '@/lib/supabase';
import { STATUS_LABELS, formatMinutes } from '@/lib/utils';
import { reportError } from '@/lib/errors';

const PIE_COLORS: Record<string, string> = {
  waiting: '#f59e0b',
  serving: '#3b82f6',
  completed: '#10b981',
  skipped: '#64748b',
  cancelled: '#ef4444',
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  border: '1px solid #ffffff20',
  borderRadius: '8px',
  color: '#fff',
};

type RangeKey = 'today' | 'week' | 'month';

const RANGE_LABELS: Record<RangeKey, string> = {
  today: 'Bugun',
  week: 'Oxirgi 7 kun',
  month: 'Oxirgi 30 kun',
};

/** Tanlangan davr uchun [boshi, oxiri) oralig'ini qaytaradi. */
function rangeToDates(range: RangeKey): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  to.setDate(to.getDate() + 1); // ertangi kun boshi — bugunni ham qamrab olish uchun

  const from = new Date(to);
  const days = range === 'today' ? 1 : range === 'week' ? 7 : 30;
  from.setDate(from.getDate() - days);

  return { from, to };
}

export function AdminStatsPage() {
  const { managedOrgIds, isSuperAdmin } = useAuth();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState<string>('');
  const [range, setRange] = useState<RangeKey>('today');

  const [stats, setStats] = useState<OrgStats | null>(null);
  const [hourly, setHourly] = useState<HourlyStat[]>([]);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [breakdown, setBreakdown] = useState<OrgBreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (orgError) {
        setError(reportError('AdminStats.loadOrgs', orgError, 'Tashkilotlarni yuklab bo\'lmadi.'));
        setLoading(false);
        return;
      }

      const all = (data ?? []) as Organization[];
      const visible = managedOrgIds === 'all' ? all : all.filter((o) => managedOrgIds.includes(o.id));
      setOrganizations(visible);
      // Superadmin uchun "barcha tashkilotlar" (bo'sh qiymat) mumkin,
      // oddiy xodim esa aniq bitta tashkilotni tanlashi shart.
      setOrgId((current) => current || (isSuperAdmin ? '' : visible[0]?.id ?? ''));
    })();
  }, [managedOrgIds, isSuperAdmin]);

  const loadStats = useCallback(async () => {
    if (!isSuperAdmin && !orgId) return;

    setLoading(true);
    setError(null);

    const { from, to } = rangeToDates(range);
    const params = {
      p_org_id: orgId || null,
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    };

    try {
      const [statsRes, hourlyRes, dailyRes, breakdownRes] = await Promise.all([
        supabase.rpc('get_org_stats', params),
        supabase.rpc('get_org_hourly_stats', params),
        supabase.rpc('get_org_daily_stats', params),
        supabase.rpc('get_org_breakdown', { p_from: params.p_from, p_to: params.p_to }),
      ]);

      if (statsRes.error) throw statsRes.error;
      if (hourlyRes.error) throw hourlyRes.error;
      if (dailyRes.error) throw dailyRes.error;
      if (breakdownRes.error) throw breakdownRes.error;

      setStats(((statsRes.data ?? []) as OrgStats[])[0] ?? null);
      setHourly((hourlyRes.data ?? []) as HourlyStat[]);
      setDaily((dailyRes.data ?? []) as DailyStat[]);
      setBreakdown((breakdownRes.data ?? []) as OrgBreakdownRow[]);
    } catch (err) {
      setError(reportError('AdminStats.load', err, 'Statistikani yuklashda xatolik yuz berdi.'));
    } finally {
      setLoading(false);
    }
  }, [orgId, range, isSuperAdmin]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const pieData = useMemo(() => {
    if (!stats) return [];
    return (['waiting', 'serving', 'completed', 'skipped', 'cancelled'] as const)
      .map((key) => ({ key, name: STATUS_LABELS[key], value: stats[key] }))
      .filter((d) => d.value > 0);
  }, [stats]);

  // Ish vaqti oralig'ini ko'rsatamiz, lekin bo'sh soatlar ham grafikda qolsin
  const hourlyChartData = useMemo(
    () =>
      hourly
        .filter((h) => h.hour >= 7 && h.hour <= 21)
        .map((h) => ({ hour: `${String(h.hour).padStart(2, '0')}:00`, count: h.total })),
    [hourly]
  );

  const dailyChartData = useMemo(
    () =>
      daily.map((d) => ({
        day: new Date(d.day).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' }),
        total: d.total,
        completed: d.completed,
      })),
    [daily]
  );

  const topOrg = useMemo(
    () => [...breakdown].sort((a, b) => b.total - a.total)[0] ?? null,
    [breakdown]
  );

  if (loading && !stats) {
    return (
      <DashboardLayout activePage="/admin/stats" role="admin">
        <div className="flex items-center justify-center py-20">
          <Spinner className="w-8 h-8 text-electric-400" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePage="/admin/stats" role="admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Statistika</h1>
        <p className="text-navy-400 text-sm mt-1">
          Barcha hisob-kitoblar serverda bajariladi — brauzerga faqat tayyor natija keladi
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-error-500/10 border border-error-500/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-error-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-error-300">{error}</p>
        </div>
      )}

      {/* Filtrlar */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-navy-400 mb-1.5" htmlFor="stats-org">
              Tashkilot
            </label>
            <select
              id="stats-org"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="input-field"
            >
              {isSuperAdmin && <option value="">Barcha tashkilotlar</option>}
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-52">
            <label className="block text-xs font-medium text-navy-400 mb-1.5" htmlFor="stats-range">
              Davr
            </label>
            <select
              id="stats-range"
              value={range}
              onChange={(e) => setRange(e.target.value as RangeKey)}
              className="input-field"
            >
              {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
                <option key={key} value={key}>
                  {RANGE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Ko'rsatkichlar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Jami navbatlar" value={stats?.total ?? 0} icon={<Users className="w-5 h-5" />} color="electric" />
        <StatCard label="Xizmat ko'rsatilgan" value={stats?.completed ?? 0} icon={<CheckCircle2 className="w-5 h-5" />} color="success" />
        <StatCard label="Bekor qilingan" value={stats?.cancelled ?? 0} icon={<XCircle className="w-5 h-5" />} color="error" />
        <StatCard label="O'tkazib yuborilgan" value={stats?.skipped ?? 0} icon={<SkipForward className="w-5 h-5" />} color="warning" />
        <StatCard
          label="O'rtacha kutish"
          value={stats ? formatMinutes(stats.avg_wait_minutes) : '—'}
          icon={<Hourglass className="w-5 h-5" />}
          color="accent"
        />
        <StatCard
          label="O'rtacha xizmat"
          value={stats ? formatMinutes(stats.avg_service_minutes) : '—'}
          icon={<Timer className="w-5 h-5" />}
          color="electric"
        />
      </div>

      {topOrg && (
        <Card className="mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-electric-400 flex-shrink-0" />
            <p className="text-sm text-navy-200">
              Eng ko'p navbat berilgan tashkilot:{' '}
              <span className="text-white font-semibold">{topOrg.organization_name}</span>{' '}
              <span className="text-navy-400">({topOrg.total} ta navbat)</span>
            </p>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Soat / kun kesimi */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-electric-400" />
            <h3 className="text-white font-semibold">
              {range === 'today' ? 'Soat bo\'yicha navbatlar' : 'Kun bo\'yicha navbatlar'}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            {range === 'today' ? (
              <BarChart data={hourlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Navbatlar" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend />
                <Bar dataKey="total" name="Jami" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Xizmat ko'rsatilgan" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </Card>

        {/* Holat kesimi */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-accent-400" />
            <h3 className="text-white font-semibold">Holat bo'yicha taqsimot</h3>
          </div>
          {pieData.length === 0 ? (
            <EmptyState title="Ma'lumot yo'q" description="Tanlangan davrda navbatlar bo'lmagan" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={PIE_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Tashkilotlar kesimi */}
      {breakdown.length > 1 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-success-400" />
            <h3 className="text-white font-semibold">Tashkilotlar bo'yicha</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={breakdown.map((b) => ({ name: b.organization_name, total: b.total, completed: b.completed }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend />
              <Bar dataKey="total" name="Jami" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Xizmat ko'rsatilgan" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </DashboardLayout>
  );
}
