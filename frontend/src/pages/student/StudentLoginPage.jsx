import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { studentAuthAPI } from '@/lib/api';
import { studentSession } from '@/lib/studentSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialForm = { studentId: '', password: '' };

export default function StudentLoginPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.password) {
      toast({ variant: 'destructive', title: '校验失败', description: '请输入学号和密码' });
      return;
    }

    try {
      setSubmitting(true);
      const { token, student } = await studentAuthAPI.login(form);
      studentSession.setToken(token);
      studentSession.setStudent(student);

      toast({ title: '登录成功', description: `欢迎，${student.name}` });
      navigate('/student/books');
    } catch (err) {
      toast({ variant: 'destructive', title: '登录失败', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 border rounded-lg p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">学生登录</h1>
          <p className="text-sm text-muted-foreground">使用学号和密码进入系统</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>学号 *</Label>
            <Input value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required />
          </div>
          <div className="grid gap-2">
            <Label>密码 *</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? '登录中...' : '登录'}
          </Button>
        </form>

        <div className="text-sm">
          还没有账号？{' '}
          <Link to="/student/register" className="text-blue-600 hover:underline">
            去注册
          </Link>
        </div>
      </div>
    </div>
  );
}

