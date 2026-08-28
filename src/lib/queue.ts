import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase, type MyQueueStatus } from '@/lib/supabase';

/** Mijozning joriy navbatini bitta RPC bilan oladi (oldinda nechta kishi bor,
 *  hozir qaysi raqam chaqirilmoqda, taxminiy kutish — hammasi shu yerda). */
export async function fetchMyQueue(): Promise<MyQueueStatus | null> {
  const { data, error } = await supabase.rpc('get_my_queue_status');
  if (error) throw error;
  const rows = (data ?? []) as MyQueueStatus[];
  return rows[0] ?? null;
}

/**
 * Joriy navbatni kuzatadi.
 *
 * Ikki xil yangilanish birlashtirilgan:
 *  - realtime: o'z navbatimiz o'zgarsa (chaqirildi/yakunlandi) — bir zumda;
 *  - 20 soniyalik poll: oldindagi odamlar soni boshqalarning harakatiga
 *    bog'liq, RLS sababli ularning realtime hodisalari bizga kelmaydi.
 */
export function useMyQueue(userId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['my-queue', userId];

  const query = useQuery<MyQueueStatus | null>({
    queryKey,
    queryFn: fetchMyQueue,
    enabled: Boolean(userId) && isSupabaseConfigured,
    refetchInterval: (q) => (q.state.data ? 20000 : false),
  });

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`my-queue-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'navbat_queues',
          filter: `user_id=eq.${userId}`,
        },
        () => void queryClient.invalidateQueries({ queryKey: ['my-queue', userId] })
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return {
    ...query,
    invalidate: () => queryClient.invalidateQueries({ queryKey }),
  };
}
