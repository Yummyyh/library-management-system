import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { studentBookAPI, studentHoldAPI, studentNotificationAPI } from '@/lib/api';
import { studentSession } from '@/lib/studentSession';
import { useToast } from '@/hooks/use-toast';
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
// 引入通知所需的 Dialog 组件
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const PAGE_SIZE = 12;

export default function StudentBooksPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const student = useMemo(() => studentSession.getStudent(), []);
  const studentId = student?.id;

  // --- 原有的图书相关状态 ---
  const [q, setQ] = useState('');
  const [activeQ, setActiveQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [borrowingId, setBorrowingId] = useState(null);
  const [holdingId, setHoldingId] = useState(null);
  const [results, setResults] = useState([]);
  const [expandedBookId, setExpandedBookId] = useState(null);

  // --- 新增：从 Dashboard 转移过来的通知相关状态 ---
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);

  // 1. 原有的拉取图书目录 Effect
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

  // 2. 新增：从 Dashboard 转移过来的通知检测 Effect
  useEffect(() => {
    if (!studentId) return;

    let cancelled = false;

    const fetchNotifications = async () => {
      if (sessionStorage.getItem(`notifications_shown_${studentId}`)) return;

      try {
        setNotificationLoading(true);
        const data = await studentNotificationAPI.getNotifications();
        if (cancelled) return;
        if (data?.list?.length > 0) {
          setNotifications(data.list);
          setShowNotifications(true);
          sessionStorage.setItem(`notifications_shown_${studentId}`, 'true');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch notifications:', err.message);
        }
      } finally {
        if (!cancelled) {
          setNotificationLoading(false);
        }
      }
    };

    fetchNotifications();

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  // --- 通知弹窗交互函数 ---
  const dismissNotifications = () => {
    setShowNotifications(false);
  };

  const handleNotificationOpenChange = (open) => {
    if (open) {
      setShowNotifications(true);
      return;
    }
    dismissNotifications();
  };

  // --- 原有图书操作逻辑 ---
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
            const newCount = Math.max(0, (b.availableCount ?? b.stock ?? 0) - 1);
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
      toast({ variant: 'destructive', title: 'Borrow failed', description: err.message });
    } finally {
      setBorrowingId(null);
    }
  };

  const holdBook = async (book) => {
    try {
      setHoldingId(book.id);
      await studentHoldAPI.create(book.id);
      toast({ title: 'Reserved', description: `You reserved "${book.title}"` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Reserve failed', description: err.message });
    } finally {
      setHoldingId(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(`notifications_shown_${studentId}`);
    studentSession.clear();
    toast({ title: 'Logged out' });
    navigate('/login');
  };

  return (
    <div className="h-screen p-6 bg-transparent flex flex-col justify-start overflow-hidden relative">
      
      {/* 全局大矩形半透明面板 */}
      <div className="max-w-[1920px] w-full mx-auto h-full bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-md border border-white/40 flex flex-col space-y-5 overflow-hidden">
        
        {/* 固定顶栏区域 */}
        <div className="flex-shrink-0 flex flex-col space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Book catalog & borrow</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {student
                  ? `Signed in as ${student.name} (${student.studentId}) · Browse catalog`
                  : 'Please log in first'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="bg-white/50 backdrop-blur-sm border-gray-200"
                onClick={() => navigate('/student')}
              >
                Back
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/50 backdrop-blur-sm border-gray-200"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          </div>

          {/* 筛选过滤表单 */}
          <form onSubmit={doSearch} className="flex flex-wrap gap-2 items-center max-w-3xl">
            <Input
              className="max-w-md bg-white/50 border-gray-200"
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
              className="bg-white/60 hover:bg-white/80 border border-gray-200/50"
              disabled={!activeQ && !q.trim()}
              onClick={clearFilter}
            >
              Show all
            </Button>
          </form>

          {/* 高亮状态展示与左下角文字重塑栏 */}
          <div className="flex items-center justify-between text-sm border-b border-gray-100 pb-3 pt-1 mt-1">
            <div className="text-[15px] font-medium text-gray-700 flex items-center gap-2">
              {activeQ ? (
                <>
                  <span>Catalog</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20 shadow-sm animate-pulse">
                    Keyword: "{activeQ}"
                  </span>
                  <span className="text-gray-500">· {total} result(s)</span>
                </>
              ) : (
                <span className="text-gray-800">Catalog · {total} book(s)</span>
              )}
            </div>

            {/* 右侧分页控制 */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Button
                size="sm"
                variant="outline"
                className="bg-white/50"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-gray-600 font-medium px-1">
                Page {total === 0 ? 0 : page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="bg-white/50"
                disabled={loading || page >= totalPages || total === 0}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* 表格数据滚动展示区域 */}
        <div className="flex-1 w-full overflow-y-auto pr-1">
          <Table>
            <TableHeader className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 shadow-sm shadow-gray-100/10">
              <TableRow className="hover:bg-transparent border-b border-gray-200/60">
                <TableHead className="font-semibold text-gray-700">Title</TableHead>
                <TableHead className="font-semibold text-gray-700">Author</TableHead>
                <TableHead className="font-semibold text-gray-700">ISBN</TableHead>
                <TableHead className="font-semibold text-gray-700">Availability</TableHead>
                <TableHead className="font-semibold text-gray-700">Details</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : (results?.length || 0) === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
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
                    <TableRow key={b.id} className="border-b border-gray-100/40 hover:bg-white/40 transition-colors">
                      <TableCell className="py-3.5">
                        <Link className="text-primary hover:underline" to={`/student/books/${b.id}`}>
                          {b.title}
                        </Link>
                      </TableCell>

                      <TableCell className="text-gray-600 py-3.5">{b.author}</TableCell>
                      <TableCell className="text-xs font-mono text-gray-500 py-3.5">{b.isbn}</TableCell>

                      <TableCell className="py-3.5">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-0.5 rounded text-xs w-fit font-medium ${available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {available ? `Available (${b.availableCount ?? b.stock ?? 0})` : 'All copies out'}
                          </span>

                          {b.barcodes?.length > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-auto p-0 justify-start text-xs text-blue-600 hover:bg-transparent hover:underline"
                              onClick={() => setExpandedBookId(isExpanded ? null : b.id)}
                            >
                              {isExpanded ? 'Hide barcodes' : `View barcodes (${b.barcodes.length})`}
                            </Button>
                          )}

                          {isExpanded && (
                            <div className="mt-2 p-2 bg-white/40 border border-white/50 rounded-lg text-xs space-y-1 max-w-xs shadow-sm">
                              {b.barcodes.map((bc) => (
                                <div key={bc.barcode} className="flex justify-between gap-4 text-gray-600">
                                  <span className="font-mono truncate">{bc.barcode}</span>
                                  <span className="font-medium text-gray-500">{bc.status}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <Button size="sm" variant="secondary" className="bg-white/60 hover:bg-white/90 border border-gray-200/40" asChild>
                          <Link to={`/student/books/${b.id}`}>View</Link>
                        </Button>
                      </TableCell>

                      <TableCell className="text-right py-3.5">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" disabled={!available || borrowingId === b.id} onClick={() => borrow(b)}>
                            {borrowingId === b.id ? 'Processing…' : 'Borrow'}
                          </Button>
                          <Button size="sm" variant="outline" className="bg-white/80" disabled={holdingId === b.id} onClick={() => holdBook(b)}>
                            {holdingId === b.id ? '…' : 'Reserve'}
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
      </div>

      {/* ==========================================
          【从 Dashboard 转移过来的通知弹窗 UI】
          ========================================== */}
      <Dialog open={showNotifications} onOpenChange={handleNotificationOpenChange}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-800">Notifications</DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-3 my-2 pr-1">
            {notifications.map((n, idx) => {
              const isOverdue = n.type === 'OVERDUE';
              const isHoldReady = n.type === 'HOLD_READY' || n.type === 'READY';
              const isHoldCancelled = n.type === 'HOLD_CANCELLED';

              const bgClass = isOverdue
                ? 'bg-red-50/80 border-red-200/60 text-red-900'
                : isHoldReady
                ? 'bg-emerald-50/80 border-emerald-200/60 text-emerald-900'
                : isHoldCancelled
                ? 'bg-amber-50/80 border-amber-200/60 text-amber-900'
                : 'bg-blue-50/80 border-blue-200/60 text-blue-900';

              const title = isOverdue
                ? 'Overdue Reminder'
                : isHoldReady
                ? 'Reservation Ready'
                : isHoldCancelled
                ? 'Reservation Cancelled'
                : n.title || 'Notification';

              return (
                <div
                  key={n.id || idx}
                  className={`p-3.5 rounded-xl border text-sm shadow-sm transition-all ${bgClass}`}
                >
                  <div className="font-semibold mb-1">{title}</div>
                  <div className="text-xs opacity-90 leading-relaxed">{n.message}</div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button onClick={dismissNotifications} className="w-full sm:w-auto">
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}