import { Link, useLocation, useNavigate } from 'react-router-dom';
import { studentSession } from '@/lib/studentSession';
import AdminBackground from '@/components/ui/AdminBackground';

const navItems = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  { label: 'User Management', path: '/admin/users' },
  { label: 'System Settings', path: '/admin/settings' },
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = studentSession.getStudent();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    studentSession.clear();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      <AdminBackground className="pointer-events-none" />

      {/* Sidebar — pixel-perfect frosted glass, aligned with Librarian/Student */}
      <aside className="w-56 bg-white/40 backdrop-blur-[4px] flex flex-col m-3 rounded-2xl shadow-sm fixed top-0 left-0 h-[calc(100vh-24px)] z-20">
        <div className="px-6 py-6 border-b border-white/50">
          <h1 className="text-lg font-bold text-gray-800">Admin</h1>
          <p className="text-xs text-gray-400 mt-1">{user?.studentId || 'ADMIN-MODE'}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <div className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-150
                  ${isActive
                    ? 'bg-purple-600/10 text-purple-700 border-white/20 shadow-sm shadow-purple-500/5'
                    : 'text-gray-600 border-transparent hover:bg-white/40 hover:text-gray-900'
                  }`}>
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-5 pt-4 pb-8 border-t border-white/50 flex flex-col justify-end">
          <p className="text-base font-semibold text-gray-700 leading-none">{user?.name || 'Administrator'}</p>
          <button
            onClick={handleLogout}
            className="mt-2.5 text-sm text-gray-400 hover:text-red-500 transition-colors text-left w-fit"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content — deliberately NO key={location.pathname} to prevent sidebar flicker */}
      <main className="ml-56 flex-1 min-h-0 relative z-10">
        {children}
      </main>
    </div>
  );
}
