import { Link, useLocation, useNavigate } from 'react-router-dom';
import { studentSession } from '@/lib/studentSession'; // 注意：请确保此路径与你的项目 session 助手一致
import LibrarianBackground from '@/components/ui/LibrarianBackground';

const navItems = [
  { label: 'Manage Books', path: '/librarian/books' },
  { label: 'Borrow Book', path: '/librarian/borrow' },
  { label: 'Return Book', path: '/librarian/return' },
  { label: 'Reservations', path: '/librarian/holds' },
  { label: 'Fines Management', path: '/librarian/overdue' },
];

export default function LibrarianLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  // 暂时沿用项目的 session 机制获取登录用户信息
  const user = studentSession.getStudent();

  const handleLogout = () => {
    localStorage.removeItem('librarian_token');
    studentSession.clear();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-100">
      <LibrarianBackground className="pointer-events-none" />

      {/* Sidebar - 像素级对齐的毛玻璃侧边栏 */}
      <aside className="w-56 bg-white/40 backdrop-blur-md flex flex-col m-3 rounded-2xl shadow-sm fixed top-0 left-0 h-[calc(100vh-24px)] z-20">
        <div className="px-6 py-6 border-b border-white/50">
          {/* 纯净标题，去掉了 Portal 后缀 */}
          <h1 className="text-lg font-bold text-gray-800">Librarian</h1>
          <p className="text-xs text-gray-400 mt-1">{user?.studentId || 'LIB-MODE'}</p>
        </div>

        {/* 导航菜单 - 彻底消除由于 1px 边框和字重形变引起的点击抖动弹动 */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <div className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-150
                  ${isActive
                    ? 'bg-emerald-600/10 text-emerald-700 border-white/20 shadow-sm shadow-emerald-500/5'
                    : 'text-gray-600 border-transparent hover:bg-white/40 hover:text-gray-900'
                  }`}>
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* 左下角用户信息区 - 保持字号放大，并通过 pb-8 视觉整体上移 5mm */}
        <div className="px-5 pt-4 pb-8 border-t border-white/50 flex flex-col justify-end">
          <p className="text-base font-semibold text-gray-700 leading-none">{user?.name || 'Librarian'}</p>
          <button
            onClick={handleLogout}
            className="mt-2.5 text-sm text-gray-400 hover:text-red-500 transition-colors text-left w-fit"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-56 flex-1 min-h-0 relative z-10">
        {children}
      </main>
    </div>
  );
}
