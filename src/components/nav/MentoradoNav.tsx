import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, LogOut } from 'lucide-react';

const TABS = [
  { path: '/hoje', label: 'Hoje' },
  { path: '/semana', label: 'Semana' },
  { path: '/mes', label: 'Mês' },
  { path: '/historico', label: 'Histórico' },
];

export function MentoradoNav() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[hsl(222,55%,10%)] border-b border-white/10 shadow-xl">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          <span className="font-bold text-white text-sm hidden sm:block">
            Aferição da <span className="text-blue-400">META</span>
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                }`
              }
            >
              Admin
            </NavLink>
          )}
        </div>

        {/* User + Logout */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30 hidden sm:block truncate max-w-32">
            {user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
