import { AlertCircle, Banknote, Hospital, X } from 'lucide-react';
import type { Organization } from '@/lib/supabase';

export interface OrganizationFormData {
  name: string;
  type: 'clinic' | 'bank';
  prefix: string;
  slug: string;
  description: string;
  is_active: boolean;
}

export function OrganizationFormModal({
  editingOrg,
  formData,
  onChange,
  saveError,
  saving,
  onClose,
  onSubmit,
}: {
  editingOrg: Organization | null;
  formData: OrganizationFormData;
  onChange: (data: OrganizationFormData) => void;
  saveError: string | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="glass-card p-6 w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            {editingOrg ? 'Tashkilotni tahrirlash' : 'Yangi tashkilot'}
          </h3>
          <button onClick={onClose} className="text-navy-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {saveError && (
          <div className="mb-4 p-3 rounded-xl bg-error-500/10 border border-error-500/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-error-400 flex-shrink-0" />
            <p className="text-sm text-error-300">{saveError}</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-200 mb-1.5">Tashkilot turi</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onChange({ ...formData, type: 'clinic', prefix: 'P' })}
                className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${
                  formData.type === 'clinic'
                    ? 'bg-electric-500/10 border-electric-500/30 text-electric-300'
                    : 'glass border-white/10 text-navy-400'
                }`}
              >
                <Hospital className="w-5 h-5" />
                <span className="text-sm font-medium">Poliklinika</span>
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...formData, type: 'bank', prefix: 'B' })}
                className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${
                  formData.type === 'bank'
                    ? 'bg-accent-500/10 border-accent-500/30 text-accent-300'
                    : 'glass border-white/10 text-navy-400'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-sm font-medium">Bank</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-200 mb-1.5">Nomi</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onChange({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="12-son Poliklinika"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Prefix</label>
              <input
                type="text"
                value={formData.prefix}
                onChange={(e) => onChange({ ...formData, prefix: e.target.value.toUpperCase().slice(0, 3) })}
                className="input-field"
                placeholder="P"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Slug (URL)</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => onChange({ ...formData, slug: e.target.value })}
                className="input-field"
                placeholder="clinic-12"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-200 mb-1.5">Tavsif</label>
            <textarea
              value={formData.description}
              onChange={(e) => onChange({ ...formData, description: e.target.value })}
              className="input-field"
              placeholder="Tashkilot tavsifi"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="org_is_active"
              checked={formData.is_active}
              onChange={(e) => onChange({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 bg-navy-900"
            />
            <label htmlFor="org_is_active" className="text-sm text-navy-200">Faol</label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </form>
      </div>
    </div>
  );
}
