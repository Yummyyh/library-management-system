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
    if (!form.name || !form.email || !form.studentId || !form.password) {
      toast({ variant: 'destructive', title: 'Validation Failed', description: 'Please fill in all required fields' });
      return;
    }
    try {
      setSubmitting(true);
      await studentAuthAPI.register(form);
      toast({ title: 'Registration Successful', description: 'You can now login with your student ID and password' });
      // 🔹 [P2] 修改：跳转到统一登录页 /login
      navigate('/login');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Registration Failed', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 border rounded-lg p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Student Registration</h1>
          <p className="text-sm text-muted-foreground">Create an account to access the library system</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid gap-2">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="grid gap-2">
            <Label>Student ID *</Label>
            <Input value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required />
          </div>
          <div className="grid gap-2">
            <Label>Password *</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Register'}
          </Button>
        </form>
        <div className="text-sm">
          Already have an account?{' '}
          {/* 🔹 [P2] 修改：统一跳转至 /login */}
          <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}