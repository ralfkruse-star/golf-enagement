import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  Users, Calendar, Bell, MessageSquare, LayoutDashboard, Layers,
  Clock, Trophy, CreditCard, QrCode, Target, LogOut
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuthStore();

  const nav = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/members', icon: Users, label: 'Mitglieder' },
    { to: '/events', icon: Calendar, label: 'Events' },
    { to: '/notifications', icon: Bell, label: 'Push' },
    { to: '/feed', icon: MessageSquare, label: 'Feed' },
    { to: '/segments', icon: Layers, label: 'Segmente' },
    { to: '/tee-times', icon: Clock, label: 'Tee-Times' },
    { to: '/my-bookings', icon: Calendar, label: 'Meine Buchungen' },
    { to: '/handicap', icon: Target, label: 'Handicap' },
    { to: '/tournaments', icon: Trophy, label: 'Turniere' },
    { to: '/payments', icon: CreditCard, label: 'Zahlungen' },
    { to: '/qr-codes', icon: QrCode, label: 'QR-Codes' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary-600">Golf Siek</h1>
          <p className="text-sm text-gray-500">Admin Dashboard</p>
        </div>
        <nav className="px-3">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg mb-1 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold"></h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.firstName} {user?.lastName}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
