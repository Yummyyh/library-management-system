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

// 筛选选项（和借阅页保持一致）
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
];

// 日期格式化（复用项目原有方法）
function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// 状态标签样式（和项目风格统一）
function renderStatusTag(status) {
  const map = {
    unpaid: 'bg-red-100 text-red-700',
    paid: 'bg-gray-100 text-gray-700',
  };
  const labelMap = {
    unpaid: 'Unpaid',
    paid: 'Paid',
  };
  return (
    <span className={`px-2 py-1 rounded-md text-xs ${map[status] || 'bg-slate-100 text-slate-700'}`}>
      {labelMap[status] || status}
    </span>
  );
}

export default function StudentFinePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [payLoading, setPayLoading] = useState('');

  // 登出逻辑（和借阅页保持一致）
  const handleLogout = () => {
    ['student_token', 'student_info'].forEach((key) => localStorage.removeItem(key));
    navigate('/login');
  };

  // 加载罚款列表（调用我们刚加的 API）
  const loadFines = async () => {
    try {
      setLoading(true);
      const data = await studentBookAPI.fines(status);
      setRows(data?.list || []);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to load fines',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // 缴纳罚款
  const handlePayFine = async (fineId) => {
    try {
      setPayLoading(fineId);
      await studentBookAPI.payFine(fineId);
      toast({
        title: 'Success',
        description: 'Fine paid successfully',
      });
      loadFines();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: err.message,
      });
    } finally {
      setPayLoading('');
    }
  };

  // 筛选切换自动刷新
  useEffect(() => {
    loadFines();
  }, [status]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">My Fines</h1>
            <p className="text-sm text-muted-foreground">View and pay your overdue fines</p >
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/student')}>
              Back
            </Button>
            <select
              className="h-10 rounded-md border px-3 text-sm bg-white"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={loadFines} disabled={loading}>
              Refresh
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Checkout Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Overdue Days</TableHead>
                <TableHead>Fine Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.fineId}>
                  <TableCell className="font-medium">{row.bookTitle || '-'}</TableCell>
                  <TableCell>{row.bookAuthor || '-'}</TableCell>
                  <TableCell>{formatDate(row.checkoutDate)}</TableCell>
                  <TableCell>{formatDate(row.dueDate)}</TableCell>
                  <TableCell>{row.overdueDays}</TableCell>
                  <TableCell>¥{Number(row.fineAmount).toFixed(2)}</TableCell>
                  <TableCell>{renderStatusTag(row.status)}</TableCell>
                  <TableCell>
                    {row.status === 'unpaid' && (
                      <Button
                        size="sm"
                        onClick={() => handlePayFine(row.fineId)}
                        disabled={payLoading === row.fineId}
                      >
                        {payLoading === row.fineId ? 'Processing...' : 'Pay'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    No fine records found
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