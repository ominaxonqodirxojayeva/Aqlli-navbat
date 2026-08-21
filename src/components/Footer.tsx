import { Clock, Github, Twitter, Linkedin } from 'lucide-react';
import { Logo } from './Navbar';

export function Footer() {
  return (
    <footer className="relative mt-20 border-t border-white/10 bg-navy-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Logo />
            <p className="text-navy-400 text-sm mt-4 max-w-md leading-relaxed">
              Aqlli Navbat — navbatni oldindan oling, kutish vaqtini real
              vaqtda kuzating va vaqtingizni tejang.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Platforma</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/#how" className="text-navy-400 hover:text-electric-400 transition-colors">Qanday ishlaydi</a></li>
              <li><a href="/#services" className="text-navy-400 hover:text-electric-400 transition-colors">Xizmatlar</a></li>
              <li><a href="/display" className="text-navy-400 hover:text-electric-400 transition-colors">Jonli display</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Bog'lanish</h4>
            <ul className="space-y-2 text-sm">
              <li className="text-navy-400">info@aqllinavbat.uz</li>
              <li className="text-navy-400">+998 71 123 45 67</li>
              <li className="flex gap-3 mt-3">
                <a href="#" className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:bg-electric-500/20 transition-colors">
                  <Twitter className="w-4 h-4 text-navy-300" />
                </a>
                <a href="#" className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:bg-electric-500/20 transition-colors">
                  <Linkedin className="w-4 h-4 text-navy-300" />
                </a>
                <a href="#" className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:bg-electric-500/20 transition-colors">
                  <Github className="w-4 h-4 text-navy-300" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-navy-500 text-xs">
            © 2026 Aqlli Navbat. Barcha huquqlar himoyalangan.
          </p>
          <div className="flex items-center gap-2 text-navy-500 text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Smart Queue Platform</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
