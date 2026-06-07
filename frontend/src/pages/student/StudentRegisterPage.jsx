import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { studentAuthAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LoginBackground from '@/components/ui/LoginBackground';

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
      toast({ title: 'Registration Successful', description: 'You can now login with your reader ID and password' });
      navigate('/login');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Registration Failed', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <LoginBackground className="pointer-events-none" />

      <div className="relative z-10 w-full max-w-md space-y-6 bg-white/90 backdrop-blur-[4px] rounded-2xl border border-white/40 shadow-xl p-8">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-bold">Reader Registration</h1>
          <p className="text-sm text-muted-foreground">
            Create an account to access the library system
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your full name"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="e.g. reader@library.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Reader ID *</Label>
            <Input
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              placeholder="e.g. STU2023001"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Password *</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 6 characters"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] rounded-xl shadow-md transition-all duration-150"
            disabled={submitting}
          >
            {submitting ? 'Creating account…' : 'Register'}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
