import { Banknote, Bell, Hospital, ListChecks, Megaphone, Ticket, Timer, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui';
import type { CreatedQueue, Organization } from '@/lib/supabase';
import { formatMinutes } from '@/lib/utils';

export function ResultStep({
  result,
  selectedOrg,
  servingQueue,
  peopleAhead,
  estimatedWait,
}: {
  result: CreatedQueue;
  selectedOrg: Organization;
  servingQueue: string | null;
  peopleAhead: number;
  estimatedWait: number;
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
          <div className="inline-flex flex-col items-center gap-1 mb-8">
            <span className="inline-flex items-center gap-2">
              {selectedOrg.type === 'clinic' ? (
                <Hospital className="w-4 h-4 text-electric-400" />
              ) : (
                <Banknote className="w-4 h-4 text-accent-400" />
              )}
              <span className="text-sm text-navy-300">{selectedOrg.name}</span>
            </span>
            {result.service_name && (
              <span className="inline-flex items-center gap-1.5 text-xs text-navy-400">
                <ListChecks className="w-3.5 h-3.5" />
                {result.service_name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="glass p-4 rounded-xl">
              <Megaphone className="w-5 h-5 text-electric-400 mx-auto mb-2" />
              <p className="text-xs text-navy-400 mb-1">Hozir chaqirilmoqda</p>
              <p className="text-lg font-bold text-electric-400">{servingQueue ?? '—'}</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <Users className="w-5 h-5 text-accent-400 mx-auto mb-2" />
              <p className="text-xs text-navy-400 mb-1">Oldingizda</p>
              <p className="text-lg font-bold text-accent-400">{peopleAhead} kishi</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <Timer className="w-5 h-5 text-warning-400 mx-auto mb-2" />
              <p className="text-xs text-navy-400 mb-1">Taxminiy kutish</p>
              <p className="text-lg font-bold text-warning-400">{formatMinutes(estimatedWait)}</p>
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

          <p className="text-xs text-navy-500 mt-6">
            Navbatingiz chaqirilganda bildirishnoma olasiz — sahifani yopib qo'ysangiz ham bo'ladi.
          </p>
        </div>
      </Card>
    </div>
  );
}
