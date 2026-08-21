import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/Navbar';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4">
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-electric-600/10 blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-accent-500/10 blur-[100px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo className="justify-center mb-6" />
          <h1 className="text-2xl font-bold text-white">Tizimga kirish</h1>
          <p className="text-navy-400 text-sm mt-2">Hisobingizga kiring</p>
        </div>

        <div className="glass-card p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-error-500/10 border border-error-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-error-400 flex-shrink-0" />
              <p className="text-sm text-error-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-11"
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Parol</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Kirilmoqda...
                </>
              ) : (
                'Kirish'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-navy-400">
              Hisobingiz yo'qmi?{' '}
              <Link to="/register" className="text-electric-400 hover:text-electric-300 font-medium">
                Ro'yxatdan o'ting
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="btn-ghost inline-flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Bosh sahifaga qaytish
          </Link>
        </div>
      </div>
    </div>
  );
}
