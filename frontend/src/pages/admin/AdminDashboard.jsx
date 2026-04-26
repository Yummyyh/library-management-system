// frontend/src/pages/admin/AdminDashboard.jsx
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AdminBackground from '@/components/ui/AdminBackground';
// ... existing imports ...
export default function AdminDashboard() {
    const handleLogout = () => {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    };
  
    return (
      // 外层加 relative，背景加 pointer-events-none，内容加 relative z-10
      <div className="relative min-h-screen bg-gray-50 p-6">
        <AdminBackground className="pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">👑 Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">System Administration Panel</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              🚪 Logout
            </Button>
          </div>
          {/* Function Cards */}
          <div className="grid gap-6 md:grid-cols-1">
            <Link to="/admin/users">
              <div className="p-6 border rounded-xl bg-white hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-2xl">
                    👥
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">User Management</h2>
                    <p className="text-sm text-muted-foreground">Manage users, roles, and accounts</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }