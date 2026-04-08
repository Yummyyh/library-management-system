// frontend/src/pages/admin/BooksPage.jsx
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
import { bookAPI } from '@/lib/api';

const initialForm = {
  title: '', author: '', isbn: '', genre: 'Technology',
  description: '', language: 'English', shelfLocation: '',
  category: '', stock: 1,
};

export default function BooksPage() {
  const { toast } = useToast();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [keyword, setKeyword] = useState('');

  // 加载图书列表（支持搜索）
  const fetchBooks = async (kw = '') => {
    try {
      setLoading(true);
      const res = await bookAPI.list({ keyword: kw, page: 1, size: 100 });
      setBooks(res.list || []);
    } catch (err) {
      toast({ variant: 'destructive', title: '加载失败', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooks(); }, []);

  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 必填字段校验
      if (!form.title || !form.author || !form.isbn || !form.genre) {
        throw new Error('请填写标题、作者、ISBN 和分类');
      }
      if (form.stock < 0) throw new Error('库存不能为负数');

      const payload = {
        ...form,
        description: form.description || 'No description',
        language: form.language || 'English',
        shelfLocation: form.shelfLocation || 'Unassigned',
      };

      if (editingId) {
        await bookAPI.update(editingId, payload);
        toast({ title: '更新成功', description: `${form.title} 信息已更新` });
      } else {
        await bookAPI.create(payload);
        toast({ title: '创建成功', description: `图书 ${form.title} 已添加` });
      }
      setOpen(false);
      setForm(initialForm);
      setEditingId(null);
      fetchBooks(keyword);
    } catch (err) {
      toast({ variant: 'destructive', title: '操作失败', description: err.message });
    }
  };

  // 打开编辑
  const handleEdit = (book) => {
    setForm({
      title: book.title, author: book.author, isbn: book.isbn, genre: book.genre,
      description: '', language: '', shelfLocation: '',
      category: book.category || '', stock: book.stock,
    });
    setEditingId(book.id);
    setOpen(true);
  };

  // 软删除图书
  const handleDelete = async (book) => {
    if (!confirm(`确认移除图书《${book.title}》？（软删除，历史记录保留）`)) return;
    try {
      await bookAPI.remove(book.id);
      toast({ title: '移除成功', description: '图书已从目录隐藏' });
      fetchBooks(keyword);
    } catch (err) {
      toast({ variant: 'destructive', title: '操作失败', description: err.message });
    }
  };

  // 搜索
  const handleSearch = (e) => {
    e.preventDefault();
    fetchBooks(keyword);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">图书管理</h1>
        <div className="flex gap-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input placeholder="搜索书名/作者/ISBN" value={keyword}
              onChange={(e) => setKeyword(e.target.value)} className="w-64" />
            <Button type="submit">搜索</Button>
          </form>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setForm(initialForm); setEditingId(null); }}>
                + 新增图书
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? '编辑图书' : '添加新书'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>标题 *</Label>
                    <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>作者 *</Label>
                    <Input required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>ISBN *</Label>
                    <Input required value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>分类 *</Label>
                    <Input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} placeholder="Technology/Fiction/..." />
                  </div>
                  <div className="grid gap-2">
                    <Label>自定义分类</Label>
                    <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="可选" />
                  </div>
                  <div className="grid gap-2">
                    <Label>库存 *</Label>
                    <Input type="number" min={0} required value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>描述</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="可选" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>语言</Label>
                    <Input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="English" />
                  </div>
                  <div className="grid gap-2">
                    <Label>书架位置</Label>
                    <Input value={form.shelfLocation} onChange={(e) => setForm({ ...form, shelfLocation: e.target.value })} placeholder="Tech-A1" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
                  <Button type="submit">{editingId ? '保存' : '创建'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 图书列表 */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>书名</TableHead>
              <TableHead>作者</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>库存</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">加载中...</TableCell></TableRow>
            ) : books.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">{keyword ? '无匹配结果' : '暂无图书'}</TableCell></TableRow>
            ) : (
              books.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium">{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell className="text-xs">{book.isbn}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs">{book.genre}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold ${book.stock === 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {book.stock}
                    </span>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(book)}>编辑</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(book)}>移除</Button>
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