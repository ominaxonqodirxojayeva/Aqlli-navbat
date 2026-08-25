import { ArrowLeft, ArrowRight, Banknote, Building2, Hospital, Search } from 'lucide-react';
import { Badge, Card, EmptyState } from '@/components/ui';
import type { Organization } from '@/lib/supabase';

export function SelectStep({
  orgType,
  search,
  onSearchChange,
  filteredOrgs,
  onBack,
  onSelectOrg,
}: {
  orgType: 'clinic' | 'bank' | null;
  search: string;
  onSearchChange: (value: string) => void;
  filteredOrgs: Organization[];
  onBack: () => void;
  onSelectOrg: (org: Organization) => void;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="btn-ghost text-sm flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </button>
        <Badge className="text-electric-500 bg-electric-500/10 border-electric-500/20">
          {orgType === 'clinic' ? '🏥 Poliklinika' : '🏦 Bank'}
        </Badge>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">
        {orgType === 'clinic' ? 'Poliklinikani tanlang' : 'Bankni tanlang'}
      </h2>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-field pl-11"
          placeholder={orgType === 'clinic' ? 'Poliklinika nomi yoki raqamini kiriting...' : 'Bank nomini kiriting...'}
          autoFocus
        />
      </div>

      {filteredOrgs.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 className="w-8 h-8" />}
            title="Natija topilmadi"
            description="Qidiruv so'rovi bo'yicha tashkilot topilmadi"
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredOrgs.map((org, i) => (
            <button
              key={org.id}
              onClick={() => onSelectOrg(org)}
              className="glass-card p-5 rounded-2xl card-hover group text-left animate-fade-in-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  org.type === 'clinic'
                    ? 'bg-electric-500/10 text-electric-400'
                    : 'bg-accent-500/10 text-accent-400'
                }`}>
                  {org.type === 'clinic' ? <Hospital className="w-6 h-6" /> : <Banknote className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold text-lg">{org.name}</h4>
                  {org.description && (
                    <p className="text-sm text-navy-400 mt-0.5">{org.description}</p>
                  )}
                  <p className="text-xs text-navy-500 mt-1">Prefix: {org.prefix}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-navy-500 group-hover:text-electric-400 group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
