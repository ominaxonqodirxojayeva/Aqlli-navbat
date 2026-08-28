import { useCallback, useEffect, useState } from 'react';
import { Plus, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, EmptyState, Spinner } from '@/components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuth } from '@/lib/auth-context';
import { supabase, type Organization } from '@/lib/supabase';
import { reportError } from '@/lib/errors';
import { generateSlug } from '@/lib/utils';
import { OrganizationList } from './admin-organizations/OrganizationList';
import { OrganizationFormModal, type OrganizationFormData } from './admin-organizations/OrganizationFormModal';

const EMPTY_FORM: OrganizationFormData = {
  name: '',
  type: 'clinic',
  prefix: 'P',
  slug: '',
  description: '',
  is_active: true,
};

export function AdminOrganizationsPage() {
  const { managedOrgIds, isSuperAdmin } = useAuth();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'clinic' | 'bank'>('all');
  const [formData, setFormData] = useState<OrganizationFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Organization | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadOrgs = useCallback(async () => {
    setError(null);
    try {
      const { data, error: loadError } = await supabase
        .from('organizations')
        .select('*')
        .order('name');
      if (loadError) throw loadError;

      const all = (data ?? []) as Organization[];
      setOrganizations(
        managedOrgIds === 'all' ? all : all.filter((o) => managedOrgIds.includes(o.id))
      );
    } catch (err) {
      setError(reportError('AdminOrgs.load', err, 'Tashkilotlarni yuklashda xatolik yuz berdi.'));
    } finally {
      setLoading(false);
    }
  }, [managedOrgIds]);

  useEffect(() => {
    void loadOrgs();
  }, [loadOrgs]);

  const flashSuccess = (message: string) => {
    setSuccessMsg(message);
    window.setTimeout(() => setSuccessMsg(null), 3000);
  };

  const openModal = (org: Organization | null) => {
    setEditingOrg(org);
    setFormData(
      org
        ? {
            name: org.name,
            type: (org.type === 'bank' ? 'bank' : 'clinic') as 'clinic' | 'bank',
            prefix: org.prefix ?? 'P',
            slug: org.slug ?? '',
            description: org.description ?? '',
            is_active: org.is_active,
          }
        : EMPTY_FORM
    );
    setSaveError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const slug = (formData.slug.trim() || generateSlug(formData.name)) || null;
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        prefix: formData.prefix.trim().toUpperCase() || (formData.type === 'bank' ? 'B' : 'P'),
        slug,
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      };

      const { error: saveErr } = editingOrg
        ? await supabase.from('organizations').update(payload).eq('id', editingOrg.id)
        : await supabase.from('organizations').insert(payload);

      if (saveErr) throw saveErr;

      setShowModal(false);
      await loadOrgs();
      flashSuccess(editingOrg ? 'Tashkilot yangilandi' : 'Tashkilot qo\'shildi');
    } catch (err) {
      setSaveError(reportError('AdminOrgs.save', err, 'Saqlashda xatolik yuz berdi.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (org: Organization) => {
    const { error: toggleError } = await supabase
      .from('organizations')
      .update({ is_active: !org.is_active })
      .eq('id', org.id);

    if (toggleError) {
      setError(reportError('AdminOrgs.toggle', toggleError, 'Holatni o\'zgartirib bo\'lmadi.'));
      return;
    }
    await loadOrgs();
    flashSuccess(org.is_active ? 'Tashkilot nofaol qilindi' : 'Tashkilot faollashtirildi');
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      // RPC faol navbat bo'lsa o'chirishga yo'l qo'ymaydi.
      const { error: rpcError } = await supabase.rpc('admin_delete_organization', {
        p_org_id: pendingDelete.id,
      });
      if (rpcError) throw rpcError;

      setPendingDelete(null);
      await loadOrgs();
      flashSuccess('Tashkilot o\'chirildi');
    } catch (err) {
      setPendingDelete(null);
      setError(reportError('AdminOrgs.delete', err, 'Tashkilotni o\'chirib bo\'lmadi.'));
    } finally {
      setDeleting(false);
    }
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

  return (
    <DashboardLayout activePage="/admin/organizations" role="admin">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tashkilotlar</h1>
          <p className="text-navy-400 text-sm mt-1">Poliklinika va banklarni boshqaring</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => openModal(null)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Tashkilot qo'shish
          </button>
        )}
      </div>

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-success-500/10 border border-success-500/20 flex items-center gap-3 animate-fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-success-400 flex-shrink-0" />
          <p className="text-sm text-success-300">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-error-500/10 border border-error-500/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-error-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-error-300">{error}</p>
        </div>
      )}

      {organizations.length === 0 ? (
        <Card>
          <EmptyState
            icon={<AlertCircle className="w-8 h-8" />}
            title="Tashkilot yo'q"
            description={
              isSuperAdmin
                ? 'Birinchi tashkilotni qo\'shing'
                : 'Sizga hali birorta tashkilot biriktirilmagan. Administratorga murojaat qiling.'
            }
            action={
              isSuperAdmin ? (
                <button onClick={() => openModal(null)} className="btn-primary">
                  Tashkilot qo'shish
                </button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <>
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
                aria-label="Tur"
              >
                <option value="all">Barchasi</option>
                <option value="clinic">Poliklinika</option>
                <option value="bank">Bank</option>
              </select>
            </div>
          </Card>

          <OrganizationList
            organizations={filteredOrgs}
            canDelete={isSuperAdmin}
            onAddNew={() => openModal(null)}
            onEdit={openModal}
            onToggleActive={handleToggleActive}
            onDelete={setPendingDelete}
          />
        </>
      )}

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

      <ConfirmDialog
        open={pendingDelete !== null}
        busy={deleting}
        title="Tashkilotni o'chirish"
        message={`"${pendingDelete?.name}" tashkilotini butunlay o'chirmoqchimisiz? Faol navbatlar bo'lsa o'chirilmaydi. Vaqtinchalik to'xtatish uchun "nofaol qilish" yetarli.`}
        confirmLabel="O'chirish"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  );
}
