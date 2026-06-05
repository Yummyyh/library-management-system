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

// 快捷登录测试账本
const QUICK_ACCOUNTS = [
  { label: 'stu', role: 'student', value: 'STU2023001', fields: { studentId: 'STU2023001', email: '', password: 'stud123' } },
  { label: 'lib', role: 'librarian', value: 'librarian@library.com', fields: { studentId: '', email: 'librarian@library.com', password: 'lib123' } },
  { label: 'adm', role: 'admin', value: 'admin@library.com', fields: { studentId: '', email: 'admin@library.com', password: 'admin123' } }
];

export default function LoginPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(window.location.search);
  const urlRole = searchParams.get('role');

  const [role, setRole] = useState(urlRole || 'student');
  const [form, setForm] = useState({ email: '', password: '', studentId: '' });
  const [submitting, setSubmitting] = useState(false);

  const isStudentLogin = role === 'student';

  // 一键填入核心函数
  const handleQuickFill = (acc) => {
    setRole(acc.role);    // 切换下拉框角色
    setForm(acc.fields);  // 填满学号/邮箱以及密码
  };

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
        studentSession.setStudent(user);
        toast({ title: 'Login Successful', description: `Welcome, ${user.name}` });
        navigate('/librarian');
      } else if (role === 'student') {
        const { token, student } = await studentAuthAPI.login({ studentId: form.studentId, password: form.password });
        studentSession.setToken(token);
        studentSession.setStudent(student);
        toast({ title: 'Login Successful', description: `Welcome, ${student.name}` });
        navigate('/student/books');
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
              placeholder="e.g. STU2023001"
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
              placeholder="e.g. role@library.com"
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

        {/* 新增：测试快捷标签 */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs border-t border-dashed">
          <span className="text-gray-400">Test:</span>
          {QUICK_ACCOUNTS.map((acc, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickFill(acc)}
              className="px-2 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors border text-gray-600 font-medium"
            >
              {acc.label}
            </button>
          ))}
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