import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Settings,
  AlertCircle,
  CheckCircle2,
  X,
  Clock,
  Power,
  Building2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Badge, EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { supabase, type NavbatService, type Organization } from '@/lib/supabase';
import { reportError } from '@/lib/errors';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface ServiceFormData {
  name: string;
  description: string;
  average_time: number;
  is_active: boolean;
}

const EMPTY_FORM: ServiceFormData = {
  name: '',
  description: '',
  average_time: 10,
  is_active: true,
};

export function AdminServicesPage() {
  const { managedOrgIds } = useAuth();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [services, setServices] = useState<NavbatService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<NavbatService | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<NavbatService | null>(null);

  // Tashkilotlarni yuklab, birinchisini tanlaymiz
  useEffect(() => {
    void (async () => {
      const { data, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (orgError) {
        setError(reportError('AdminServices.loadOrgs', orgError, 'Tashkilotlarni yuklab bo\'lmadi.'));
        setLoading(false);
        return;
      }

      const all = (data ?? []) as Organization[];
      const visible =
        managedOrgIds === 'all' ? all : all.filter((o) => managedOrgIds.includes(o.id));

      setOrganizations(visible);
      setSelectedOrgId((current) => current || visible[0]?.id || '');
      if (visible.length === 0) setLoading(false);
    })();
  }, [managedOrgIds]);

  const loadServices = useCallback(async () => {
    if (!selectedOrgId) return;
    setError(null);
    try {
      const { data, error: svcError } = await supabase
        .from('navbat_services')
        .select('*')
        .eq('organization_id', selectedOrgId)
        .order('name');
      if (svcError) throw svcError;
      setServices((data ?? []) as NavbatService[]);
    } catch (err) {
      setError(reportError('AdminServices.load', err, 'Xizmatlarni yuklashda xatolik yuz berdi.'));
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const flashSuccess = (message: string) => {
    setSuccessMsg(message);
    window.setTimeout(() => setSuccessMsg(null), 3000);
  };

  const openModal = (service: NavbatService | null) => {
    setEditingService(service);
    setFormData(
      service
        ? {
            name: service.name,
            description: service.description ?? '',
            average_time: service.average_time,
            is_active: service.is_active,
          }
        : EMPTY_FORM
    );
    setSaveError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) return;

    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        organization_id: selectedOrgId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        average_time: Math.min(Math.max(formData.average_time, 1), 240),
        is_active: formData.is_active,
        // `prefix` tashkilotdan olinadi, xizmat darajasida kerak emas.
        prefix: organizations.find((o) => o.id === selectedOrgId)?.prefix ?? 'A',
      };

      const { error: saveErr } = editingService
        ? await supabase.from('navbat_services').update(payload).eq('id', editingService.id)
        : await supabase.from('navbat_services').insert(payload);

      if (saveErr) throw saveErr;

      setShowModal(false);
      await loadServices();
      flashSuccess(editingService ? 'Xizmat yangilandi' : 'Xizmat qo\'shildi');
    } catch (err) {
      setSaveError(reportError('AdminServices.save', err, 'Saqlashda xatolik yuz berdi.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (service: NavbatService) => {
    const { error: toggleError } = await supabase
      .from('navbat_services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id);

    if (toggleError) {
      setError(reportError('AdminServices.toggle', toggleError, 'Holatni o\'zgartirib bo\'lmadi.'));
      return;
    }
    await loadServices();
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const { error: deleteError } = await supabase
      .from('navbat_services')
      .delete()
      .eq('id', pendingDelete.id);

    setPendingDelete(null);
    if (deleteError) {
      setError(reportError('AdminServices.delete', deleteError, 'Xizmatni o\'chirib bo\'lmadi.'));
      return;
    }
    await loadServices();
    flashSuccess('Xizmat o\'chirildi');
  };

  if (loading) {
    return (
      <DashboardLayout activePage="/admin/services" role="admin">
        <div className="flex items-center justify-center py-20">
          <Spinner className="w-8 h-8 text-electric-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (organizations.length === 0) {
    return (
      <DashboardLayout activePage="/admin/services" role="admin">
        <Card>
          <EmptyState
            icon={<Building2 className="w-8 h-8" />}
            title="Tashkilot yo'q"
            description="Xizmat qo'shish uchun avval tashkilot yarating yoki sizni tashkilotga biriktirishlarini kuting"
          />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePage="/admin/services" role="admin">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Xizmatlar</h1>
          <p className="text-navy-400 text-sm mt-1">
            Har bir xizmatning o'rtacha davomiyligi kutish vaqtini hisoblashda ishlatiladi
          </p>
        </div>
        <button onClick={() => openModal(null)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Yangi xizmat
        </button>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-success-500/10 border border-success-500/20 flex items-center gap-3 animate-fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-success-400 flex-shrink-0" />
          <p className="text-sm text-success-300">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-error-500/10 border border-error-500/20 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-error-400 flex-shrink-0" />
          <p className="text-sm text-error-300">{error}</p>
        </div>
      )}

      <Card className="mb-6">
        <label className="block text-sm font-medium text-navy-200 mb-1.5" htmlFor="service-org">
          Tashkilot
        </label>
        <select
          id="service-org"
          value={selectedOrgId}
          onChange={(e) => {
            setSelectedOrgId(e.target.value);
            setLoading(true);
          }}
          className="input-field sm:max-w-md"
        >
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </Card>

      <Card>
        {services.length === 0 ? (
          <EmptyState
            icon={<Settings className="w-8 h-8" />}
            title="Xizmatlar yo'q"
            description="Bu tashkilotda hali xizmat qo'shilmagan. Xizmatsiz ham navbat ishlaydi — mijozlar umumiy navbatga yoziladi."
            action={
              <button onClick={() => openModal(null)} className="btn-primary">
                Xizmat qo'shish
              </button>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <div key={service.id} className="glass p-5 rounded-xl card-hover">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold text-lg">{service.name}</h4>
                    {service.description && (
                      <p className="text-sm text-navy-400 mt-1">{service.description}</p>
                    )}
                  </div>
                  <Badge
                    className={
                      service.is_active
                        ? 'text-success-500 bg-success-500/10 border-success-500/20'
                        : 'text-navy-400 bg-navy-500/10 border-navy-500/20'
                    }
                  >
                    {service.is_active ? 'Faol' : 'Nofaol'}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 mb-4 text-xs text-navy-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {service.average_time} daqiqa
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(service)}
                    className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Tahrirlash
                  </button>
                  <button
                    onClick={() => handleToggleActive(service)}
                    className="px-3 py-2 rounded-xl glass text-navy-300 hover:text-white hover:bg-white/10 transition-colors"
                    title={service.is_active ? 'Nofaol qilish' : 'Faol qilish'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPendingDelete(service)}
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="glass-card p-6 w-full max-w-md animate-scale-in bg-navy-950/95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {editingService ? 'Xizmatni tahrirlash' : 'Yangi xizmat'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-navy-400 hover:text-white"
                aria-label="Yopish"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveError && (
              <div className="mb-4 p-3 rounded-xl bg-error-500/10 border border-error-500/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-error-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error-300">{saveError}</p>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-200 mb-1.5" htmlFor="svc-name">
                  Nomi
                </label>
                <input
                  id="svc-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="Terapevt qabuli"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-200 mb-1.5" htmlFor="svc-desc">
                  Tavsif
                </label>
                <textarea
                  id="svc-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  placeholder="Qisqacha izoh"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-200 mb-1.5" htmlFor="svc-time">
                  O'rtacha davomiyligi (daqiqa)
                </label>
                <input
                  id="svc-time"
                  type="number"
                  value={formData.average_time}
                  onChange={(e) =>
                    setFormData({ ...formData, average_time: parseInt(e.target.value, 10) || 1 })
                  }
                  className="input-field"
                  min={1}
                  max={240}
                  required
                />
                <p className="text-xs text-navy-500 mt-1.5">
                  Mijozga ko'rsatiladigan kutish vaqti shu raqamga ko'paytiriladi.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="svc-active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-navy-900"
                />
                <label htmlFor="svc-active" className="text-sm text-navy-200">
                  Faol (mijozlar tanlay oladi)
                </label>
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
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Xizmatni o'chirish"
        message={`"${pendingDelete?.name}" xizmatini o'chirmoqchimisiz? Bu xizmat bo'yicha olingan eski navbatlar tarixda saqlanib qoladi.`}
        confirmLabel="O'chirish"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  );
}
