import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Settings,
  AlertCircle,
  CheckCircle2,
  X,
  Clock,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Badge, EmptyState, Spinner } from '@/components/ui';
import { supabase, type NavbatService } from '@/lib/supabase';

export function AdminServicesPage() {
  const [services, setServices] = useState<NavbatService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<NavbatService | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    average_time: 5,
    prefix: 'A',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadServices = async () => {
    setError(null);
    try {
      const { data, error } = await supabase
        .from('navbat_services')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setServices(data ?? []);
    } catch {
      setError('Ma\'lumotlarni yuklashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const openModal = (service: NavbatService | null) => {
    setEditingService(service);
    if (service) {
      setFormData({
        name: service.name,
        description: service.description ?? '',
        average_time: service.average_time,
        prefix: service.prefix,
        is_active: service.is_active,
      });
    } else {
      setFormData({ name: '', description: '', average_time: 5, prefix: 'A', is_active: true });
    }
    setSaveError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      if (editingService) {
        const { error } = await supabase
          .from('navbat_services')
          .update({
            name: formData.name,
            description: formData.description || null,
            average_time: formData.average_time,
            prefix: formData.prefix,
            is_active: formData.is_active,
          })
          .eq('id', editingService.id);
        if (error) throw error;
        setSuccessMsg('Xizmat yangilandi');
      } else {
        const { error } = await supabase.from('navbat_services').insert({
          name: formData.name,
          description: formData.description || null,
          average_time: formData.average_time,
          prefix: formData.prefix,
          is_active: formData.is_active,
        });
        if (error) throw error;
        setSuccessMsg('Xizmat qo\'shildi');
      }
      setShowModal(false);
      await loadServices();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setSaveError('Saqlashda xatolik yuz berdi.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (service: NavbatService) => {
    await supabase
      .from('navbat_services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id);
    await loadServices();
  };

  const handleDelete = async (service: NavbatService) => {
    if (!confirm(`"${service.name}" xizmatini o'chirishni tasdiqlaysizmi?`)) return;
    await supabase.from('navbat_services').delete().eq('id', service.id);
    await loadServices();
    setSuccessMsg('Xizmat o\'chirildi');
    setTimeout(() => setSuccessMsg(null), 3000);
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

  if (error) {
    return (
      <DashboardLayout activePage="/admin/services" role="admin">
        <Card>
          <EmptyState
            icon={<AlertCircle className="w-8 h-8" />}
            title="Xatolik"
            description={error}
            action={<button onClick={loadServices} className="btn-primary">Qayta urinish</button>}
          />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePage="/admin/services" role="admin">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Xizmatlar boshqaruvi</h1>
          <p className="text-navy-400 text-sm mt-1">Xizmatlarni qo'shing, tahrirlang va boshqaring</p>
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

      <Card>
        {services.length === 0 ? (
          <EmptyState
            icon={<Settings className="w-8 h-8" />}
            title="Xizmatlar yo'q"
            description="Birinchi xizmatni qo'shing"
            action={<button onClick={() => openModal(null)} className="btn-primary">Xizmat qo'shish</button>}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <div key={service.id} className="glass p-5 rounded-xl card-hover">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-white font-semibold text-lg">{service.name}</h4>
                    {service.description && (
                      <p className="text-sm text-navy-400 mt-1">{service.description}</p>
                    )}
                  </div>
                  <Badge className={service.is_active
                    ? 'text-success-500 bg-success-500/10 border-success-500/20'
                    : 'text-navy-400 bg-navy-500/10 border-navy-500/20'
                  }>
                    {service.is_active ? 'Faol' : 'Nofaol'}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 mb-4 text-xs text-navy-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {service.average_time} daqiqa
                  </span>
                  <span>Prefix: {service.prefix}</span>
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
                    className="px-3 py-2 rounded-xl glass text-navy-300 hover:text-white hover:bg-white/10 transition-colors text-sm"
                    title={service.is_active ? 'Nofaol qilish' : 'Faol qilish'}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service)}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="glass-card p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {editingService ? 'Xizmatni tahrirlash' : 'Yangi xizmat'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-navy-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveError && (
              <div className="mb-4 p-3 rounded-xl bg-error-500/10 border border-error-500/20 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-error-400 flex-shrink-0" />
                <p className="text-sm text-error-300">{saveError}</p>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-200 mb-1.5">Nomi</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="Pasport xizmati"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-200 mb-1.5">Tavsif</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  placeholder="Xizmat tavsifi"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-200 mb-1.5">O'rtacha vaqt (daqiqa)</label>
                  <input
                    type="number"
                    value={formData.average_time}
                    onChange={(e) => setFormData({ ...formData, average_time: parseInt(e.target.value) || 5 })}
                    className="input-field"
                    min={1}
                    max={120}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-200 mb-1.5">Prefix</label>
                  <input
                    type="text"
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase().slice(0, 3) })}
                    className="input-field"
                    placeholder="A"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-navy-900"
                />
                <label htmlFor="is_active" className="text-sm text-navy-200">Faol</label>
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
    </DashboardLayout>
  );
}
