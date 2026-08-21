import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Users,
  Bell,
  QrCode,
  Brain,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  TimerReset,
  CalendarDays,
  Monitor,
  Ticket,
  BarChart3,
  Building2,
  Search,
  User,
  Hospital,
  Banknote,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-navy-950">
      <Navbar />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <HowItWorks />
      <ServicesSection />
      <StatsSection />
      <CTASection />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-40" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-electric-600/10 blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-accent-500/10 blur-[100px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-light text-xs font-medium text-electric-300 mb-6">
              <span className="status-dot bg-success-500 animate-pulse" />
              Smart Queue Platform · O'zbekiston
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight text-balance">
              Aqlli <span className="gradient-text">Navbat</span>
            </h1>

            <p className="text-2xl sm:text-3xl font-semibold text-navy-100 mt-4 leading-tight">
              Navbatda kutma — vaqtingni boshqar.
            </p>

            <p className="text-navy-300 text-lg mt-6 max-w-xl leading-relaxed">
              Xizmatni tanlang, avtomatik navbat raqami oling, kutish vaqtini
              real vaqtda kuzating va navbatingiz chaqirilganda xabardor bo'ling.
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <Link to="/register" className="btn-primary flex items-center gap-2">
                Ro'yxatdan o'tish
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/display" className="btn-secondary flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Jonli display
              </Link>
            </div>

            <div className="flex items-center gap-6 mt-10">
              <div>
                <p className="text-2xl font-bold text-white">10K+</p>
                <p className="text-sm text-navy-400">Foydalanuvchilar</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="text-2xl font-bold text-white">50K+</p>
                <p className="text-sm text-navy-400">Navbatlar</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="text-2xl font-bold text-white">40%</p>
                <p className="text-sm text-navy-400">Kutish vaqti kamaydi</p>
              </div>
            </div>
          </div>

          <div className="animate-fade-in-up animation-delay-200">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-br from-electric-500/20 to-accent-500/20 rounded-3xl blur-2xl" />
      <div className="relative glass-card p-6 rounded-3xl">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-3 h-3 rounded-full bg-error-500/60" />
          <div className="w-3 h-3 rounded-full bg-warning-500/60" />
          <div className="w-3 h-3 rounded-full bg-success-500/60" />
          <div className="ml-3 text-xs text-navy-400 font-mono">aqllinavbat.uz/dashboard</div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-navy-400">Salom, Aziz</p>
              <p className="text-lg font-bold text-white">Mening navbatim</p>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-electric-500/10 border border-electric-500/20 text-xs font-semibold text-electric-300">
              Faol
            </div>
          </div>

          <div className="glass p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-3xl font-extrabold text-white tracking-tight">P-024</p>
                <p className="text-sm text-navy-400 mt-1">12-son Poliklinika</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-navy-400">Taxminiy kutish</p>
                <p className="text-2xl font-bold text-electric-400">15 daqiqa</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-navy-400">
                <span>Hozir: P-021</span>
                <span>Oldinda: 3 kishi</span>
              </div>
              <div className="h-2.5 rounded-full bg-navy-800 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-electric-500 to-accent-400 w-[35%] animate-pulse-slow" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="glass p-3 rounded-xl text-center">
              <Clock className="w-5 h-5 text-electric-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white">1</p>
              <p className="text-[10px] text-navy-400">Faol navbat</p>
            </div>
            <div className="glass p-3 rounded-xl text-center">
              <CheckCircle2 className="w-5 h-5 text-success-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white">12</p>
              <p className="text-[10px] text-navy-400">Tugallangan</p>
            </div>
            <div className="glass p-3 rounded-xl text-center">
              <TimerReset className="w-5 h-5 text-accent-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white">15m</p>
              <p className="text-[10px] text-navy-400">O'rtacha kutish</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 -left-4 glass-card p-3 pr-4 rounded-2xl flex items-center gap-3 animate-float max-w-[200px]">
        <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-accent-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-white">Navbatingiz chaqirildi!</p>
          <p className="text-[10px] text-navy-400">Xizmat ko'rsatish joyiga boring</p>
        </div>
      </div>
    </div>
  );
}

function ProblemSection() {
  const problems = [
    { icon: Users, title: 'Uzoq navbatlar', desc: 'Soatlab kutish va azob chekish' },
    { icon: TimerReset, title: 'Vaqt yo\'qotilishi', desc: 'Ish vaqtining behuda ketishi' },
    { icon: AlertTriangle, title: 'Stress', desc: 'Noqulaylik va asabiy holat' },
    { icon: TrendingUp, title: 'Tartibsizlik', desc: 'Tashkilotlarda navbat boshqaruvsizligi' },
  ];

  return (
    <section className="relative py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-error-500/10 border border-error-500/20 text-xs font-medium text-error-400 mb-4">
            Muammo
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Navbatlar vaqtni o'g'irlaydi
          </h2>
          <p className="text-navy-300 max-w-2xl mx-auto">
            Har kuni minglab odamlar tashkilotlarda soatlab navbat kutadi.
            Bu vaqt, energiya va sabr yo'qotish demak.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {problems.map((p, i) => (
            <div
              key={p.title}
              className="glass-card p-6 card-hover animate-fade-in-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-error-500/10 flex items-center justify-center mb-4">
                <p.icon className="w-6 h-6 text-error-400" />
              </div>
              <h3 className="text-white font-semibold mb-1">{p.title}</h3>
              <p className="text-sm text-navy-400">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SolutionSection() {
  const solutions = [
    { icon: CalendarDays, title: 'Masofadan navbat olish', desc: 'Uydagi turib navbatni oldindan oling' },
    { icon: Clock, title: 'Jonli navbat kuzatuvi', desc: 'Real vaqtda navbat holatini kuzating' },
    { icon: Brain, title: 'AI kutish vaqtini prognoz qilish', desc: 'Aqlli algoritm kutish vaqtini hisoblaydi' },
    { icon: Bell, title: 'Push notification', desc: 'Navbat yaqinlashganda xabardor bo\'ling' },
    { icon: QrCode, title: 'QR code', desc: 'Navbat raqamini QR orqali ko\'rsating' },
    { icon: Monitor, title: 'Jonli display', desc: 'TV yoki monitorda jonli navbat ko\'rsating' },
  ];

  return (
    <section className="relative py-20">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-electric-600/5 blur-[100px]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-500/10 border border-success-500/20 text-xs font-medium text-success-400 mb-4">
            Yechim
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Aqlli Navbat yechimi
          </h2>
          <p className="text-navy-300 max-w-2xl mx-auto">
            Platforma navbatni boshqaradi, kutish vaqtini prognoz qiladi va
            xodimlarni samarali ishlashga yordam beradi.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {solutions.map((s, i) => (
            <div
              key={s.title}
              className="glass-card p-6 card-hover group animate-fade-in-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-electric-500/20 to-accent-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <s.icon className="w-6 h-6 text-electric-400" />
              </div>
              <h3 className="text-white font-semibold mb-1">{s.title}</h3>
              <p className="text-sm text-navy-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { num: '01', icon: Building2, title: 'Tashkilot turini tanlang', desc: 'Poliklinika yoki Bankni tanlang' },
    { num: '02', icon: Search, title: 'Tashkilotni tanlang', desc: 'Kerakli poliklinika yoki bank nomini qidiring' },
    { num: '03', icon: User, title: 'Ism va telefonni kiriting', desc: 'Bir necha soniyada ma\'lumotlaringizni kiriting' },
    { num: '04', icon: Ticket, title: 'Navbat raqamingizni oling', desc: 'Tizim avtomatik navbat raqamini beradi' },
    { num: '05', icon: Monitor, title: 'Navbatingizni kuzating', desc: 'Oldingizdagi odamlar va kutish vaqtini real vaqtda ko\'ring' },
    { num: '06', icon: Bell, title: 'Navbatingiz kelganda boring', desc: 'Navbatingiz chaqirilganda sayt orqali xabar oling' },
  ];

  return (
    <section id="how" className="relative py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-electric-500/10 border border-electric-500/20 text-xs font-medium text-electric-300 mb-4">
            Qanday ishlaydi?
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            6 ta oddiy bosqich
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <div
              key={s.num}
              className="glass-card p-6 card-hover animate-fade-in-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-4 mb-4">
                <span className="text-3xl font-extrabold gradient-text">{s.num}</span>
                <div className="w-10 h-10 rounded-xl bg-electric-500/10 flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-electric-400" />
                </div>
              </div>
              <h3 className="text-white font-semibold mb-1">{s.title}</h3>
              <p className="text-sm text-navy-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesSection() {
  const categories = [
    { name: 'Poliklinikalar', desc: '1-son, 5-son, 12-son, Yunusobod, Chilonzor', icon: Hospital, color: 'text-electric-400' },
    { name: 'Banklar', desc: 'Kapitalbank, Hamkorbank, Ipak Yo\'li, Xalq Banki, Asakabank', icon: Banknote, color: 'text-accent-400' },
  ];

  return (
    <section id="services" className="relative py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-500/10 border border-accent-500/20 text-xs font-medium text-accent-400 mb-4">
            Tashkilotlar
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Poliklinika va banklar
          </h2>
          <p className="text-navy-300 max-w-2xl mx-auto">
            Poliklinika yoki bankni tanlab, soniyalar ichida navbat oling
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {categories.map((s, i) => (
            <div
              key={s.name}
              className="glass-card p-8 card-hover animate-fade-in-up group"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-electric-500/20 to-accent-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <s.icon className={`w-7 h-7 ${s.color}`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{s.name}</h3>
              <p className="text-sm text-navy-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { icon: Users, value: '10,000+', label: 'Foydalanuvchilar' },
    { icon: Ticket, value: '50,000+', label: 'Navbatlar' },
    { icon: Clock, value: '40%', label: 'Kutish vaqti kamaydi' },
    { icon: BarChart3, value: '99.9%', label: 'Uptime' },
  ];

  return (
    <section id="stats" className="relative py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card p-8 lg:p-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-electric-500/20 to-accent-500/10 flex items-center justify-center mx-auto mb-3">
                  <s.icon className="w-6 h-6 text-electric-400" />
                </div>
                <p className="text-3xl font-extrabold text-white">{s.value}</p>
                <p className="text-sm text-navy-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="relative py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="glass-card p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-electric-500/10 blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-accent-500/10 blur-[80px]" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Bugun navbat oling
            </h2>
            <p className="text-navy-300 text-lg mb-8 max-w-xl mx-auto">
              Ro'yxatdan o'ting va xizmatni tanlab, daqiqalar ichida navbat raqami oling.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/register" className="btn-primary flex items-center gap-2">
                Ro'yxatdan o'tish
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="btn-secondary">
                Kirish
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
