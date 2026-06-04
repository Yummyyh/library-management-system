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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">My Loans</h1>
            <p className="text-sm text-muted-foreground">View your current and historical borrowing records</p>
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
            <Button variant="outline" onClick={loadLoans} disabled={loading}>
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
                <TableHead>Return Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.loanId}>
                  <TableCell className="font-medium">{row.bookTitle || '-'}</TableCell>
                  <TableCell>{row.bookAuthor || '-'}</TableCell>
                  <TableCell>{formatDate(row.checkoutDate)}</TableCell>
                  <TableCell>{formatDate(row.dueDate)}</TableCell>
                  <TableCell>{formatDate(row.returnDate)}</TableCell>
                  <TableCell>{renderStatusTag(row.status)}</TableCell>
                  <TableCell className="text-right">
                    {row.status === 'borrowed' ? (
                      <Button
                        size="sm"
                        variant="outline"
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
                <TableRow>
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
