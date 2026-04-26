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
        <Button variant="outline" onClick={handleLogout}>
          🚪 Logout
        </Button>
      </div>
      <form onSubmit={doSearch} className="flex gap-2 max-w-2xl">
        <Input
          placeholder="Enter Title / Author / ISBN..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </Button>
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
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : (results?.length || 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {searched ? 'No results found' : 'Enter keyword to start searching'}
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
                        {available ? 'Available' : 'Borrowed'}
                      </span>
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