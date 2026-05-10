// frontend/src/pages/admin/UsersPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { userAPI } from '@/lib/api';

const initialForm = {
  name: '', email: '', studentId: '', role: 'STUDENT', password: '',
};

export default function UsersPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await userAPI.list({ page: 1, size: 100 });
      setUsers(res.list || []);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Load Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await userAPI.update(editingId, form);
        toast({ title: 'Updated', description: `${form.name} info updated` });
      } else {
        await userAPI.create(form);
        toast({ title: 'Created', description: `User ${form.name} added` });
      }
      setOpen(false);
      setForm(initialForm);
      setEditingId(null);
      fetchUsers();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Operation Failed', description: err.message });
    }
  };

  const handleEdit = (user) => {
    setForm({
      name: user.name, email: user.email, studentId: user.studentId,
      role: user.role, password: '',
    });
    setEditingId(user.id);
    setOpen(true);
  };

  const handleToggleStatus = async (user) => {
    try {
      const newStatus = user.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
      await userAPI.update(user.id, { status: newStatus });
      toast({
        title: newStatus === 'ACTIVE' ? 'Activated' : 'Deactivated',
        description: `${user.name} status updated`,
      });
      fetchUsers();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Operation Failed', description: err.message });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    toast({ title: 'Logged Out' });
    navigate('/login');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">👥 User Management</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleLogout}>🚪 Logout</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setForm(initialForm); setEditingId(null); }}>
                + Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit User' : 'Create New User'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label>Name *</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Email *</Label>
                  <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Student ID *</Label>
                  <Input required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Role *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">Student</SelectItem>
                      <SelectItem value="LIBRARIAN">Librarian</SelectItem>
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!editingId && (
                  <div className="grid gap-2">
                    <Label>Initial Password *</Label>
                    <Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingId ? 'Save' : 'Create'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* User list table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">No users yet</TableCell></TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.studentId}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                      user.role === 'LIBRARIAN' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>{user.role}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>{user.status === 'ACTIVE' ? '✅ Active' : '⏸ Deactivated'}</span>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>Edit</Button>
                    <Button size="sm" variant={user.status === 'ACTIVE' ? 'destructive' : 'default'}
                      onClick={() => handleToggleStatus(user)}>
                      {user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}