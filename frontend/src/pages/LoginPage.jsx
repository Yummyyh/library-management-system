// frontend/src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { adminAuthAPI, librarianAuthAPI, studentAuthAPI } from '@/lib/api';
import { studentSession } from '@/lib/studentSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import LoginBackground from '@/components/ui/LoginBackground';

export default function LoginPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // ✅ 从 URL 参数读取角色
  const searchParams = new URLSearchParams(window.location.search);
  const urlRole = searchParams.get('role');

  const [role, setRole] = useState(urlRole || 'student');
  const [form, setForm] = useState({ email: '', password: '', studentId: '' });
  const [submitting, setSubmitting] = useState(false);

  const isStudentLogin = role === 'student';

  const onSubmit = async (e) => {
    e.preventDefault();

    if (isStudentLogin) {
      if (!form.studentId || !form.password) {
        return toast({ variant: 'destructive', title: 'Validation Failed', description: 'Please enter student ID and password' });
      }
    } else {
      if (!form.email || !form.password) {
        return toast({ variant: 'destructive', title: 'Validation Failed', description: 'Please enter email and password' });
      }
    }

    try {
      setSubmitting(true);

      // 🔹 [P2] 修改：登录前清理所有残留角色 Token，防止状态冲突
      localStorage.removeItem('admin_token');
      localStorage.removeItem('librarian_token');
      localStorage.removeItem('student_token');
      localStorage.removeItem('student_info');

      if (role === 'admin') {
        const { token, user } = await adminAuthAPI.login({ email: form.email, password: form.password });
        localStorage.setItem('admin_token', token);
        toast({ title: 'Login Successful', description: `Welcome, ${user.name}` });
        navigate('/admin');
      } else if (role === 'librarian') {
        const { token, user } = await librarianAuthAPI.login({ email: form.email, password: form.password });
        localStorage.setItem('librarian_token', token);
        toast({ title: 'Login Successful', description: `Welcome, ${user.name}` });
        navigate('/librarian');
      } else if (role === 'student') {
        const { token, student } = await studentAuthAPI.login({ studentId: form.studentId, password: form.password });
        studentSession.setToken(token);
        studentSession.setStudent(student);
        toast({ title: 'Login Successful', description: `Welcome, ${student.name}` });
        navigate('/student');
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Login Failed', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <LoginBackground className="pointer-events-none" />
      <form onSubmit={onSubmit} className="relative z-10 w-full max-w-md space-y-6 border rounded-xl bg-white p-8 shadow-sm">
        {/* 恢复标题 */}
        <h1 className="text-2xl font-bold text-center">📚 Library Login</h1>
        <div className="grid gap-2">
          <Label>Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">🎓 Student</SelectItem>
              <SelectItem value="librarian">📖 Librarian</SelectItem>
              <SelectItem value="admin">👑 Administrator</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isStudentLogin ? (
          <div className="grid gap-2">
            <Label>Student ID</Label>
            <Input
              value={form.studentId}
              onChange={e => setForm({ ...form, studentId: e.target.value })}
              placeholder="e.g., STU2023001"
              required
            />
          </div>
        ) : (
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="e.g., admin@library.com"
              required
            />
          </div>
        )}
        <div className="grid gap-2">
          <Label>Password</Label>
          <Input
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Login'}
        </Button>
        {role === 'student' && (
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <a href="/student/register" className="text-blue-600 hover:underline">Register here</a>
          </div>
        )}
      </form>
    </div>
  );
}
