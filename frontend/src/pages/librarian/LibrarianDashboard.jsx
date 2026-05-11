// frontend/src/pages/librarian/LibrarianDashboard.jsx
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import LibrarianBackground from '@/components/ui/LibrarianBackground';
// ... existing imports ...
export default function LibrarianDashboard() {
    const handleLogout = () => {
      localStorage.removeItem('librarian_token');
      window.location.href = '/login';
    };
  
    return (
      // 外层加 relative，背景加 pointer-events-none，内容加 relative z-10
      <div className="relative min-h-screen bg-gray-50 p-6">
        <LibrarianBackground className="pointer-events-none" />
        <div className="relative z-10 max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">📖 Librarian Dashboard</h1>
              <p className="text-muted-foreground mt-1">Library Operations Panel</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              🚪 Logout
            </Button>
          </div>
          {/* Function Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Borrow Book Card */}
            <Link to="/librarian/borrow">
              <div className="p-6 border rounded-xl bg-white hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-2xl">
                    📕
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Borrow Book</h2>
                    <p className="text-sm text-muted-foreground">Process book checkout</p>
                  </div>
                </div>
              </div>
            </Link>
            {/* Return Book Card */}
            <Link to="/librarian/return">
              <div className="p-6 border rounded-xl bg-white hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-2xl">
                    📘
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Return Book</h2>
                    <p className="text-sm text-muted-foreground">Process book return</p>
                  </div>
                </div>
              </div>
            </Link>
            {/* Book Management Card */}
            <Link to="/librarian/books">
              <div className="p-6 border rounded-xl bg-white hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-2xl">
                    📚
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Book Management</h2>
                    <p className="text-sm text-muted-foreground">Manage book catalog</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link to="/librarian/overdue">
              <div className="p-6 border rounded-xl bg-white hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-rose-100 flex items-center justify-center text-2xl">
                    ⏰
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Overdue List</h2>
                    <p className="text-sm text-muted-foreground">View overdue loans and send reminders</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }
