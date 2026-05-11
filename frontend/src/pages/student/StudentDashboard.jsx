// frontend/src/pages/student/StudentDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { studentSession } from '@/lib/studentSession';
import { studentNotificationAPI } from '@/lib/api';
import StudentBackground from '@/components/ui/StudentBackground';

export default function StudentDashboard() {
    const student = studentSession.getStudent();
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleLogout = () => {
      studentSession.clear();
      window.location.href = '/login';
    };

    // 页面加载时获取通知
    useEffect(() => {
      const fetchNotifications = async () => {
        try {
          setLoading(true);
          const data = await studentNotificationAPI.getNotifications();
          if (data && data.list && data.list.length > 0) {
            setNotifications(data.list);
            setShowNotifications(true); // 有通知时弹出
          }
        } catch (err) {
          console.error('Failed to fetch notifications:', err.message);
        } finally {
          setLoading(false);
        }
      };

      if (student) {
        fetchNotifications();
      }
    }, [student]);
  
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
                    <h2 className="text-xl font-semibold">Search & Borrow Books</h2>
                    <p className="text-sm text-muted-foreground">Browse and borrow books</p>
                  </div>
                </div>
              </div>
            </Link>
            {/* My Loans Card */}
            <Link to="/student/my-loans">
              <div className="p-6 border rounded-xl bg-white hover:shadow-md cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-2xl">
                    📋
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">My Borrowing History</h2>
                    <p className="text-sm text-muted-foreground">View your loans</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* 📬 通知对话框 */}
        <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>⚠️</span>
                <span>Overdue Notifications</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.map((notif, idx) => (
                <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    {idx + 1}. <strong>{notif.bookTitle}</strong>已逾期<strong>{notif.overdueDay}</strong>天，请及时归还
                  </p>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowNotifications(false)}>已知晓</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }