// frontend/src/pages/student/StudentDashboard.jsx
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { studentSession } from '@/lib/studentSession';
import StudentBackground from '@/components/ui/StudentBackground';

// ... existing imports ...
export default function StudentDashboard() {
    const student = studentSession.getStudent();
    const handleLogout = () => {
      studentSession.clear();
      window.location.href = '/login';
    };
  
    return (
      // 外层加 relative，背景加 pointer-events-none，内容加 relative z-10
      <div className="relative min-h-screen bg-gray-50 p-6">
        <StudentBackground className="pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">🎓 Student Portal</h1>
              <p className="text-muted-foreground mt-1">
                {student ? `Welcome, ${student.name} (${student.studentId})` : 'Welcome'}
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              🚪 Logout
            </Button>
          </div>
          {/* Function Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Search & Borrow Card */}
            <Link to="/student/books">
              <div className="p-6 border rounded-xl bg-white hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-2xl">
                    🔍
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Browse & Borrow Books</h2>
                    <p className="text-sm text-muted-foreground">Paged catalog, search, and borrow</p>
                  </div>
                </div>
              </div>
            </Link>
            {/* My Loans Card */}
            <div className="p-6 border rounded-xl bg-white opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-2xl">
                  📋
                </div>
                <div>
                  <h2 className="text-xl font-semibold">My Borrowing History</h2>
                  <p className="text-sm text-muted-foreground">Coming soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }