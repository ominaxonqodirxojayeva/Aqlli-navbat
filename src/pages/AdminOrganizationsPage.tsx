import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  AlertCircle,
  CheckCircle2,
  X,
  Hospital,
  Banknote,
  Search,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Badge, EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase, type Organization } from '@/lib/supabase';

export function AdminOrganizationsPage() {
  const { profile } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'clinic' | 'bank'>('all');
  const [formData, setFormData] = useState({
    name: '',
    type: 'clinic' as 'clinic' | 'bank',
    prefix: 'P',
    slug: '',
    description: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadOrgs = async () => {
    setError(null);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');
      if (error) throw error;
      setOrganizations((data ?? []) as Organization[]);
    } catch {
      setError('Ma\'lumotlarni yuklashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrgs();
  }, []);

  const generateSlug = (name: string): string => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    return slug;
  };

  const openModal = (org: Organization | null) => {
    setEditingOrg(org);
    if (org) {
      setFormData({
        name: org.name,
        type: org.type as 'clinic' | 'bank',
        prefix: org.prefix ?? 'P',
        slug: org.slug ?? '',
        description: org.description ?? '',
        is_active: org.is_active,
      });
    } else {
      setFormData({ name: '', type: 'clinic', prefix: 'P', slug: '', description: '', is_active: true });
    }
    setSaveError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const slug = formData.slug || generateSlug(formData.name);
      const prefix = formData.type === 'clinic' ? 'P' : 'B';
      if (editingOrg) {
        const { error } = await supabase
          .from('organizations')
          .update({
            name: formData.name,
            type: formData.type,
            prefix,
            slug,
            description: formData.description || null,
            is_active: formData.is_active,
          })
          .eq('id', editingOrg.id);
        if (error) throw error;
        setSuccessMsg('Tashkilot yangilandi');
      } else {
        const { error } = await supabase.from('organizations').insert({
          name: formData.name,
          type: formData.type,
          prefix,
          slug,
          description: formData.description || null,
          is_active: formData.is_active,
        });
        if (error) throw error;
        setSuccessMsg('Tashkilot qo\'shildi');
      }
      setShowModal(false);
      await loadOrgs();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setSaveError('Saqlashda xatolik yuz berdi.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (org: Organization) => {
    await supabase
      .from('organizations')
      .update({ is_active: !org.is_active })
      .eq('id', org.id);
    await loadOrgs();
  };

  const handleDelete = async (org: Organization) => {
    if (!confirm(`"${org.name}" tashkilotini o'chirishni tasdiqlaysizmi?`)) return;
    await supabase.from('organizations').delete().eq('id', org.id);
    await loadOrgs();
    setSuccessMsg('Tashkilot o\'chirildi');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const filteredOrgs = organizations.filter((org) => {
    if (typeFilter !== 'all' && org.type !== typeFilter) return false;
    if (search) return org.name.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  if (loading) {
    return (
      <DashboardLayout activePage="/admin/organizations" role="admin">
        <div className="flex items-center justify-center py-20">
          <Spinner className="w-8 h-8 text-electric-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout activePage="/admin/organizations" role="admin">
        <Card>
          <EmptyState
            icon={<AlertCircle className="w-8 h-8" />}
            title="Xatolik"
            description={error}
            action={<button onClick={loadOrgs} className="btn-primary">Qayta urinish</button>}
          />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePage="/admin/organizations" role="admin">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tashkilotlar</h1>
          <p className="text-navy-400 text-sm mt-1">Poliklinika va banklarni boshqaring</p>
        </div>
        <button onClick={() => openModal(null)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Tashkilot qo'shish
        </button>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-success-500/10 border border-success-500/20 flex items-center gap-3 animate-fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-success-400 flex-shrink-0" />
          <p className="text-sm text-success-300">{successMsg}</p>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-11"
              placeholder="Tashkilot nomini qidiring..."
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'clinic' | 'bank')}
            className="input-field sm:w-40"
          >
            <option value="all">Barchasi</option>
            <option value="clinic">Poliklinika</option>
            <option value="bank">Bank</option>
          </select>
        </div>
      </Card>

      <Card>
        {filteredOrgs.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-8 h-8" />}
            title="Tashkilotlar yo'q"
            description="Birinchi tashkilotni qo'shing"
            action={<button onClick={() => openModal(null)} className="btn-primary">Tashkilot qo'shish</button>}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrgs.map((org) => (
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
                    onClick={() => openModal(org)}
                    className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Tahrirlash
                  </button>
                  <button
                    onClick={() => handleToggleActive(org)}
                    className="px-3 py-2 rounded-xl glass text-navy-300 hover:text-white hover:bg-white/10 transition-colors text-sm"
                    title={org.is_active ? 'Nofaol qilish' : 'Faol qilish'}
                  >
                    <Building2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(org)}
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
                {editingOrg ? 'Tashkilotni tahrirlash' : 'Yangi tashkilot'}
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
                <label className="block text-sm font-medium text-navy-200 mb-1.5">Tashkilot turi</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'clinic', prefix: 'P' })}
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
                    onClick={() => setFormData({ ...formData, type: 'bank', prefix: 'B' })}
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase().slice(0, 3) })}
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
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="input-field"
                    placeholder="clinic-12"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-200 mb-1.5">Tavsif</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
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
      )}
    </DashboardLayout>
  );
}
