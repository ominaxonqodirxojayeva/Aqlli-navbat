import { ArrowLeft, ArrowRight, Clock, ListChecks, SkipForward } from 'lucide-react';
import { Card, EmptyState } from '@/components/ui';
import type { NavbatService, Organization } from '@/lib/supabase';

/**
 * Xizmat tanlash qadami. Xizmat ixtiyoriy — tashkilotda xizmatlar
 * sozlanmagan bo'lsa bu qadam butunlay o'tkazib yuboriladi.
 */
export function ServiceStep({
  selectedOrg,
  services,
  onBack,
  onSelectService,
  onSkip,
}: {
  selectedOrg: Organization;
  services: NavbatService[];
  onBack: () => void;
  onSelectService: (service: NavbatService) => void;
  onSkip: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="btn-ghost text-sm flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </button>
      </div>

      <h2 className="text-xl font-bold text-white mb-2">Qaysi xizmat kerak?</h2>
      <p className="text-sm text-navy-400 mb-6">
        {selectedOrg.name} · Xizmat tanlansa kutish vaqti aniqroq hisoblanadi.
      </p>

      {services.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ListChecks className="w-8 h-8" />}
            title="Xizmatlar sozlanmagan"
            description="Bu tashkilotda alohida xizmatlar yo'q — umumiy navbatga yoziladi"
            action={
              <button onClick={onSkip} className="btn-primary">
                Davom etish
              </button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {services.map((service, i) => (
              <button
                key={service.id}
                onClick={() => onSelectService(service)}
                className="glass-card p-5 rounded-2xl card-hover group text-left animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold text-lg">{service.name}</h4>
                    {service.description && (
                      <p className="text-sm text-navy-400 mt-1">{service.description}</p>
                    )}
                    <p className="text-xs text-navy-500 mt-2 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Taxminan {service.average_time} daqiqa
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-navy-500 group-hover:text-electric-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={onSkip}
              className="btn-ghost text-sm inline-flex items-center gap-2"
            >
              <SkipForward className="w-4 h-4" />
              Xizmatni tanlamayman, umumiy navbatga yozing
            </button>
          </div>
        </>
      )}
    </div>
  );
}
