import { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  SkipForward,
  Timer,
  TrendingUp,
  AlertCircle,
  BarChart3,
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
import { supabase, type NavbatQueueWithDetails, type Organization } from '@/lib/supabase';
import { STATUS_LABELS, formatMinutes } from '@/lib/utils';

const PIE_COLORS: Record<string, string> = {
  waiting: '#f59e0b',
  serving: '#3b82f6',
  completed: '#10b981',
  skipped: '#64748b',
  cancelled: '#ef4444',
};

export function AdminStatsPage() {
  const [queues, setQueues] = useState<NavbatQueueWithDetails[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setError(null);
      try {
        const [queuesRes, orgsRes] = await Promise.all([
          supabase
            .from('navbat_queues')
            .select('*, service:navbat_services(*), organization:organizations(*), profile:profiles(*)')
            .order('created_at', { ascending: false })
            .limit(500),
          supabase.from('organizations').select('*').order('name'),
        ]);

        if (queuesRes.error) throw queuesRes.error;
        if (orgsRes.error) throw orgsRes.error;

        setQueues(queuesRes.data as unknown as NavbatQueueWithDetails[]);
        setOrganizations((orgsRes.data ?? []) as Organization[]);
      } catch {
        setError('Ma\'lumotlarni yuklashda xatolik yuz berdi.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout activePage="/admin/stats" role="admin">
        <div className="flex items-center justify-center py-20">
          <Spinner className="w-8 h-8 text-electric-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout activePage="/admin/stats" role="admin">
        <Card>
          <EmptyState
            icon={<AlertCircle className="w-8 h-8" />}
            title="Xatolik"
            description={error}
          />
        </Card>
      </DashboardLayout>
    );
  }

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayQueues = queues.filter((q) => new Date(q.created_at) >= today);

  const statusCounts = {
    waiting: todayQueues.filter((q) => q.status === 'waiting').length,
    serving: todayQueues.filter((q) => q.status === 'serving').length,
    completed: todayQueues.filter((q) => q.status === 'completed').length,
    skipped: todayQueues.filter((q) => q.status === 'skipped').length,
    cancelled: todayQueues.filter((q) => q.status === 'cancelled').length,
  };

  const avgWait = todayQueues.length > 0
    ? Math.round(todayQueues.reduce((sum, q) => sum + (q.estimated_wait_time ?? 0), 0) / todayQueues.length)
    : 0;

  // Most popular organization
  const orgCounts: Record<string, number> = {};
  todayQueues.forEach((q) => {
    const name = q.organization?.name ?? q.service?.name ?? 'Noma\'lum';
    orgCounts[name] = (orgCounts[name] ?? 0) + 1;
  });
  const topOrg = Object.entries(orgCounts).sort((a, b) => b[1] - a[1])[0];

  // Hourly distribution
  const hourlyData: { hour: string; count: number }[] = [];
  for (let h = 8; h <= 20; h++) {
    const hourQueues = todayQueues.filter((q) => new Date(q.created_at).getHours() === h);
    hourlyData.push({ hour: `${h}:00`, count: hourQueues.length });
  }

  // Service distribution for pie chart
  const pieData = Object.entries(statusCounts).map(([key, value]) => ({
    name: STATUS_LABELS[key as keyof typeof STATUS_LABELS],
    value,
    key,
  })).filter((d) => d.value > 0);

  // Organization bar chart data
  const orgBarData = organizations.map((org) => ({
    name: org.name,
    count: todayQueues.filter((q) => q.organization_id === org.id).length,
  }));

  return (
    <DashboardLayout activePage="/admin/stats" role="admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Statistika</h1>
        <p className="text-navy-400 text-sm mt-1">Bugungi navbatlar statistikasi</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Jami navbatlar" value={todayQueues.length} icon={<Users className="w-5 h-5" />} color="electric" />
        <StatCard label="Completed" value={statusCounts.completed} icon={<CheckCircle2 className="w-5 h-5" />} color="success" />
        <StatCard label="Cancelled" value={statusCounts.cancelled} icon={<XCircle className="w-5 h-5" />} color="error" />
        <StatCard label="Skipped" value={statusCounts.skipped} icon={<SkipForward className="w-5 h-5" />} color="warning" />
        <StatCard label="O'rtacha kutish" value={formatMinutes(avgWait)} icon={<Timer className="w-5 h-5" />} color="accent" />
        <StatCard label="Top tashkilot" value={topOrg ? topOrg[0] : '—'} icon={<TrendingUp className="w-5 h-5" />} color="electric" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Hourly chart */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-electric-400" />
            <h3 className="text-white font-semibold">Soat bo'yicha navbatlar</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #ffffff20',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Status pie chart */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-accent-400" />
            <h3 className="text-white font-semibold">Holat bo'yicha taqsimot</h3>
          </div>
          {pieData.length === 0 ? (
            <EmptyState title="Ma'lumot yo'q" description="Bugun navbatlar mavjud emas" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
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
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Service distribution */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-success-400" />
          <h3 className="text-white font-semibold">Tashkilotlar bo'yicha navbatlar</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={orgBarData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #ffffff20',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </DashboardLayout>
  );
}
