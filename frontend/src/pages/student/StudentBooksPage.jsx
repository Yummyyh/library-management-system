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
  const [expandedBookId, setExpandedBookId] = useState(null);

  useEffect(() => {
    if (!studentSession.getToken()) {
      navigate('/login');
    }
  }, [navigate]);

  const doSearch = async (e) => {
    e?.preventDefault?.();
    const keyword = q.trim();
    if (!keyword) {
      toast({ variant: 'destructive', title: 'Please enter keyword', description: 'Search by Title / Author / ISBN' });
      return;
    }
    try {
      setLoading(true);
      setSearched(true);
      const res = await studentBookAPI.search(keyword);
      setResults(res.list || []);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Search Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const borrow = async (book) => {
    try {
      setBorrowingId(book.id);
      await studentBookAPI.borrow(book.id);
      toast({ title: 'Borrowed Successfully', description: `You borrowed "${book.title}"` });
  
      // ✅ 完整乐观更新：同步更新库存计数 + 条形码数组状态
      setResults((prev) =>
        prev.map((b) => {
          if (b.id === book.id) {
            const currentCount = b.availableCount ?? b.stock ?? 0;
            const newCount = Math.max(0, currentCount - 1);
  
            // 深拷贝 barcodes，并将第一个 AVAILABLE 的条码状态改为 BORROWED（与后端逻辑一致）
            let firstAvailableMarked = false;
            const updatedBarcodes = (b.barcodes || []).map((bc) => {
              if (!firstAvailableMarked && bc.status === 'AVAILABLE') {
                firstAvailableMarked = true;
                return { ...bc, status: 'BORROWED' };
              }
              return bc;
            });
  
            return {
              ...b,
              availableCount: newCount,
              stock: newCount,
              availability: newCount > 0 ? 'available' : 'borrowed',
              barcodes: updatedBarcodes, // ✅ 关键：同步更新条形码列表
            };
          }
          return b;
        })
      );
    } catch (err) {
      if (String(err.message).toLowerCase().includes('unauthorized')) {
        studentSession.clear();
        navigate('/login');
        return;
      }
      toast({ variant: 'destructive', title: 'Borrow Failed', description: err.message });
    } finally {
      setBorrowingId(null);
    }
  };

  const handleLogout = () => {
    studentSession.clear();
    toast({ title: 'Logged Out' });
    navigate('/login');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">📖 Book Search & Borrow</h1>
          <p className="text-sm text-muted-foreground">
            {student ? `Current Student: ${student.name} (${student.studentId})` : 'Please login first'}
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>🚪 Logout</Button>
      </div>

      <form onSubmit={doSearch} className="flex gap-2 max-w-2xl">
        <Input placeholder="Enter Title / Author / ISBN..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" disabled={loading}>{loading ? 'Searching...' : 'Search'}</Button>
      </form>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : (results?.length || 0) === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">{searched ? 'No results found' : 'Enter keyword to start searching'}</TableCell></TableRow>
            ) : (
              results.map((b) => {
                // ✅ 修复：同时检查 availableCount 和 stock
                const available = (b.availableCount ?? b.stock ?? 0) > 0;
                const isExpanded = expandedBookId === b.id;
                
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.title}</TableCell>
                    <TableCell>{b.author}</TableCell>
                    <TableCell className="text-xs font-mono">{b.isbn}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded text-xs w-fit ${
                          available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {available ? `Available (${b.availableCount ?? b.stock ?? 0})` : 'Borrowed'}
                        </span>
                        {b.barcodes?.length > 0 && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-auto p-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-transparent"
                            onClick={() => setExpandedBookId(isExpanded ? null : b.id)}
                          >
                            {isExpanded ? '🔼 Hide Barcodes' : `🔍 View Barcodes (${b.barcodes.length})`}
                          </Button>
                        )}
                        {isExpanded && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1 max-w-[200px]">
                            {b.barcodes.map((bc) => (
                              <div key={bc.barcode} className="flex justify-between items-center gap-2">
                                <span className="font-mono truncate" title={bc.barcode}>
                                  {bc.barcode}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap ${
                                  bc.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 
                                  bc.status === 'BORROWED' ? 'bg-orange-100 text-orange-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {bc.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={!available || borrowingId === b.id}
                        onClick={() => borrow(b)}
                      >
                        {borrowingId === b.id ? 'Processing...' : 'Borrow'}
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