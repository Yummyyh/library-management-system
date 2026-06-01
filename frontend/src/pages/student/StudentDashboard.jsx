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
    const studentId = student?.id;
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleLogout = () => {
      studentSession.clear();
      window.location.href = '/login';
    };

    const dismissNotifications = async () => {
      setShowNotifications(false);
      try {
        await studentNotificationAPI.clearNotifications();
      } catch (err) {
        console.error('Failed to clear notifications:', err.message);
      }
    };

    const handleNotificationOpenChange = (open) => {
      if (open) {
        setShowNotifications(true);
        return;
      }
      dismissNotifications();
    };

    // 仅在登录用户 id 变化时拉取一次，避免每次渲染重复请求导致弹窗无法关闭
    useEffect(() => {
      if (!studentId) return;

      let cancelled = false;

      const fetchNotifications = async () => {
        try {
          setLoading(true);
          const data = await studentNotificationAPI.getNotifications();
          if (cancelled) return;
          if (data?.list?.length > 0) {
            setNotifications(data.list);
            setShowNotifications(true);
          }
        } catch (err) {
          if (!cancelled) {
            console.error('Failed to fetch notifications:', err.message);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

      fetchNotifications();

      return () => {
        cancelled = true;
      };
    }, [studentId]);
  
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
              <div className="p-6 border rounded-xl bg-white hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-2xl">
                    📋
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">My Borrowing History</h2>
                    <p className="text-sm text-muted-foreground">View loans and due status</p>
                  </div>
                </div>
              </div>
            </Link>
            {/* My Fines Card */}
            <Link to="/student/fine">
              <div className="p-6 border rounded-xl bg-white hover:shadow-md transition-shadow">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                    {/* 罚款相关的图标，和你们项目风格统一 */}
                    <span className="text-red-600 font-bold text-xl">¥</span>
                    </div>
                    <div>
                     <h2 className="text-xl font-semibold">My Fines</h2>
                     <p className="text-sm text-muted-foreground">View and pay overdue fines</p >
                  </div>
                 </div>
              </div>
            </Link>
          </div>
        </div>

        {/* 📬 通知对话框 */}
        <Dialog open={showNotifications} onOpenChange={handleNotificationOpenChange}>
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
                    {idx + 1}. <strong>{notif.bookTitle}</strong> is overdue by <strong>{notif.overdueDay}</strong> day(s). Please return it as soon as possible.
                  </p>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={dismissNotifications}>Understood</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
