import { ArrowRight, Banknote, Hospital } from 'lucide-react';

export function TypeStep({ onSelect }: { onSelect: (type: 'clinic' | 'bank') => void }) {
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-white text-center mb-8">Qayerda navbat olmoqchisiz?</h2>
      <div className="grid sm:grid-cols-2 gap-6">
        <button
          onClick={() => onSelect('clinic')}
          className="glass-card p-8 rounded-3xl card-hover group text-left animate-fade-in-up"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-electric-500/20 to-electric-600/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Hospital className="w-8 h-8 text-electric-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Poliklinika</h3>
          <p className="text-sm text-navy-400 mb-6">Poliklinikada navbat oling</p>
          <span className="inline-flex items-center gap-2 text-electric-400 font-semibold text-sm">
            Poliklinikani tanlash
            <ArrowRight className="w-4 h-4" />
          </span>
        </button>

        <button
          onClick={() => onSelect('bank')}
          className="glass-card p-8 rounded-3xl card-hover group text-left animate-fade-in-up animation-delay-100"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500/20 to-accent-600/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Banknote className="w-8 h-8 text-accent-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Bank</h3>
          <p className="text-sm text-navy-400 mb-6">Bankda navbat oling</p>
          <span className="inline-flex items-center gap-2 text-accent-400 font-semibold text-sm">
            Bankni tanlash
            <ArrowRight className="w-4 h-4" />
          </span>
        </button>
      </div>
    </div>
  );
}
