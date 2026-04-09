import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { studentAuthAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialForm = { name: '', email: '', studentId: '', password: '' };

export default function StudentRegisterPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();

    // Client-side required field checks (server also validates).
    if (!form.name || !form.email || !form.studentId || !form.password) {
      toast({ variant: 'destructive', title: '校验失败', description: '请填写所有必填项' });
      return;
    }

    try {
      setSubmitting(true);
      await studentAuthAPI.register(form);
      toast({ title: '注册成功', description: '现在可以使用学号和密码登录' });
      navigate('/student/login');
    } catch (err) {
      toast({ variant: 'destructive', title: '注册失败', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 border rounded-lg p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">学生注册</h1>
          <p className="text-sm text-muted-foreground">创建账号以访问图书馆系统</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>姓名 *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid gap-2">
            <Label>邮箱 *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="grid gap-2">
            <Label>学号 *</Label>
            <Input value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required />
          </div>
          <div className="grid gap-2">
            <Label>密码 *</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? '提交中...' : '注册'}
          </Button>
        </form>

        <div className="text-sm">
          已有账号？{' '}
          <Link to="/student/login" className="text-blue-600 hover:underline">
            去登录
          </Link>
        </div>
      </div>
    </div>
  );
}

