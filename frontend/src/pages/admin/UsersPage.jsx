import { useState, useEffect, useCallback } from 'react';
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

  return (
    <div className="h-screen p-6 bg-transparent flex flex-col justify-start overflow-hidden">
      <div className="max-w-[1920px] w-full mx-auto h-full min-h-0 bg-white/90 backdrop-blur-[4px] rounded-2xl p-6 shadow-md border border-white/40 flex flex-col space-y-5 overflow-hidden">

        {/* Fixed header area */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage users, roles, and accounts</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => { setForm(initialForm); setEditingId(null); }}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 active:scale-[0.98] rounded-xl shadow-md transition-all duration-150"
              >
                + Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-[4px] rounded-2xl border border-white/50">
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
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}
                    className="bg-white/60 hover:bg-white/90 border border-gray-200/60 text-gray-600 rounded-xl">
                    Cancel
                  </Button>
                  <Button type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 active:scale-[0.98] rounded-xl shadow-md transition-all duration-150">
                    {editingId ? 'Save' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Scrollable table area */}
        <div className="flex-1 w-full overflow-y-auto pr-1">
          <div className="border border-gray-100/60 rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 shadow-sm">
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
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading users...</TableCell></TableRow>
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No users yet</TableCell></TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="border-b border-gray-100/40 hover:bg-white/40 transition-colors">
                      <TableCell className="font-medium text-gray-800">{user.name}</TableCell>
                      <TableCell className="text-gray-600">{user.email}</TableCell>
                      <TableCell className="text-gray-600">{user.studentId}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          user.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                          user.role === 'LIBRARIAN' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>{user.role}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>{user.status === 'ACTIVE' ? '✅ Active' : '⏸ Deactivated'}</span>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(user)}
                          className="bg-white/60 hover:bg-white/90 border border-gray-200/60 text-gray-600 rounded-lg text-xs">
                          Edit
                        </Button>
                        <Button size="sm"
                          variant={user.status === 'ACTIVE' ? 'destructive' : 'default'}
                          onClick={() => handleToggleStatus(user)}
                          className={user.status === 'ACTIVE'
                            ? 'px-3 py-1 text-xs font-medium rounded-lg'
                            : 'px-3 py-1 text-xs font-medium text-white bg-purple-500 hover:bg-purple-600 active:scale-[0.98] rounded-lg shadow-sm transition-all duration-150'
                          }>
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

      </div>
    </div>
  );
}
