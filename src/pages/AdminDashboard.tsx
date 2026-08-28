import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Lock,
  Unlock,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Badge, EmptyState, Spinner, StatCard } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import {
  supabase,
  type NavbatQueueWithDetails,
  type Organization,
  type PublicOrgState,
  type QueueStatus,
} from '@/lib/supabase';
import { STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS, formatMinutes, timeAgo } from '@/lib/utils';
import { reportError } from '@/lib/errors';

type QueueAction = 'serve' | 'skip' | 'complete' | 'cancel';

const ACTION_STATUS: Record<QueueAction, QueueStatus> = {
  serve: 'serving',
  skip: 'skipped',
  complete: 'completed',
  cancel: 'cancelled',
};

interface DashboardStats {
  todayTotal: number;
  waiting: number;
  serving: number;
  completed: number;
  closed: number;
  avgWait: number;
}

const EMPTY_STATS: DashboardStats = {
  todayTotal: 0,
  waiting: 0,
  serving: 0,
  completed: 0,
  closed: 0,
  avgWait: 0,
};

export function AdminDashboard() {
  const { managedOrgIds, isSuperAdmin } = useAuth();

  const [queues, setQueues] = useState<NavbatQueueWithDetails[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgState, setOrgState] = useState<PublicOrgState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QueueStatus | 'all'>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);

  // Realtime hodisalari ketma-ket kelganda har biriga alohida so'rov
  // yubormaslik uchun kichik kechikish.
  const reloadTimer = useRef<number | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      let queueQuery = supabase
        .from('navbat_queues')
        .select('*, service:navbat_services(*), organization:organizations(*), profile:profiles(*)')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(300);

      if (orgFilter !== 'all') queueQuery = queueQuery.eq('organization_id', orgFilter);

      const [queuesRes, orgsRes] = await Promise.all([
        queueQuery,
        supabase.from('organizations').select('*').order('name'),
      ]);

      if (queuesRes.error) throw queuesRes.error;
      if (orgsRes.error) throw orgsRes.error;

      const rows = (queuesRes.data ?? []) as unknown as NavbatQueueWithDetails[];
      setQueues(rows);

      const allOrgs = (orgsRes.data ?? []) as Organization[];
      // Xodim faqat o'zi biriktirilgan tashkilotlarni ko'radi.
      setOrganizations(
        managedOrgIds === 'all'
          ? allOrgs
          : allOrgs.filter((o) => managedOrgIds.includes(o.id))
      );

      // O'rtacha kutish: navbat olingandan chaqirilgungacha bo'lgan haqiqiy vaqt
      const waits = rows
        .filter((q) => q.called_at)
        .map((q) => (new Date(q.called_at!).getTime() - new Date(q.created_at).getTime()) / 60000)
        .filter((m) => m >= 0);

      setStats({
        todayTotal: rows.length,
        waiting: rows.filter((q) => q.status === 'waiting').length,
        serving: rows.filter((q) => q.status === 'serving').length,
        completed: rows.filter((q) => q.status === 'completed').length,
        closed: rows.filter((q) => q.status === 'cancelled' || q.status === 'skipped').length,
        avgWait: waits.length > 0 ? waits.reduce((a, b) => a + b, 0) / waits.length : 0,
      });
    } catch (err) {
      setError(reportError('AdminDashboard.load', err, 'Ma\'lumotlarni yuklashda xatolik yuz berdi.'));
    } finally {
      setLoading(false);
    }
  }, [orgFilter, managedOrgIds]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Tanlangan tashkilotning navbat qabuli holati
  useEffect(() => {
    if (orgFilter === 'all') {
      setOrgState(null);
      return;
    }
    void (async () => {
      const { data, error: stateError } = await supabase.rpc('get_public_org_state', {
        p_org_id: orgFilter,
      });
      if (stateError) {
        reportError('AdminDashboard.orgState', stateError);
        return;
      }
      setOrgState(((data ?? []) as PublicOrgState[])[0] ?? null);
    })();
  }, [orgFilter, queues.length]);

  // Realtime — debounce bilan
  useEffect(() => {
    const channel = supabase
      .channel('admin-queues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'navbat_queues' }, () => {
        if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
        reloadTimer.current = window.setTimeout(() => void loadData(), 400);
      })
      .subscribe();

    return () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleNextCustomer = async () => {
    if (orgFilter === 'all') return;
    setActionLoading('next');
    setActionError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_next_org_queue', {
        p_org_id: orgFilter,
      });
      if (rpcError) throw rpcError;
      if (!data?.length) setActionError('Navbatda kutayotgan mijoz qolmadi.');
      await loadData();
    } catch (err) {
      setActionError(reportError('AdminDashboard.next', err, 'Keyingi mijozni chaqirishda xatolik.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (queueId: string, action: QueueAction) => {
    setActionLoading(`${queueId}-${action}`);
    setActionError(null);
    try {
      // Vaqt belgilarini server qo'yadi — brauzer soati noto'g'ri bo'lishi mumkin.
      const { error: rpcError } = await supabase.rpc('admin_set_queue_status', {
        p_queue_id: queueId,
        p_status: ACTION_STATUS[action],
      });
      if (rpcError) throw rpcError;
      await loadData();
    } catch (err) {
      setActionError(reportError('AdminDashboard.setStatus', err, 'Amalni bajarishda xatolik yuz berdi.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleOpen = async () => {
    if (orgFilter === 'all' || !orgState) return;
    setActionLoading('toggle-open');
    setActionError(null);
    try {
      const { error: rpcError } = await supabase.rpc('admin_set_org_open', {
        p_org_id: orgFilter,
        p_is_open: !orgState.is_open,
      });
      if (rpcError) throw rpcError;
      setOrgState({ ...orgState, is_open: !orgState.is_open });
    } catch (err) {
      setActionError(reportError('AdminDashboard.toggleOpen', err, 'Navbat holatini o\'zgartirishda xatolik.'));
    } finally {
      setActionLoading(null);
    }
  };

  const filteredQueues = useMemo(() => {
    const term = search.trim().toLowerCase();
    return queues.filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (!term) return true;
      return (
        q.queue_number.toLowerCase().includes(term) ||
        (q.service?.name?.toLowerCase().includes(term) ?? false) ||
        (q.organization?.name?.toLowerCase().includes(term) ?? false) ||
        (q.profile?.full_name?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [queues, statusFilter, search]);

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
            action={
              <button onClick={() => void loadData()} className="btn-primary">
                Qayta urinish
              </button>
            }
          />
        </Card>
      </DashboardLayout>
    );
  }

  const statusFilters: (QueueStatus | 'all')[] = [
    'all',
    'waiting',
    'serving',
    'completed',
    'skipped',
    'cancelled',
  ];

  return (
    <DashboardLayout activePage="/admin" role="admin">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-navy-400 text-sm mt-1">
            {isSuperAdmin ? 'Barcha tashkilotlar' : 'Sizga biriktirilgan tashkilotlar'} · bugungi navbatlar
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void loadData()} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Yangilash
          </button>

          {orgFilter !== 'all' && orgState && (
            <button
              onClick={handleToggleOpen}
              disabled={actionLoading === 'toggle-open'}
              className={`px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-50 ${
                orgState.is_open
                  ? 'bg-warning-500/10 border border-warning-500/20 text-warning-400 hover:bg-warning-500/20'
                  : 'bg-success-500/10 border border-success-500/20 text-success-400 hover:bg-success-500/20'
              }`}
            >
              {orgState.is_open ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {orgState.is_open ? 'Navbatni yopish' : 'Navbatni ochish'}
            </button>
          )}

          <button
            onClick={handleNextCustomer}
            disabled={actionLoading === 'next' || orgFilter === 'all'}
            title={orgFilter === 'all' ? 'Avval tashkilotni tanlang' : 'Keyingi mijozni chaqirish'}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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

      {orgFilter === 'all' && (
        <div className="mb-6 p-4 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-electric-400 flex-shrink-0" />
          <p className="text-sm text-electric-200">
            Mijozlarni chaqirish va navbatni ochish/yopish uchun quyidan tashkilotni tanlang.
          </p>
        </div>
      )}

      {orgFilter !== 'all' && orgState && !orgState.is_open && (
        <div className="mb-6 p-4 rounded-xl bg-warning-500/10 border border-warning-500/20 flex items-center gap-3">
          <Lock className="w-5 h-5 text-warning-400 flex-shrink-0" />
          <p className="text-sm text-warning-200">
            Navbat qabuli yopiq — yangi mijozlar navbat ola olmaydi. Mavjud navbatlar saqlanib turibdi.
          </p>
        </div>
      )}

      {actionError && (
        <div className="mb-6 p-4 rounded-xl bg-error-500/10 border border-error-500/20 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-error-400 flex-shrink-0" />
          <p className="text-sm text-error-300">{actionError}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Bugungi mijozlar" value={stats.todayTotal} icon={<Users className="w-5 h-5" />} color="electric" />
        <StatCard label="Kutayotganlar" value={stats.waiting} icon={<Clock className="w-5 h-5" />} color="warning" />
        <StatCard label="Xizmatda" value={stats.serving} icon={<Play className="w-5 h-5" />} color="accent" />
        <StatCard label="Tugallangan" value={stats.completed} icon={<CheckCircle2 className="w-5 h-5" />} color="success" />
        <StatCard label="Bekor/o'tkazilgan" value={stats.closed} icon={<XCircle className="w-5 h-5" />} color="error" />
        <StatCard label="O'rtacha kutish" value={formatMinutes(stats.avgWait)} icon={<Timer className="w-5 h-5" />} color="electric" />
      </div>

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
            className="input-field sm:w-56"
            aria-label="Tashkilot"
          >
            <option value="all">Barcha tashkilotlar</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as QueueStatus | 'all')}
            className="input-field sm:w-40"
            aria-label="Holat"
          >
            {statusFilters.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'Barchasi' : STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <h3 className="text-white font-semibold mb-4">Navbat jadvali</h3>
        {filteredQueues.length === 0 ? (
          <EmptyState
            icon={<AlertCircle className="w-8 h-8" />}
            title="Navbatlar topilmadi"
            description="Bugun bu filtr bo'yicha navbat yo'q"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase">Raqam</th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase">Tashkilot</th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase hidden lg:table-cell">Xizmat</th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase hidden sm:table-cell">Mijoz</th>
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
                        {q.organization?.type === 'clinic' && (
                          <Hospital className="w-4 h-4 text-electric-400 flex-shrink-0" />
                        )}
                        {q.organization?.type === 'bank' && (
                          <Banknote className="w-4 h-4 text-accent-400 flex-shrink-0" />
                        )}
                        <span className="text-sm text-navy-200">{q.organization?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 hidden lg:table-cell">
                      <span className="text-sm text-navy-300">{q.service?.name ?? '—'}</span>
                    </td>
                    <td className="py-3 px-2 hidden sm:table-cell">
                      <span className="text-sm text-navy-300">
                        {q.profile?.full_name ?? q.full_name ?? '—'}
                      </span>
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
                              title="Chaqirish"
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
