import { useState, useEffect } from 'react';
import { Plus, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, EmptyState, Spinner } from '@/components/ui';
import { supabase, type Organization } from '@/lib/supabase';
import { OrganizationList } from './admin-organizations/OrganizationList';
import { OrganizationFormModal, type OrganizationFormData } from './admin-organizations/OrganizationFormModal';

const emptyFormData: OrganizationFormData = {
  name: '',
  type: 'clinic',
  prefix: 'P',
  slug: '',
  description: '',
  is_active: true,
};

export function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'clinic' | 'bank'>('all');
  const [formData, setFormData] = useState<OrganizationFormData>(emptyFormData);
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
      setFormData(emptyFormData);
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

      <OrganizationList
        organizations={filteredOrgs}
        onAddNew={() => openModal(null)}
        onEdit={openModal}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
      />

      {showModal && (
        <OrganizationFormModal
          editingOrg={editingOrg}
          formData={formData}
          onChange={setFormData}
          saveError={saveError}
          saving={saving}
          onClose={() => setShowModal(false)}
          onSubmit={handleSave}
        />
      )}
    </DashboardLayout>
  );
}
