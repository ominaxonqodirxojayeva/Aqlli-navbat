import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase, type Notification } from '@/lib/supabase';
import { logError } from '@/lib/errors';

/**
 * Bildirishnomalar uchun yagona manba. Navbar ham, DashboardLayout ham
 * shu hookdan foydalanadi — ilgari ikkalasida bir xil kod takrorlangan va
 * hech qayerda "o'qildi" belgilanmagan edi.
 *
 * Realtime orqali yangilanadi; realtime uzilib qolsa 60 soniyalik zaxira
 * so'rov ishlaydi (ilgari har 15 soniyada so'rov yuborilardi).
 */
export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['notifications', userId];

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    enabled: Boolean(userId) && isSupabaseConfigured,
    refetchInterval: 60000,
    staleTime: 10000,
  });

  // Yangi bildirishnoma kelganda darhol yangilaymiz
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('mark_all_notifications_read');
      if (error) throw error;
    },
    onError: (err) => logError('notifications.markAllRead', err),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAllRead: () => {
      if (unreadCount > 0) markAllRead.mutate();
    },
  };
}

/**
 * Brauzer bildirishnomalariga ruxsat so'raydi. Foydalanuvchi rad etsa
 * boshqa so'ramaydi.
 */
export function useBrowserNotificationPermission(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    // Sahifa ochilishi bilan emas, biroz kechikib so'raymiz — shunda
    // foydalanuvchi kontekstni tushunib ulguradi.
    const timer = window.setTimeout(() => {
      void Notification.requestPermission().catch(() => undefined);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, []);
}

/** Brauzer bildirishnomasini ko'rsatadi (ruxsat berilgan bo'lsa). */
export function showBrowserNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, { body, icon: '/icons/icon-192.png', tag: 'aqlli-navbat' });
  } catch (err) {
    logError('notifications.show', err);
  }
}
