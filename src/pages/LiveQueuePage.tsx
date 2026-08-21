import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock, Monitor, ArrowLeft, Volume2, Hospital, Banknote } from 'lucide-react';
import { Logo } from '@/components/Navbar';
import { supabase, type NavbatQueue, type Organization } from '@/lib/supabase';

export function DisplayPage() {
  const { slug } = useParams<{ slug: string }>();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [servingQueues, setServingQueues] = useState<NavbatQueue[]>([]);
  const [waitingQueues, setWaitingQueues] = useState<NavbatQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load organizations
  useEffect(() => {
    const loadOrgs = async () => {
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('is_active', true)
        .order('name');
      const orgs = (data ?? []) as Organization[];
      setOrganizations(orgs);

      if (slug) {
        const found = orgs.find((o) => o.slug === slug);
        if (found) setSelectedOrg(found);
      }
      setLoading(false);
    };
    void loadOrgs();
  }, [slug]);

  const loadData = async (orgId?: string) => {
    const targetOrgId = orgId ?? selectedOrg?.id;
    if (!targetOrgId) {
      setServingQueues([]);
      setWaitingQueues([]);
      return;
    }

    const { data, error } = await supabase.rpc('get_public_org_display', { p_org_id: targetOrgId });
    if (error) return;
    const queues = (data ?? []) as NavbatQueue[];
    setServingQueues(queues.filter((queue) => queue.status === 'serving'));
    setWaitingQueues(queues.filter((queue) => queue.status === 'waiting').slice(0, 10));
  };

  useEffect(() => {
    loadData();
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, [selectedOrg?.id]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('display-queues')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'navbat_queues' },
        () => void loadData()
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [selectedOrg?.id]);

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org);
    void loadData(org.id);
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      {/* Header */}
      <header className="glass border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-electric-400">
            <Monitor className="w-6 h-6" />
            <span className="text-sm font-semibold uppercase tracking-wider">Jonli Display</span>
          </div>
          {selectedOrg && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-light">
              {selectedOrg.type === 'clinic' ? <Hospital className="w-4 h-4 text-electric-400" /> : <Banknote className="w-4 h-4 text-accent-400" />}
              <span className="text-sm font-medium text-white">{selectedOrg.name}</span>
            </div>
          )}
          <div className="text-right">
            <p className="text-3xl font-bold text-white tabular-nums">
              {currentTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-sm text-navy-400">
              {currentTime.toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col p-6 lg:p-10 gap-6">
        {/* Org selector (if no org selected) */}
        {!selectedOrg && (
          <div>
            <h2 className="text-2xl font-bold text-white text-center mb-6">Tashkilotni tanlang</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {organizations.map((org, i) => (
                <button
                  key={org.id}
                  onClick={() => handleSelectOrg(org)}
                  className="glass-card p-6 rounded-2xl card-hover group text-left animate-fade-in-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      org.type === 'clinic' ? 'bg-electric-500/10 text-electric-400' : 'bg-accent-500/10 text-accent-400'
                    }`}>
                      {org.type === 'clinic' ? <Hospital className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{org.name}</h4>
                      <p className="text-xs text-navy-500">{org.type === 'clinic' ? 'Poliklinika' : 'Bank'}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedOrg && (
          <>
            {/* Now serving */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-electric-400 mb-6 uppercase tracking-wider flex items-center gap-3">
                <Volume2 className="w-7 h-7" />
                Hozir xizmat ko'rsatilmoqda
              </h2>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Clock className="w-12 h-12 text-electric-400 animate-spin" />
                </div>
              ) : servingQueues.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <p className="text-3xl text-navy-400 font-semibold">Hozircha mijoz chaqirilmagan</p>
                  <p className="text-lg text-navy-500 mt-2">Admin "Keyingi mijoz" tugmasini bosganda navbat shu yerda ko'rinadi</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {servingQueues.map((q) => (
                    <div
                      key={q.id}
                      className="glass-card p-8 rounded-3xl relative overflow-hidden animate-scale-in"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-electric-500/10 blur-[40px]" />
                      <div className="relative text-center">
                        <p className="text-sm text-navy-400 mb-2">{selectedOrg.name}</p>
                        <p className="text-7xl lg:text-8xl font-extrabold text-white tracking-tight">
                          {q.queue_number}
                        </p>
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-electric-500/10 border border-electric-500/20">
                          <span className="status-dot bg-electric-500 animate-pulse" />
                          <span className="text-sm text-electric-300 font-medium">Xizmat ko'rsatilmoqda</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming queues */}
            <div>
              <h2 className="text-2xl font-bold text-accent-400 mb-6 uppercase tracking-wider">
                Keyingi navbatlar
              </h2>
              {waitingQueues.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <p className="text-xl text-navy-400">Navbatda mijoz yo'q</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {waitingQueues.slice(0, 5).map((q, i) => (
                    <div
                      key={q.id}
                      className="glass-card p-6 rounded-2xl text-center card-hover"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <p className="text-xs text-navy-400 mb-2">{selectedOrg.name}</p>
                      <p className="text-4xl font-bold text-white tracking-tight">
                        {q.queue_number}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="glass border-t border-white/10 px-6 py-4 flex items-center justify-between">
        {selectedOrg ? (
          <button
            onClick={() => { setSelectedOrg(null); }}
            className="btn-ghost text-sm flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Tashkilot tanlash
          </button>
        ) : (
          <Link to="/" className="btn-ghost text-sm flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Bosh sahifa
          </Link>
        )}
        <p className="text-sm text-navy-400">
          Aqlli Navbat — Smart Queue Platform
        </p>
      </footer>
    </div>
  );
}
