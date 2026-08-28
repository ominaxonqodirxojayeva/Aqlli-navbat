import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Clock,
  Monitor,
  ArrowLeft,
  Volume2,
  VolumeX,
  Hospital,
  Banknote,
  Maximize2,
  Minimize2,
  Lock,
} from 'lucide-react';
import { Logo } from '@/components/Navbar';
import {
  supabase,
  type Organization,
  type PublicDisplayRow,
  type PublicOrgState,
} from '@/lib/supabase';
import { announceQueue, enableAudio, disableAudio, isAudioEnabled } from '@/lib/announce';
import { reportError } from '@/lib/errors';

/** Display ekrani har necha soniyada yangilanadi. */
const REFRESH_MS = 5000;

export function DisplayPage() {
  const { slug } = useParams<{ slug: string }>();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [servingQueues, setServingQueues] = useState<PublicDisplayRow[]>([]);
  const [waitingQueues, setWaitingQueues] = useState<PublicDisplayRow[]>([]);
  const [orgState, setOrgState] = useState<PublicOrgState | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [audioOn, setAudioOn] = useState(isAudioEnabled());
  const [fullscreen, setFullscreen] = useState(false);

  // Ovoz faqat YANGI chaqirilgan raqam uchun yangraydi
  const announcedNumbers = useRef<Set<string>>(new Set());

  // Soat
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Tashkilotlar ro'yxati (anon foydalanuvchi ham ko'ra oladi)
  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) reportError('Display.loadOrgs', error);

      const orgs = (data ?? []) as Organization[];
      setOrganizations(orgs);

      if (slug) {
        const found = orgs.find((o) => o.slug === slug);
        if (found) setSelectedOrg(found);
      }
      setLoading(false);
    })();
  }, [slug]);

  const loadData = useCallback(async (orgId: string) => {
    const [displayRes, stateRes] = await Promise.all([
      supabase.rpc('get_public_org_display', { p_org_id: orgId }),
      supabase.rpc('get_public_org_state', { p_org_id: orgId }),
    ]);

    if (displayRes.error) {
      reportError('Display.loadQueues', displayRes.error);
      return;
    }

    const rows = (displayRes.data ?? []) as PublicDisplayRow[];
    const serving = rows.filter((r) => r.status === 'serving');
    setServingQueues(serving);
    setWaitingQueues(rows.filter((r) => r.status === 'waiting').slice(0, 10));

    if (!stateRes.error) {
      setOrgState(((stateRes.data ?? []) as PublicOrgState[])[0] ?? null);
    }

    // Yangi chaqirilganlarni e'lon qilamiz
    for (const q of serving) {
      if (!announcedNumbers.current.has(q.id)) {
        announcedNumbers.current.add(q.id);
        announceQueue(q.queue_number);
      }
    }
    // Endi xizmatda bo'lmaganlarni ro'yxatdan olib tashlaymiz
    const servingIds = new Set(serving.map((q) => q.id));
    for (const id of announcedNumbers.current) {
      if (!servingIds.has(id)) announcedNumbers.current.delete(id);
    }
  }, []);

  // Anon foydalanuvchi uchun realtime ishlamaydi (RLS navbatlarni yopadi),
  // shuning uchun display doimiy qisqa intervalda yangilanadi.
  useEffect(() => {
    if (!selectedOrg) {
      setServingQueues([]);
      setWaitingQueues([]);
      setOrgState(null);
      return;
    }

    announcedNumbers.current.clear();
    void loadData(selectedOrg.id);

    const timer = window.setInterval(() => void loadData(selectedOrg.id), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [selectedOrg, loadData]);

  const handleToggleAudio = async () => {
    if (audioOn) {
      disableAudio();
      setAudioOn(false);
      return;
    }
    // Brauzer ovozga faqat foydalanuvchi bosgan tugmadan keyin ruxsat beradi
    const ok = await enableAudio();
    setAudioOn(ok);
  };

  const handleToggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setFullscreen(false);
      } else {
        await document.documentElement.requestFullscreen();
        setFullscreen(true);
      }
    } catch (err) {
      reportError('Display.fullscreen', err);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      <header className="glass border-b border-white/10 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <Logo />
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-electric-400">
            <Monitor className="w-6 h-6" />
            <span className="text-sm font-semibold uppercase tracking-wider hidden sm:inline">
              Jonli Display
            </span>
          </div>

          {selectedOrg && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-light">
              {selectedOrg.type === 'clinic' ? (
                <Hospital className="w-4 h-4 text-electric-400" />
              ) : (
                <Banknote className="w-4 h-4 text-accent-400" />
              )}
              <span className="text-sm font-medium text-white">{selectedOrg.name}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAudio}
              className={`p-2.5 rounded-xl glass-light transition-colors ${
                audioOn ? 'text-success-400' : 'text-navy-300 hover:text-white'
              }`}
              title={audioOn ? 'Ovozni o\'chirish' : 'Ovozli chaqiruvni yoqish'}
            >
              {audioOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={handleToggleFullscreen}
              className="p-2.5 rounded-xl glass-light text-navy-300 hover:text-white transition-colors"
              title={fullscreen ? 'Oynadan chiqish' : 'To\'liq ekran'}
            >
              {fullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>

          <div className="text-right">
            <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
              {currentTime.toLocaleTimeString('uz-UZ', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
            <p className="text-xs sm:text-sm text-navy-400">
              {currentTime.toLocaleDateString('uz-UZ', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
        </div>
      </header>

      {!audioOn && selectedOrg && (
        <div className="px-6 py-2 bg-electric-500/10 border-b border-electric-500/20 text-center">
          <button
            onClick={handleToggleAudio}
            className="text-sm text-electric-300 hover:text-electric-200 inline-flex items-center gap-2"
          >
            <Volume2 className="w-4 h-4" />
            Ovozli chaqiruvni yoqish uchun bosing
          </button>
        </div>
      )}

      <main className="flex-1 flex flex-col p-6 lg:p-10 gap-6">
        {!selectedOrg && (
          <div>
            <h2 className="text-2xl font-bold text-white text-center mb-6">Tashkilotni tanlang</h2>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Clock className="w-12 h-12 text-electric-400 animate-spin" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {organizations.map((org, i) => (
                  <button
                    key={org.id}
                    onClick={() => setSelectedOrg(org)}
                    className="glass-card p-6 rounded-2xl card-hover group text-left animate-fade-in-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          org.type === 'clinic'
                            ? 'bg-electric-500/10 text-electric-400'
                            : 'bg-accent-500/10 text-accent-400'
                        }`}
                      >
                        {org.type === 'clinic' ? (
                          <Hospital className="w-5 h-5" />
                        ) : (
                          <Banknote className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">{org.name}</h4>
                        <p className="text-xs text-navy-500">
                          {org.type === 'clinic' ? 'Poliklinika' : 'Bank'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedOrg && (
          <>
            {orgState && !orgState.is_open && (
              <div className="glass-card p-4 flex items-center justify-center gap-3 border-warning-500/20 bg-warning-500/5">
                <Lock className="w-5 h-5 text-warning-400" />
                <p className="text-warning-200 font-medium">Navbat qabuli yopiq</p>
              </div>
            )}

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-electric-400 mb-6 uppercase tracking-wider flex items-center gap-3">
                <Volume2 className="w-7 h-7" />
                Hozir xizmat ko'rsatilmoqda
              </h2>

              {servingQueues.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <p className="text-3xl text-navy-400 font-semibold">Hozircha mijoz chaqirilmagan</p>
                  <p className="text-lg text-navy-500 mt-2">
                    Xodim "Keyingi mijoz" tugmasini bosganda navbat shu yerda ko'rinadi
                  </p>
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
                        <p className="text-sm text-navy-400 mb-2">
                          {q.service_name ?? selectedOrg.name}
                        </p>
                        <p className="text-7xl lg:text-8xl font-extrabold text-white tracking-tight">
                          {q.queue_number}
                        </p>
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-electric-500/10 border border-electric-500/20">
                          <span className="status-dot bg-electric-500 animate-pulse" />
                          <span className="text-sm text-electric-300 font-medium">
                            Xizmat ko'rsatilmoqda
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="text-2xl font-bold text-accent-400 uppercase tracking-wider">
                  Keyingi navbatlar
                </h2>
                {orgState && (
                  <p className="text-sm text-navy-400">
                    Navbatda: <span className="text-white font-semibold">{orgState.waiting_count}</span> kishi
                  </p>
                )}
              </div>

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
                      <p className="text-xs text-navy-400 mb-2 truncate">
                        {q.service_name ?? selectedOrg.name}
                      </p>
                      <p className="text-4xl font-bold text-white tracking-tight">{q.queue_number}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="glass border-t border-white/10 px-6 py-4 flex items-center justify-between">
        {selectedOrg ? (
          <button onClick={() => setSelectedOrg(null)} className="btn-ghost text-sm flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Tashkilot tanlash
          </button>
        ) : (
          <Link to="/" className="btn-ghost text-sm flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Bosh sahifa
          </Link>
        )}
        <p className="text-sm text-navy-400">Aqlli Navbat — Smart Queue Platform</p>
      </footer>
    </div>
  );
}
