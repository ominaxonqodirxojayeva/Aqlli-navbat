import { Banknote, Bell, Clock, Hospital, Ticket, Timer, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui';
import type { Organization } from '@/lib/supabase';
import type { QueueResult } from './shared';

export function ResultStep({
  result,
  selectedOrg,
  servingQueue,
  peopleAhead,
}: {
  result: QueueResult;
  selectedOrg: Organization;
  servingQueue: string | null;
  peopleAhead: number;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      {result.status === 'serving' && (
        <div className="mb-6 p-6 rounded-2xl bg-electric-500/10 border border-electric-500/20 flex items-center gap-4 animate-fade-in-up">
          <div className="w-14 h-14 rounded-2xl bg-electric-500/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-7 h-7 text-electric-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-electric-300">Navbatingiz keldi!</h3>
            <p className="text-sm text-electric-200 mt-1">Iltimos, xizmat ko'rsatish joyiga boring.</p>
          </div>
        </div>
      )}

      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-electric-500/5 blur-[60px]" />
        <div className="relative text-center py-8">
          <p className="text-sm text-navy-400 mb-3">Sizning navbatingiz</p>
          <h2 className="text-7xl sm:text-8xl font-extrabold text-white tracking-tight mb-4">
            {result.queue_number}
          </h2>
          <div className="inline-flex items-center gap-2 mb-8">
            {selectedOrg.type === 'clinic' ? (
              <Hospital className="w-4 h-4 text-electric-400" />
            ) : (
              <Banknote className="w-4 h-4 text-accent-400" />
            )}
            <span className="text-sm text-navy-300">{selectedOrg.name}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="glass p-4 rounded-xl">
              <Clock className="w-5 h-5 text-electric-400 mx-auto mb-2" />
              <p className="text-xs text-navy-400 mb-1">Hozir xizmatda</p>
              <p className="text-lg font-bold text-electric-400">
                {servingQueue ?? '—'}
              </p>
            </div>
            <div className="glass p-4 rounded-xl">
              <Users className="w-5 h-5 text-accent-400 mx-auto mb-2" />
              <p className="text-xs text-navy-400 mb-1">Oldingizda</p>
              <p className="text-lg font-bold text-accent-400">{peopleAhead} kishi</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <Timer className="w-5 h-5 text-warning-400 mx-auto mb-2" />
              <p className="text-xs text-navy-400 mb-1">Taxminiy kutish</p>
              <p className="text-lg font-bold text-warning-400">
                {result.estimated_wait_time} daqiqa
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/my-queue" className="btn-primary flex items-center gap-2">
              <Ticket className="w-4 h-4" />
              Navbatni kuzatish
            </Link>
            <Link to="/dashboard" className="btn-secondary">
              Dashboard
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
