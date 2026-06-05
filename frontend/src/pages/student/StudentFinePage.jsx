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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// 筛选选项
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
];

// 日期格式化
function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// 状态标签样式
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

  // 弹窗状态控制
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [currentFine, setCurrentFine] = useState(null);

  // 登出逻辑
  const handleLogout = () => {
    ['student_token', 'student_info'].forEach((key) => localStorage.removeItem(key));
    navigate('/login');
  };

  // 加载罚款列表
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

  // 点击 Pay 按钮：打开支付弹窗
  const handleOpenPayDialog = (fine) => {
    setCurrentFine(fine);
    setShowPayDialog(true);
  };

  // 确认支付
  const handleConfirmPay = async () => {
    if (!currentFine) return;
    try {
      setPayLoading(currentFine.fineId);
      await studentBookAPI.payFine(currentFine.fineId);
      toast({
        title: 'Success',
        description: 'Fine paid successfully',
      });
      setShowPayDialog(false);
      setCurrentFine(null);
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

  useEffect(() => {
    loadFines();
  }, [status]);

  return (
    /* 1. 移除 bg-gray-50，换成 bg-transparent 让全局渐变底色透出来 */
    <div className="min-h-screen bg-transparent p-6 flex flex-col">
      
      {/* 2. 核心大矩形：使用 max-w-[1920px] 变宽减少拖动，
           同时用 bg-white/80 backdrop-blur-md 打造和左侧配套的单一毛玻璃大面板 */}
      <div className="max-w-[1920px] w-full mx-auto flex-1 bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-md border border-white/40 flex flex-col space-y-6">
        
        {/* 头部区域 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Fines</h1>
            <p className="text-sm text-muted-foreground">View and pay your overdue fines</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-white/50 backdrop-blur-sm" onClick={() => navigate('/student')}>
              Back
            </Button>
            <select
              className="h-10 rounded-md border border-gray-200 px-3 text-sm bg-white/50 backdrop-blur-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <Button variant="outline" className="bg-white/50 backdrop-blur-sm" onClick={loadFines} disabled={loading}>
              Refresh
            </Button>
            <Button variant="outline" className="bg-white/50 backdrop-blur-sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        {/* 3. 表格区域：移除了原本的 rounded-lg border bg-white overflow-hidden，
             使其完全变透明，无缝融入到外层的半透明大矩形框中 */}
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-200/60">
                <TableHead className="font-semibold text-gray-700">Book Title</TableHead>
                <TableHead className="font-semibold text-gray-700">Author</TableHead>
                <TableHead className="font-semibold text-gray-700">Checkout Date</TableHead>
                <TableHead className="font-semibold text-gray-700">Due Date</TableHead>
                <TableHead className="font-semibold text-gray-700">Overdue Days</TableHead>
                <TableHead className="font-semibold text-gray-700">Fine Amount</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.fineId} className="border-b border-gray-100/40 hover:bg-white/40 transition-colors">
                  <TableCell className="font-medium text-gray-800">{row.bookTitle || '-'}</TableCell>
                  <TableCell className="text-gray-600">{row.bookAuthor || '-'}</TableCell>
                  <TableCell className="text-gray-600">{formatDate(row.checkoutDate)}</TableCell>
                  <TableCell className="text-gray-600">{formatDate(row.dueDate)}</TableCell>
                  <TableCell className="text-gray-600">{row.overdueDays}</TableCell>
                  <TableCell className="font-medium text-gray-800">¥{Number(row.fineAmount).toFixed(2)}</TableCell>
                  <TableCell>{renderStatusTag(row.status)}</TableCell>
                  <TableCell>
                    {row.status === 'unpaid' && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                        onClick={() => handleOpenPayDialog(row)}
                        disabled={payLoading === row.fineId}
                      >
                        {payLoading === row.fineId ? 'Processing...' : 'Pay'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    No fine records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 支付宝二维码支付弹窗（保持原有逻辑，仅微调背景细节） */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-lg">
          <DialogHeader>
            <DialogTitle>Pay Fine via Alipay</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Paying: <span className="font-bold text-gray-900">¥{currentFine ? Number(currentFine.fineAmount).toFixed(2) : '0.00'}</span>
            </p>
            <div className="border border-gray-100 p-4 bg-white rounded-lg shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=alipay://pay?amount=${currentFine?.fineAmount || 0}&orderId=${currentFine?.fineId || ''}`}
                alt="Alipay QR Code"
                className="w-36 h-36"
              />
            </div>
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              请使用支付宝扫码支付<br />
              （模拟二维码，扫码后点击「确认支付」）
            </p>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleConfirmPay} disabled={payLoading !== ''}>
              {payLoading ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}