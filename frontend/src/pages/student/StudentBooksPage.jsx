import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { studentBookAPI } from '@/lib/api';
import { studentSession } from '@/lib/studentSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

/** 每页书目条数（与后端 listCatalog 默认上限协调） */
const PAGE_SIZE = 12;

export default function StudentBooksPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const student = useMemo(() => studentSession.getStudent(), []);
  const [q, setQ] = useState('');
  /** 已生效的搜索关键词（与输入框分离，翻页时沿用） */
  const [activeSearch, setActiveSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [borrowingId, setBorrowingId] = useState(null);
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedBookId, setExpandedBookId] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchCatalog = useCallback(
    async (nextPage, keyword) => {
      try {
        setLoading(true);
        const data = await studentBookAPI.listCatalog({
          page: nextPage,
          limit: PAGE_SIZE,
          ...(keyword ? { q: keyword } : {}),
        });
        setResults(data.list || []);
        setPage(data.page ?? nextPage);
        setTotal(typeof data.total === 'number' ? data.total : 0);
      } catch (err) {
        toast({ variant: 'destructive', title: 'Load Failed', description: err.message });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (!studentSession.getToken()) {
      navigate('/login');
      return;
    }
    fetchCatalog(1, '');
  }, [navigate, fetchCatalog]);

  /** 执行搜索并回到第一页；关键词为空表示浏览全部书目 */
  const applySearch = async (e) => {
    e?.preventDefault?.();
    const keyword = q.trim();
    setActiveSearch(keyword);
    setExpandedBookId(null);
    await fetchCatalog(1, keyword);
  };

  /** 表单提交 */
  const doSearch = async (e) => {
    e?.preventDefault?.();
    await applySearch(e);
  };

  const goPage = (p) => {
    const next = Math.min(Math.max(1, p), totalPages);
    setExpandedBookId(null);
    fetchCatalog(next, activeSearch);
  };

  const borrow = async (book) => {
    try {
      setBorrowingId(book.id);
      await studentBookAPI.borrow(book.id);
      toast({ title: 'Borrowed Successfully', description: `You borrowed "${book.title}"` });

      setResults((prev) =>
        prev.map((b) => {
          if (b.id === book.id) {
            const currentCount = b.availableCount ?? b.stock ?? 0;
            const newCount = Math.max(0, currentCount - 1);

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
              barcodes: updatedBarcodes,
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
          <h1 className="text-2xl font-bold">📖 Browse Catalog & Borrow</h1>
          <p className="text-sm text-muted-foreground">
            {student ? `Current Student: ${student.name} (${student.studentId})` : 'Please login first'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" asChild>
            <Link to="/student">← Dashboard</Link>
          </Button>
          <Button variant="outline" onClick={handleLogout}>🚪 Logout</Button>
        </div>
      </div>

      <form onSubmit={doSearch} className="flex flex-col sm:flex-row gap-2 max-w-3xl">
        <Input
          placeholder="Search by title / author / ISBN / genre / category (optional)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex gap-2 shrink-0">
          <Button type="submit" disabled={loading}>
            {loading ? 'Loading…' : 'Search'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading || (!activeSearch && !q.trim())}
            onClick={() => {
              setQ('');
              setActiveSearch('');
              setExpandedBookId(null);
              fetchCatalog(1, '');
            }}
          >
            Show all
          </Button>
        </div>
      </form>

      <p className="text-sm text-muted-foreground break-words">
        {total} title(s) in catalog
        {activeSearch ? ` · search: “${activeSearch}”` : ''}
        {` · page ${page} / ${totalPages}`}
      </p>

      <div className="border rounded-lg">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[26%] min-w-0">Title</TableHead>
              <TableHead className="w-[15%] min-w-0">Author</TableHead>
              <TableHead className="w-[13%] min-w-0">Genre</TableHead>
              <TableHead className="w-[13%] min-w-0">ISBN</TableHead>
              <TableHead className="w-[18%] min-w-0">Availability</TableHead>
              <TableHead className="w-[15%] min-w-0 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading…</TableCell></TableRow>
            ) : (results?.length || 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No books in this view. Try clearing the search or another page.
                </TableCell>
              </TableRow>
            ) : (
              results.map((b) => {
                const available = (b.availableCount ?? b.stock ?? 0) > 0;
                const isExpanded = expandedBookId === b.id;
                const genreLabel = [b.genre, b.category].filter(Boolean).join(' · ') || '—';

                return (
                  <TableRow key={b.id}>
                    <TableCell className="align-top min-w-0 font-medium whitespace-normal break-words">
                      <Link
                        to={`/student/books/${b.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {b.title}
                      </Link>
                    </TableCell>
                    <TableCell className="align-top min-w-0 whitespace-normal break-words text-muted-foreground">
                      {b.author}
                    </TableCell>
                    <TableCell className="align-top min-w-0 text-sm text-muted-foreground whitespace-normal break-words">
                      {genreLabel}
                    </TableCell>
                    <TableCell className="align-top min-w-0 text-xs font-mono whitespace-normal break-all">
                      {b.isbn}
                    </TableCell>
                    <TableCell className="align-top min-w-0 whitespace-normal break-words">
                      <div className="flex flex-col gap-1.5">
                        <span className={`px-2 py-1 rounded text-xs w-fit max-w-full ${
                          available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {available ? `Available (${b.availableCount ?? b.stock ?? 0})` : 'Borrowed'}
                        </span>
                        {b.barcodes?.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto min-h-0 shrink-0 justify-start p-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-transparent"
                            onClick={() => setExpandedBookId(isExpanded ? null : b.id)}
                          >
                            {isExpanded ? '🔼 Hide Barcodes' : `🔍 View Barcodes (${b.barcodes.length})`}
                          </Button>
                        )}
                        {isExpanded && (
                          <div className="mt-1 w-full max-w-full overflow-hidden rounded border border-border/60 bg-muted/40 p-2 text-xs">
                            {b.barcodes.map((bc) => (
                              <div key={bc.barcode} className="flex min-w-0 items-center justify-between gap-2 py-0.5">
                                <span className="min-w-0 flex-1 break-all font-mono" title={bc.barcode}>
                                  {bc.barcode}
                                </span>
                                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap ${
                                  bc.status === 'AVAILABLE' ? 'bg-green-100 text-green-700'
                                    : bc.status === 'BORROWED' ? 'bg-orange-100 text-orange-700'
                                      : 'bg-red-100 text-red-700'
                                }`}>
                                  {bc.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-right whitespace-normal">
                      <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:flex-wrap sm:justify-end">
                        <Button size="sm" variant="outline" asChild className="shrink-0">
                          <Link to={`/student/books/${b.id}`}>Details</Link>
                        </Button>
                        <Button
                          size="sm"
                          className="shrink-0"
                          disabled={!available || borrowingId === b.id}
                          onClick={() => borrow(b)}
                        >
                          {borrowingId === b.id ? 'Processing…' : 'Borrow'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || page <= 1}
            onClick={() => goPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || page >= totalPages}
            onClick={() => goPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
