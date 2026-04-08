// frontend/src/pages/admin/UsersPage.jsx
import { useState, useEffect } from 'react';
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

// JSDoc 类型注释（可选，帮助编辑器提示）
/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} studentId
 * @property {'STUDENT'|'LIBRARIAN'|'ADMIN'} role
 * @property {'ACTIVE'|'DEACTIVATED'} status
 * @property {string} createdAt
 */

/**
 * @typedef {Object} FormState
 * @property {string} name
 * @property {string} email
 * @property {string} studentId
 * @property {string} role
 * @property {string} password
 */

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

  // 加载用户列表
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userAPI.list({ page: 1, size: 100 });
      setUsers(res.list || []);
    } catch (err) {
      toast({ variant: 'destructive', title: '加载失败', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // 提交表单（创建/更新）
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await userAPI.update(editingId, form);
        toast({ title: '更新成功', description: `${form.name} 信息已更新` });
      } else {
        await userAPI.create(form);
        toast({ title: '创建成功', description: `用户 ${form.name} 已添加` });
      }
      setOpen(false);
      setForm(initialForm);
      setEditingId(null);
      fetchUsers();
    } catch (err) {
      toast({ variant: 'destructive', title: '操作失败', description: err.message });
    }
  };

  // 打开编辑弹窗
  const handleEdit = (user) => {
    setForm({
      name: user.name, email: user.email, studentId: user.studentId,
      role: user.role, password: '',
    });
    setEditingId(user.id);
    setOpen(true);
  };

  // 停用/启用用户
  const handleToggleStatus = async (user) => {
    try {
      const newStatus = user.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
      await userAPI.update(user.id, { status: newStatus });
      toast({
        title: `${newStatus === 'ACTIVE' ? '启用' : '停用'}成功`,
        description: `${user.name} 状态已更新`,
      });
      fetchUsers();
    } catch (err) {
      toast({ variant: 'destructive', title: '操作失败', description: err.message });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setForm(initialForm); setEditingId(null); }}>
              + 新增用户
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingId ? '编辑用户' : '创建新用户'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label>姓名 *</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>邮箱 *</Label>
                <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>学号 *</Label>
                <Input required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>角色 *</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue placeholder="选择角色" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">学生</SelectItem>
                    <SelectItem value="LIBRARIAN">图书管理员</SelectItem>
                    <SelectItem value="ADMIN">系统管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!editingId && (
                <div className="grid gap-2">
                  <Label>初始密码 *</Label>
                  <Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
                <Button type="submit">{editingId ? '保存' : '创建'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 用户列表表格 */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>姓名</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>学号</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">加载中...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">暂无用户</TableCell></TableRow>
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
                    }`}>{user.status === 'ACTIVE' ? '✅ 激活' : '⏸ 停用'}</span>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>编辑</Button>
                    <Button size="sm" variant={user.status === 'ACTIVE' ? 'destructive' : 'default'}
                      onClick={() => handleToggleStatus(user)}>
                      {user.status === 'ACTIVE' ? '停用' : '启用'}
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