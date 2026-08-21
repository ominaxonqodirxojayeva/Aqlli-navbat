import { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Timer,
  Play,
  SkipForward,
  Ban,
  ArrowRightCircle,
  Search,
  AlertCircle,
  RefreshCw,
  Hospital,
  Banknote,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Badge, EmptyState, Spinner, StatCard } from '@/components/ui';
import { supabase, type NavbatQueueWithDetails, type QueueStatus, type Organization } from '@/lib/supabase';
import { STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS, formatMinutes, timeAgo } from '@/lib/utils';

export function AdminDashboard() {
  const [queues, setQueues] = useState<NavbatQueueWithDetails[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QueueStatus | 'all'>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    todayTotal: 0,
    waiting: 0,
    serving: 0,
    completed: 0,
    cancelled: 0,
    skipped: 0,
    avgWait: 0,
  });

  const loadData = async () => {
    setError(null);
    try {
      const [queuesRes, orgsRes] = await Promise.all([
        supabase
          .from('navbat_queues')
          .select('*, service:navbat_services(*), organization:organizations(*), profile:profiles(*)')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('organizations').select('*').order('name'),
      ]);

      if (queuesRes.error) throw queuesRes.error;
      if (orgsRes.error) throw orgsRes.error;

      setQueues(queuesRes.data as unknown as NavbatQueueWithDetails[]);
      setOrganizations((orgsRes.data ?? []) as Organization[]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayQueues = (queuesRes.data ?? []).filter(
        (q) => new Date(q.created_at) >= today
      );
      setStats({
        todayTotal: todayQueues.length,
        waiting: todayQueues.filter((q) => q.status === 'waiting').length,
        serving: todayQueues.filter((q) => q.status === 'serving').length,
        completed: todayQueues.filter((q) => q.status === 'completed').length,
        cancelled: todayQueues.filter((q) => q.status === 'cancelled').length,
        skipped: todayQueues.filter((q) => q.status === 'skipped').length,
        avgWait: todayQueues.length > 0
          ? Math.round(todayQueues.reduce((sum, q) => sum + (q.estimated_wait_time ?? 0), 0) / todayQueues.length)
          : 0,
      });
    } catch {
      setError('Ma\'lumotlarni yuklashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-queues')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'navbat_queues' },
        () => void loadData()
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  const handleNextCustomer = async () => {
    setActionLoading('next');
    setActionError(null);
    try {
      if (orgFilter === 'all') {
        setActionError('Avval tashkilotni tanlang.');
        return;
      }

      const { data, error } = await supabase.rpc('admin_next_org_queue', { p_org_id: orgFilter });
      if (error) throw error;
      if (!data?.length) setActionError('Navbatda mijoz qolmagan.');

      await loadData();
    } catch {
      setActionError('Amal bajarishda xatolik yuz berdi.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (queueId: string, action: 'serve' | 'skip' | 'complete' | 'cancel') => {
    setActionLoading(`${queueId}-${action}`);
    setActionError(null);
    try {
      const updates: Record<string, unknown> = {};
      if (action === 'serve') {
        updates.status = 'serving';
        updates.called_at = new Date().toISOString();
      } else if (action === 'skip') {
        updates.status = 'skipped';
      } else if (action === 'complete') {
        updates.status = 'completed';
        updates.completed_at = new Date().toISOString();
      } else if (action === 'cancel') {
        updates.status = 'cancelled';
      }

      const { error } = await supabase.from('navbat_queues').update(updates).eq('id', queueId);
      if (error) throw error;
      await loadData();
    } catch {
      setActionError('Amal bajarishda xatolik yuz berdi.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredQueues = queues.filter((q) => {
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    if (orgFilter !== 'all' && q.organization_id !== orgFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        q.queue_number.toLowerCase().includes(s) ||
        q.service?.name?.toLowerCase().includes(s) ||
        q.organization?.name?.toLowerCase().includes(s) ||
        q.profile?.full_name?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <DashboardLayout activePage="/admin" role="admin">
        <div className="flex items-center justify-center py-20">
          <Spinner className="w-8 h-8 text-electric-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout activePage="/admin" role="admin">
        <Card>
          <EmptyState
            icon={<AlertCircle className="w-8 h-8" />}
            title="Xatolik"
            description={error}
            action={<button onClick={loadData} className="btn-primary">Qayta urinish</button>}
          />
        </Card>
      </DashboardLayout>
    );
  }

  const statusFilters: (QueueStatus | 'all')[] = ['all', 'waiting', 'serving', 'completed', 'skipped', 'cancelled'];

  return (
    <DashboardLayout activePage="/admin" role="admin">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-navy-400 text-sm mt-1">Navbatlarni boshqaring</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Yangilash
          </button>
          <button
            onClick={handleNextCustomer}
            disabled={actionLoading === 'next'}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {actionLoading === 'next' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRightCircle className="w-4 h-4" />
            )}
            Keyingi mijoz
          </button>
        </div>
      </div>

      {actionError && (
        <div className="mb-6 p-4 rounded-xl bg-error-500/10 border border-error-500/20 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-error-400 flex-shrink-0" />
          <p className="text-sm text-error-300">{actionError}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Bugungi mijozlar" value={stats.todayTotal} icon={<Users className="w-5 h-5" />} color="electric" />
        <StatCard label="Kutayotganlar" value={stats.waiting} icon={<Clock className="w-5 h-5" />} color="warning" />
        <StatCard label="Xizmatda" value={stats.serving} icon={<Play className="w-5 h-5" />} color="accent" />
        <StatCard label="Tugallangan" value={stats.completed} icon={<CheckCircle2 className="w-5 h-5" />} color="success" />
        <StatCard label="Bekor qilingan" value={stats.cancelled + stats.skipped} icon={<XCircle className="w-5 h-5" />} color="error" />
        <StatCard label="O'rtacha kutish" value={formatMinutes(stats.avgWait)} icon={<Timer className="w-5 h-5" />} color="electric" />
      </div>

      {/* Search & Filter */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-11"
              placeholder="Qidirish: raqam, tashkilot, foydalanuvchi..."
            />
          </div>
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="input-field sm:w-48"
          >
            <option value="all">Barcha tashkilotlar</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as QueueStatus | 'all')}
            className="input-field sm:w-40"
          >
            {statusFilters.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'Barchasi' : STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Queue Table */}
      <Card>
        <h3 className="text-white font-semibold mb-4">Navbat jadvali</h3>
        {filteredQueues.length === 0 ? (
          <EmptyState
            icon={<AlertCircle className="w-8 h-8" />}
            title="Navbatlar topilmadi"
            description="Filter yoki qidiruv bo'yicha natija yo'q"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase">Raqam</th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase">Tashkilot</th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase hidden sm:table-cell">Foydalanuvchi</th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase">Holat</th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase hidden md:table-cell">Vaqt</th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase">Amal</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueues.map((q) => (
                  <tr key={q.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-2">
                      <span className="text-white font-bold">{q.queue_number}</span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {q.organization?.type === 'clinic' && <Hospital className="w-4 h-4 text-electric-400 flex-shrink-0" />}
                        {q.organization?.type === 'bank' && <Banknote className="w-4 h-4 text-accent-400 flex-shrink-0" />}
                        <span className="text-sm text-navy-200">
                          {q.organization?.name ?? q.service?.name ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 hidden sm:table-cell">
                      <span className="text-sm text-navy-300">{q.profile?.full_name ?? '—'}</span>
                    </td>
                    <td className="py-3 px-2">
                      <Badge className={STATUS_COLORS[q.status]}>
                        <span className={`status-dot ${STATUS_DOT_COLORS[q.status]}`} />
                        {STATUS_LABELS[q.status]}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 hidden md:table-cell">
                      <span className="text-xs text-navy-400">{timeAgo(q.created_at)}</span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex flex-wrap gap-1">
                        {q.status === 'waiting' && (
                          <>
                            <button
                              onClick={() => handleAction(q.id, 'serve')}
                              disabled={actionLoading === `${q.id}-serve`}
                              title="Chaqrish"
                              className="p-2 rounded-lg bg-electric-500/10 hover:bg-electric-500/20 text-electric-400 transition-colors disabled:opacity-50"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAction(q.id, 'skip')}
                              disabled={actionLoading === `${q.id}-skip`}
                              title="O'tkazib yuborish"
                              className="p-2 rounded-lg bg-warning-500/10 hover:bg-warning-500/20 text-warning-400 transition-colors disabled:opacity-50"
                            >
                              <SkipForward className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAction(q.id, 'cancel')}
                              disabled={actionLoading === `${q.id}-cancel`}
                              title="Bekor qilish"
                              className="p-2 rounded-lg bg-error-500/10 hover:bg-error-500/20 text-error-400 transition-colors disabled:opacity-50"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {q.status === 'serving' && (
                          <button
                            onClick={() => handleAction(q.id, 'complete')}
                            disabled={actionLoading === `${q.id}-complete`}
                            title="Tugallash"
                            className="p-2 rounded-lg bg-success-500/10 hover:bg-success-500/20 text-success-400 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {(q.status === 'completed' || q.status === 'skipped' || q.status === 'cancelled') && (
                          <span className="text-xs text-navy-500">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
