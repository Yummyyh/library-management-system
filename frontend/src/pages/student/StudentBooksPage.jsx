import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { studentBookAPI } from '@/lib/api';
import { studentSession } from '@/lib/studentSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function StudentBooksPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const student = useMemo(() => studentSession.getStudent(), []);

  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [borrowingId, setBorrowingId] = useState(null);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!studentSession.getToken()) {
      navigate('/student/login');
    }
  }, [navigate]);

  const doSearch = async (e) => {
    e?.preventDefault?.();
    const keyword = q.trim();
    if (!keyword) {
      toast({ variant: 'destructive', title: '请输入关键词', description: '可按书名 / 作者 / ISBN 搜索' });
      return;
    }

    try {
      setLoading(true);
      setSearched(true);
      const res = await studentBookAPI.search(keyword);
      setResults(res.list || []);
    } catch (err) {
      toast({ variant: 'destructive', title: '搜索失败', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const borrow = async (book) => {
    try {
      setBorrowingId(book.id);
      await studentBookAPI.borrow(book.id);

      toast({ title: '借阅成功', description: `已借阅《${book.title}》` });
      setResults((prev) =>
        prev.map((b) =>
          b.id === book.id
            ? { ...b, stock: Math.max(0, (b.stock ?? 0) - 1), availability: (b.stock ?? 0) - 1 > 0 ? 'available' : 'borrowed' }
            : b
        )
      );
    } catch (err) {
      if (String(err.message).toLowerCase().includes('unauthorized')) {
        studentSession.clear();
        navigate('/student/login');
        return;
      }
      toast({ variant: 'destructive', title: '借阅失败', description: err.message });
    } finally {
      setBorrowingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">图书检索与借阅</h1>
          <p className="text-sm text-muted-foreground">
            {student ? `当前学生：${student.name}（${student.studentId}）` : '请先登录'}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            studentSession.clear();
            toast({ title: '已退出登录' });
            navigate('/student/login');
          }}
        >
          退出登录
        </Button>
      </div>

      <form onSubmit={doSearch} className="flex gap-2 max-w-2xl">
        <Input
          placeholder="输入书名 / 作者 / ISBN..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          {loading ? '搜索中...' : '搜索'}
        </Button>
      </form>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>书名</TableHead>
              <TableHead>作者</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead>可借状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">加载中...</TableCell>
              </TableRow>
            ) : (results?.length || 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {searched ? 'No results found' : '请输入关键词开始搜索'}
                </TableCell>
              </TableRow>
            ) : (
              results.map((b) => {
                const available = (b.stock ?? 0) > 0;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.title}</TableCell>
                    <TableCell>{b.author}</TableCell>
                    <TableCell className="text-xs">{b.isbn}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {available ? 'available' : 'borrowed'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={!available || borrowingId === b.id}
                        onClick={() => borrow(b)}
                      >
                        {borrowingId === b.id ? '处理中...' : 'Borrow'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

