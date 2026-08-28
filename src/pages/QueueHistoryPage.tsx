import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  History,
  AlertCircle,
  Hospital,
  Banknote,
  CheckCircle2,
  Ticket,
  Timer,
  ArrowLeft,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Badge, EmptyState, Spinner, StatCard } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import {
  isSupabaseConfigured,
  supabase,
  type NavbatQueueWithService,
} from '@/lib/supabase';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_DOT_COLORS,
  formatDate,
  formatTime,
  formatMinutes,
} from '@/lib/utils';
import { reportError } from '@/lib/errors';

const FINISHED_STATUSES = ['completed', 'skipped', 'cancelled'];

/** Xizmat ko'rsatish davomiyligi (daqiqada), hisoblab bo'lsa. */
function serviceMinutes(q: NavbatQueueWithService): number | null {
  if (!q.called_at || !q.completed_at) return null;
  const ms = new Date(q.completed_at).getTime() - new Date(q.called_at).getTime();
  return ms > 0 ? ms / 60000 : null;
}

export function QueueHistoryPage() {
  const { profile } = useAuth();

  const { data: queues = [], isLoading, error } = useQuery<NavbatQueueWithService[]>({
    queryKey: ['queue-history', profile?.id],
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('navbat_queues')
        .select('*, service:navbat_services(*), organization:organizations(*)')
        .eq('user_id', profile!.id)
        .in('status', FINISHED_STATUSES)
        .order('created_at', { ascending: false })
        .limit(100);
      if (qErr) throw qErr;
      return (data ?? []) as unknown as NavbatQueueWithService[];
    },
    enabled: Boolean(profile?.id) && isSupabaseConfigured,
  });

  const completed = queues.filter((q) => q.status === 'completed');
  const durations = queues.map(serviceMinutes).filter((m): m is number => m !== null);
  const avgService =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  if (isLoading) {
    return (
      <DashboardLayout activePage="/history" role="customer">
        <div className="flex items-center justify-center py-20">
          <Spinner className="w-8 h-8 text-electric-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout activePage="/history" role="customer">
        <Card>
          <EmptyState
            icon={<AlertCircle className="w-8 h-8" />}
            title="Xatolik"
            description={reportError('QueueHistory.load', error, 'Tarixni yuklashda xatolik yuz berdi.')}
          />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePage="/history" role="customer">
      <div className="mb-6">
        <Link to="/dashboard" className="btn-ghost inline-flex items-center gap-2 mb-2">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white">Navbatlar tarixi</h1>
        <p className="text-navy-400 text-sm mt-1">Oxirgi 100 ta yakunlangan navbatingiz</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Jami navbatlar"
          value={queues.length}
          icon={<Ticket className="w-5 h-5" />}
          color="electric"
        />
        <StatCard
          label="Xizmat olingan"
          value={completed.length}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="success"
        />
        <StatCard
          label="O'rtacha xizmat vaqti"
          value={avgService > 0 ? formatMinutes(avgService) : '—'}
          icon={<Timer className="w-5 h-5" />}
          color="accent"
        />
      </div>

      <Card>
        {queues.length === 0 ? (
          <EmptyState
            icon={<History className="w-8 h-8" />}
            title="Tarix bo'sh"
            description="Siz hali birorta navbatni yakunlamagansiz"
            action={
              <Link to="/get-queue" className="btn-primary">
                Navbat olish
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase">Raqam</th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase">Tashkilot</th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase hidden md:table-cell">
                    Xizmat
                  </th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase">Sana</th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase hidden sm:table-cell">
                    Davomiyligi
                  </th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase">Holat</th>
                </tr>
              </thead>
              <tbody>
                {queues.map((q) => {
                  const duration = serviceMinutes(q);
                  return (
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
                      <td className="py-3 px-2 hidden md:table-cell">
                        <span className="text-sm text-navy-300">{q.service?.name ?? '—'}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-sm text-navy-300">{formatDate(q.created_at)}</span>
                        <span className="block text-xs text-navy-500">{formatTime(q.created_at)}</span>
                      </td>
                      <td className="py-3 px-2 hidden sm:table-cell">
                        <span className="text-sm text-navy-300">
                          {duration !== null ? formatMinutes(duration) : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <Badge className={STATUS_COLORS[q.status]}>
                          <span className={`status-dot ${STATUS_DOT_COLORS[q.status]}`} />
                          {STATUS_LABELS[q.status]}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
