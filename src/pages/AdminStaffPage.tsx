import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Search,
  Shield,
  Building2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Badge, EmptyState, Spinner } from '@/components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  supabase,
  type OrganizationMemberWithDetails,
  type Organization,
  type OrgMemberRole,
  type Profile,
} from '@/lib/supabase';
import { reportError } from '@/lib/errors';
import { formatDate } from '@/lib/utils';

const ROLE_LABELS: Record<OrgMemberRole, string> = {
  owner: 'Rahbar',
  operator: 'Operator',
};

/**
 * Xodimlarni tashkilotlarga biriktirish (faqat superadmin uchun).
 *
 * Biriktirilgan xodim faqat o'z tashkilotining navbatlarini ko'radi va
 * boshqaradi — bu `is_org_admin()` funksiyasi orqali bazada ta'minlanadi.
 */
export function AdminStaffPage() {
  const [members, setMembers] = useState<OrganizationMemberWithDetails[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [emailQuery, setEmailQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedRole, setSelectedRole] = useState<OrgMemberRole>('operator');
  const [adding, setAdding] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<OrganizationMemberWithDetails | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [membersRes, orgsRes] = await Promise.all([
        supabase
          .from('organization_members')
          .select('*, organization:organizations(*), profile:profiles(*)')
          .order('created_at', { ascending: false }),
        supabase.from('organizations').select('*').order('name'),
      ]);

      if (membersRes.error) throw membersRes.error;
      if (orgsRes.error) throw orgsRes.error;

      setMembers((membersRes.data ?? []) as unknown as OrganizationMemberWithDetails[]);
      const orgs = (orgsRes.data ?? []) as Organization[];
      setOrganizations(orgs);
      setSelectedOrgId((current) => current || orgs[0]?.id || '');
    } catch (err) {
      setError(reportError('AdminStaff.load', err, 'Xodimlarni yuklashda xatolik yuz berdi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const flashSuccess = (message: string) => {
    setSuccessMsg(message);
    window.setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = emailQuery.trim();
    if (term.length < 3) {
      setError('Qidirish uchun kamida 3 ta belgi kiriting.');
      return;
    }

    setSearching(true);
    setError(null);
    setSelectedUser(null);
    try {
      const { data, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.%${term}%,full_name.ilike.%${term}%`)
        .limit(10);

      if (searchError) throw searchError;
      const results = (data ?? []) as Profile[];
      setSearchResults(results);
      if (results.length === 0) {
        setError('Bunday foydalanuvchi topilmadi. U avval ro\'yxatdan o\'tgan bo\'lishi kerak.');
      }
    } catch (err) {
      setError(reportError('AdminStaff.search', err, 'Qidirishda xatolik yuz berdi.'));
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedUser || !selectedOrgId) return;

    setAdding(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from('organization_members').insert({
        organization_id: selectedOrgId,
        user_id: selectedUser.id,
        role: selectedRole,
      });
      if (insertError) throw insertError;

      setSelectedUser(null);
      setSearchResults([]);
      setEmailQuery('');
      await loadData();
      flashSuccess('Xodim tashkilotga biriktirildi');
    } catch (err) {
      setError(reportError('AdminStaff.add', err, 'Xodimni biriktirishda xatolik yuz berdi.'));
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!pendingRemove) return;
    try {
      const { error: deleteError } = await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', pendingRemove.organization_id)
        .eq('user_id', pendingRemove.user_id);

      if (deleteError) throw deleteError;
      setPendingRemove(null);
      await loadData();
      flashSuccess('Xodim tashkilotdan chiqarildi');
    } catch (err) {
      setPendingRemove(null);
      setError(reportError('AdminStaff.remove', err, 'Xodimni chiqarishda xatolik yuz berdi.'));
    }
  };

  if (loading) {
    return (
      <DashboardLayout activePage="/admin/staff" role="admin">
        <div className="flex items-center justify-center py-20">
          <Spinner className="w-8 h-8 text-electric-400" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePage="/admin/staff" role="admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Xodimlar</h1>
        <p className="text-navy-400 text-sm mt-1">
          Xodimni tashkilotga biriktiring — u faqat o'sha tashkilot navbatlarini boshqaradi
        </p>
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

      {/* Yangi xodim biriktirish */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-electric-400" />
          <h3 className="text-white font-semibold">Xodim biriktirish</h3>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
            <input
              type="text"
              value={emailQuery}
              onChange={(e) => setEmailQuery(e.target.value)}
              className="input-field pl-11"
              placeholder="Email yoki ism bo'yicha qidiring..."
            />
          </div>
          <button type="submit" disabled={searching} className="btn-secondary text-sm disabled:opacity-50">
            {searching ? 'Qidirilmoqda...' : 'Qidirish'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="space-y-2 mb-4">
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedUser?.id === user.id
                    ? 'bg-electric-500/10 border-electric-500/30'
                    : 'glass border-white/10 hover:bg-white/5'
                }`}
              >
                <p className="text-sm font-medium text-white">{user.full_name}</p>
                <p className="text-xs text-navy-400">{user.email ?? '—'}</p>
              </button>
            ))}
          </div>
        )}

        {selectedUser && (
          <div className="p-4 rounded-xl glass space-y-3">
            <p className="text-sm text-navy-200">
              <span className="text-white font-semibold">{selectedUser.full_name}</span> quyidagi
              tashkilotga biriktiriladi:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="input-field"
                aria-label="Tashkilot"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as OrgMemberRole)}
                className="input-field"
                aria-label="Rol"
              >
                <option value="operator">Operator — navbatlarni chaqiradi</option>
                <option value="owner">Rahbar — tashkilotni ham tahrirlaydi</option>
              </select>
            </div>
            <button
              onClick={handleAdd}
              disabled={adding || !selectedOrgId}
              className="btn-primary text-sm w-full sm:w-auto disabled:opacity-50"
            >
              {adding ? 'Biriktirilmoqda...' : 'Biriktirish'}
            </button>
          </div>
        )}
      </Card>

      {/* Mavjud xodimlar */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-accent-400" />
          <h3 className="text-white font-semibold">Biriktirilgan xodimlar</h3>
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="Xodimlar yo'q"
            description="Hozircha hech kim tashkilotga biriktirilmagan. Superadmin barcha tashkilotlarni ko'radi."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase">Xodim</th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase">Tashkilot</th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase">Rol</th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase hidden sm:table-cell">
                    Biriktirilgan
                  </th>
                  <th className="py-3 px-2 text-xs font-semibold text-navy-400 uppercase">Amal</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={`${m.organization_id}-${m.user_id}`}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-2">
                      <p className="text-sm text-white font-medium">{m.profile?.full_name ?? '—'}</p>
                      <p className="text-xs text-navy-500">{m.profile?.email ?? ''}</p>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-navy-400 flex-shrink-0" />
                        <span className="text-sm text-navy-200">{m.organization?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <Badge
                        className={
                          m.role === 'owner'
                            ? 'text-electric-400 bg-electric-500/10 border-electric-500/20'
                            : 'text-navy-300 bg-navy-500/10 border-navy-500/20'
                        }
                      >
                        <Shield className="w-3 h-3" />
                        {ROLE_LABELS[m.role]}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 hidden sm:table-cell">
                      <span className="text-xs text-navy-400">{formatDate(m.created_at)}</span>
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => setPendingRemove(m)}
                        className="p-2 rounded-lg bg-error-500/10 hover:bg-error-500/20 text-error-400 transition-colors"
                        title="Chiqarish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={pendingRemove !== null}
        title="Xodimni chiqarish"
        message={`${pendingRemove?.profile?.full_name ?? 'Bu foydalanuvchi'} endi "${
          pendingRemove?.organization?.name ?? ''
        }" tashkilotini boshqara olmaydi. Uning hisobi o'chirilmaydi.`}
        confirmLabel="Chiqarish"
        destructive
        onCancel={() => setPendingRemove(null)}
        onConfirm={handleRemove}
      />
    </DashboardLayout>
  );
}
