import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { studentBookAPI } from '@/lib/api';
import { studentSession } from '@/lib/studentSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 12;

export default function StudentBooksPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const student = useMemo(() => studentSession.getStudent(), []);

  const [q, setQ] = useState('');
  const [activeQ, setActiveQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [borrowingId, setBorrowingId] = useState(null);
  const [results, setResults] = useState([]);
  const [expandedBookId, setExpandedBookId] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);

  useEffect(() => {
    if (!studentSession.getToken()) {
      navigate('/login');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        const res = await studentBookAPI.listCatalog({
          page,
          limit: PAGE_SIZE,
          ...(activeQ ? { q: activeQ } : {}),
        });

        if (cancelled) return;

        setResults(res.list || []);
        setTotal(typeof res.total === 'number' ? res.total : 0);
      } catch (err) {
        if (!cancelled) {
          toast({
            variant: 'destructive',
            title: 'Failed to load',
            description: err.message,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, activeQ, navigate]);

  const doSearch = (e) => {
    e?.preventDefault?.();
    const keyword = q.trim();
    setActiveQ(keyword);
    setPage(1);
  };

  const clearFilter = () => {
    setQ('');
    setActiveQ('');
    setPage(1);
  };

  const borrow = async (book) => {
    try {
      setBorrowingId(book.id);

      await studentBookAPI.borrow(book.id);

      toast({
        title: 'Borrowed successfully',
        description: `You borrowed "${book.title}"`,
      });

      setResults((prev) =>
        prev.map((b) => {
          if (b.id === book.id) {
            const newCount = Math.max(
              0,
              (b.availableCount ?? b.stock ?? 0) - 1
            );

            return {
              ...b,
              availableCount: newCount,
              stock: newCount,
              availability: newCount > 0 ? 'available' : 'borrowed',
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

      toast({
        variant: 'destructive',
        title: 'Borrow failed',
        description: err.message,
      });
    } finally {
      setBorrowingId(null);
    }
  };

  const handleLogout = () => {
    studentSession.clear();
    toast({ title: 'Logged out' });
    navigate('/login');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <Button
          type="button"
          variant="ghost"
          className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/student')}
        >
          ← Back to student portal
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">📖 Book catalog & borrow</h1>
          <p className="text-sm text-muted-foreground">
            {student
              ? `Signed in as ${student.name} (${student.studentId}) · Browse catalog`
              : 'Please log in first'}
          </p>
        </div>

        <Button variant="outline" onClick={handleLogout}>
          🚪 Logout
        </Button>
      </div>

      <form
        onSubmit={doSearch}
        className="flex flex-wrap gap-2 items-center max-w-3xl"
      >
        <Input
          className="max-w-md"
          placeholder="Filter by title, author, or ISBN"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <Button type="submit" disabled={loading}>
          {loading ? 'Loading…' : 'Apply filter'}
        </Button>

        <Button
          type="button"
          variant="secondary"
          disabled={!activeQ && !q.trim()}
          onClick={clearFilter}
        >
          Show all
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {activeQ
            ? `Keyword "${activeQ}" · ${total} result(s)`
            : `Catalog · ${total} book(s)`}
        </span>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>

          <span>
            Page {total === 0 ? 0 : page} of {totalPages}
          </span>

          <Button
            size="sm"
            variant="outline"
            disabled={loading || page >= totalPages || total === 0}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : (results?.length || 0) === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  {total === 0
                    ? activeQ
                      ? 'No matching books'
                      : 'No books in the catalog'
                    : 'No rows on this page'}
                </TableCell>
              </TableRow>
            ) : (
              results.map((b) => {
                const available = (b.availableCount ?? b.stock ?? 0) > 0;
                const isExpanded = expandedBookId === b.id;

                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">
                      <Link
                        className="text-primary hover:underline"
                        to={`/student/books/${b.id}`}
                      >
                        {b.title}
                      </Link>
                    </TableCell>

                    <TableCell>{b.author}</TableCell>

                    <TableCell className="text-xs font-mono">
                      {b.isbn}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span
                          className={`px-2 py-1 rounded text-xs w-fit ${
                            available
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {available
                            ? `Available (${b.availableCount ?? b.stock ?? 0})`
                            : 'All copies out'}
                        </span>

                        {b.barcodes?.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto p-1 text-xs text-blue-600"
                            onClick={() =>
                              setExpandedBookId(isExpanded ? null : b.id)
                            }
                          >
                            {isExpanded
                              ? 'Hide barcodes'
                              : `View barcodes (${b.barcodes.length})`}
                          </Button>
                        )}

                        {isExpanded && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
                            {b.barcodes.map((bc) => (
                              <div
                                key={bc.barcode}
                                className="flex justify-between gap-2"
                              >
                                <span className="font-mono truncate">
                                  {bc.barcode}
                                </span>
                                <span>{bc.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Button size="sm" variant="secondary" asChild>
                        <Link to={`/student/books/${b.id}`}>View</Link>
                      </Button>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={!available || borrowingId === b.id}
                        onClick={() => borrow(b)}
                      >
                        {borrowingId === b.id ? 'Processing…' : 'Borrow'}
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