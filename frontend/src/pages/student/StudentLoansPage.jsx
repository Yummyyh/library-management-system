import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentBookAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'borrowed', label: 'Borrowed' },
  { value: 'returned', label: 'Returned' },
];

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderStatusTag(status) {
  const map = {
    borrowed: 'bg-green-100 text-green-700',
    returned: 'bg-gray-100 text-gray-700',
    overdue: 'bg-red-100 text-red-700',
  };
  const labelMap = {
    borrowed: 'Borrowed',
    returned: 'Returned',
    overdue: 'Overdue',
  };
  return (
    <span className={`px-2 py-1 rounded-md text-xs ${map[status] || 'bg-slate-100 text-slate-700'}`}>
      {labelMap[status] || status}
    </span>
  );
}

function canRenew(row) {
  const maxRenewCount = row.maxRenewCount ?? 2;
  return row.status === 'borrowed' && (row.renewCount ?? 0) < maxRenewCount;
}

export default function StudentLoansPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [renewingId, setRenewingId] = useState(null);
  const [rows, setRows] = useState([]);

  const handleLogout = () => {
    ['student_token', 'student_info'].forEach((key) => localStorage.removeItem(key));
    navigate('/login');
  };

  const loadLoans = async () => {
    try {
      setLoading(true);
      const data = await studentBookAPI.myLoans(status);
      setRows(data?.list || []);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to load loans',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, [status]);

  const handleRenew = async (loanId) => {
    try {
      setRenewingId(loanId);
      const result = await studentBookAPI.renew(loanId);
      toast({
        title: 'Renewed successfully',
        description: `New due date: ${formatDate(result?.dueDate)}`,
      });
      await loadLoans();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Renew failed',
        description: err.message,
      });
    } finally {
      setRenewingId(null);
    }
  };

  return (
    /* 外层完全对齐，确保所有子页面的边距和高度完全一致 */
    <div className="min-h-screen p-6 bg-transparent flex flex-col">
      
      {/* 统一的大矩形半透明面板 - 容器本身 overflow-hidden 锁定 */}
      <div className="max-w-[1920px] w-full mx-auto flex-1 bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-md border border-white/40 flex flex-col space-y-5 overflow-hidden">
        
        {/* 【固定区域】：标题和筛选交互控制保持在顶部不随动 */}
        <div className="flex-shrink-0 flex flex-col space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">My Loans</h1>
              <p className="text-sm text-muted-foreground mt-0.5">View your current and historical borrowing records</p>
            </div>
            
            {/* 统一顶层交互控制组和 Back 按钮样式 */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="bg-white/50 backdrop-blur-sm border-gray-200" 
                onClick={() => navigate('/student')}
              >
                Back
              </Button>
              <select
                className="h-10 rounded-md border px-3 text-sm bg-white/50 backdrop-blur-sm border-gray-200"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <Button variant="outline" className="bg-white/50 backdrop-blur-sm border-gray-200" onClick={loadLoans} disabled={loading}>
                Refresh
              </Button>
              <Button variant="outline" className="bg-white/50 backdrop-blur-sm border-gray-200" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* 【核心滚动区域】：仅让表格部分在内部垂直滑动 */}
        <div className="flex-1 w-full overflow-y-auto pr-1">
          <Table>
            <TableHeader className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 shadow-sm shadow-gray-100/10">
              <TableRow className="hover:bg-transparent border-b border-gray-200/60">
                <TableHead className="font-semibold text-gray-700">Book Title</TableHead>
                <TableHead className="font-semibold text-gray-700">Author</TableHead>
                <TableHead className="font-semibold text-gray-700">Checkout Date</TableHead>
                <TableHead className="font-semibold text-gray-700">Due Date</TableHead>
                <TableHead className="font-semibold text-gray-700">Return Date</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="text-center font-semibold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.loanId} className="border-b border-gray-100/40 hover:bg-white/40 transition-colors">
                  {/* 保持最初设计：不加粗，使用纯净的 text-gray-800 基础字号 */}
                  <TableCell className="text-gray-800 py-3.5">{row.bookTitle || '-'}</TableCell>
                  <TableCell className="text-gray-600 py-3.5">{row.bookAuthor || '-'}</TableCell>
                  <TableCell className="text-gray-600 py-3.5">{formatDate(row.checkoutDate)}</TableCell>
                  <TableCell className="text-gray-600 py-3.5">{formatDate(row.dueDate)}</TableCell>
                  <TableCell className="text-gray-600 py-3.5">{formatDate(row.returnDate)}</TableCell>
                  <TableCell className="py-3.5">{renderStatusTag(row.status)}</TableCell>
                  <TableCell className="text-center py-3.5">
                    {row.status === 'borrowed' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white/80 hover:bg-blue-500 hover:text-white transition-colors"
                        onClick={() => handleRenew(row.loanId)}
                        disabled={renewingId === row.loanId || !canRenew(row)}
                      >
                        {renewingId === row.loanId
                          ? 'Renewing...'
                          : canRenew(row)
                            ? `Renew ${row.renewCount ?? 0}/${row.maxRenewCount ?? 2}`
                            : `Renewed ${row.renewCount ?? 0}/${row.maxRenewCount ?? 2}`}
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    No loan records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}