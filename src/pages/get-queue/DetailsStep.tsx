import { AlertCircle, ArrowLeft, Banknote, Hospital, Loader2, PlusCircle, User, Phone } from 'lucide-react';
import { Card } from '@/components/ui';
import type { NavbatQueue, Organization } from '@/lib/supabase';
import { formatPhoneInput } from './shared';

export function DetailsStep({
  selectedOrg,
  hideBack,
  fullName,
  onFullNameChange,
  defaultFullName,
  phone,
  onPhoneChange,
  issueError,
  issuing,
  activeQueue,
  onBack,
  onSubmit,
}: {
  selectedOrg: Organization;
  hideBack: boolean;
  fullName: string;
  onFullNameChange: (value: string) => void;
  defaultFullName: string;
  phone: string;
  onPhoneChange: (value: string) => void;
  issueError: string | null;
  issuing: boolean;
  activeQueue: NavbatQueue | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        {!hideBack && (
          <button onClick={onBack} className="btn-ghost text-sm flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Orqaga
          </button>
        )}
      </div>

      <Card className="mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            selectedOrg.type === 'clinic'
              ? 'bg-electric-500/10 text-electric-400'
              : 'bg-accent-500/10 text-accent-400'
          }`}>
            {selectedOrg.type === 'clinic' ? <Hospital className="w-6 h-6" /> : <Banknote className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-xs text-navy-400">Tanlangan tashkilot</p>
            <h3 className="text-lg font-bold text-white">{selectedOrg.name}</h3>
          </div>
        </div>
      </Card>

      {issueError && (
        <div className="mb-6 p-4 rounded-xl bg-error-500/10 border border-error-500/20 flex items-center gap-3 animate-fade-in-up">
          <AlertCircle className="w-5 h-5 text-error-400 flex-shrink-0" />
          <p className="text-sm text-error-300">{issueError}</p>
        </div>
      )}

      <Card>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-navy-200 mb-2">Ismingiz</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => onFullNameChange(e.target.value)}
                className="input-field pl-11"
                placeholder="Ismingizni kiriting"
                defaultValue={defaultFullName}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-200 mb-2">Telefon raqamingiz</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => onPhoneChange(formatPhoneInput(e.target.value))}
                className="input-field pl-11"
                placeholder="+998 __ ___ __ __"
              />
            </div>
            <p className="text-xs text-navy-500 mt-1.5">Format: +998 XX XXX XX XX</p>
          </div>

          <button
            onClick={onSubmit}
            disabled={issuing || !!activeQueue}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {issuing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Navbat olinmoqda...
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                Navbat olish
              </>
            )}
          </button>
        </div>
      </Card>
    </div>
  );
}
