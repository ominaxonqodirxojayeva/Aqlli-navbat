import { Banknote, Building2, Hospital, Pencil, Trash2 } from 'lucide-react';
import { Badge, Card, EmptyState } from '@/components/ui';
import type { Organization } from '@/lib/supabase';

export function OrganizationList({
  organizations,
  onAddNew,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  organizations: Organization[];
  onAddNew: () => void;
  onEdit: (org: Organization) => void;
  onToggleActive: (org: Organization) => void;
  onDelete: (org: Organization) => void;
}) {
  return (
    <Card>
      {organizations.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-8 h-8" />}
          title="Tashkilotlar yo'q"
          description="Birinchi tashkilotni qo'shing"
          action={<button onClick={onAddNew} className="btn-primary">Tashkilot qo'shish</button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <div key={org.id} className="glass p-5 rounded-xl card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    org.type === 'clinic'
                      ? 'bg-electric-500/10 text-electric-400'
                      : 'bg-accent-500/10 text-accent-400'
                  }`}>
                    {org.type === 'clinic' ? <Hospital className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold truncate">{org.name}</h4>
                    <p className="text-xs text-navy-500 mt-0.5">
                      {org.type === 'clinic' ? 'Poliklinika' : 'Bank'} · Prefix: {org.prefix}
                    </p>
                  </div>
                </div>
                <Badge className={org.is_active
                  ? 'text-success-500 bg-success-500/10 border-success-500/20'
                  : 'text-navy-400 bg-navy-500/10 border-navy-500/20'
                }>
                  {org.is_active ? 'Faol' : 'Nofaol'}
                </Badge>
              </div>

              {org.slug && (
                <p className="text-xs text-navy-500 mb-3 font-mono">/{org.slug}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(org)}
                  className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Tahrirlash
                </button>
                <button
                  onClick={() => onToggleActive(org)}
                  className="px-3 py-2 rounded-xl glass text-navy-300 hover:text-white hover:bg-white/10 transition-colors text-sm"
                  title={org.is_active ? 'Nofaol qilish' : 'Faol qilish'}
                >
                  <Building2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(org)}
                  className="px-3 py-2 rounded-xl bg-error-500/10 text-error-400 hover:bg-error-500/20 transition-colors"
                  title="O'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
