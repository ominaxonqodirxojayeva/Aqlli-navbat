import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function LoadingScreen({ message = 'Yuklanmoqda...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-navy-950">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-electric-500/20" />
        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-electric-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-navy-300 text-sm font-medium animate-pulse">{message}</p>
    </div>
  );
}

export function Card({
  children,
  className = '',
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`glass-card p-6 ${hover ? 'card-hover' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${className}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-4 text-navy-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      {description && (
        <p className="text-navy-400 text-sm max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  color = 'electric',
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  color?: 'electric' | 'accent' | 'success' | 'warning' | 'error';
}) {
  const colorMap: Record<string, string> = {
    electric: 'from-electric-500/20 to-electric-600/5 text-electric-400',
    accent: 'from-accent-500/20 to-accent-600/5 text-accent-400',
    success: 'from-success-500/20 to-success-600/5 text-success-400',
    warning: 'from-warning-500/20 to-warning-600/5 text-warning-400',
    error: 'from-error-500/20 to-error-600/5 text-error-400',
  };
  return (
    <div className="glass-card p-5 card-hover">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center`}>
          {icon}
        </div>
        {trend && (
          <span className="text-xs text-navy-400 font-medium">{trend}</span>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-sm text-navy-400">{label}</p>
    </div>
  );
}
