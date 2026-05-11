import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { librarianAPI } from '@/lib/api';
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

function formatDue(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function OverduePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const handleLogout = () => {
    localStorage.removeItem('librarian_token');
    navigate('/login');
  };

  const loadOverdue = useCallback(async () => {
    try {
      setLoading(true);
      const data = await librarianAPI.overdueList();
      setRows(data?.list || []);
      setSelected([]);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to load overdue records',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadOverdue();
  }, [loadOverdue]);

  const toggleOne = (loanId) => {
    setSelected((prev) =>
      prev.includes(loanId) ? prev.filter((id) => id !== loanId) : [...prev, loanId]
    );
  };

  const toggleAll = (checked) => {
    if (!checked) {
      setSelected([]);
      return;
    }
    setSelected(rows.map((item) => item.loanId));
  };

  const sendReminders = async () => {
    try {
      setSending(true);
      const targetLoanIds = selected.length > 0 ? selected : [];
      const result = await librarianAPI.sendOverdueReminders(targetLoanIds);
      toast({
        title: 'Reminder sent',
        description: `Sent reminders for ${result?.remindedLoans ?? 0} loan(s), affecting ${result?.remindedUsers ?? 0} student(s).`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to send reminders',
        description: err.message,
      });
    } finally {
      setSending(false);
    }
  };

  const allChecked = rows.length > 0 && selected.length === rows.length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Overdue List</h1>
            <p className="text-sm text-muted-foreground">
              Select rows to send reminders, or send to all overdue records when none are selected.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/librarian')}>
              Back
            </Button>
            <Button variant="outline" onClick={loadOverdue} disabled={loading}>
              Refresh
            </Button>
            <Button onClick={sendReminders} disabled={sending || loading || rows.length === 0}>
              Send Reminder
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
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Book</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Overdue Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.loanId}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedSet.has(row.loanId)}
                      onChange={() => toggleOne(row.loanId)}
                      aria-label={`Select loan ${row.loanId}`}
                    />
                  </TableCell>
                  <TableCell>{row.student?.name || '-'}</TableCell>
                  <TableCell>{row.student?.studentId || '-'}</TableCell>
                  <TableCell className="font-medium">{row.book?.title || '-'}</TableCell>
                  <TableCell>{row.book?.author || '-'}</TableCell>
                  <TableCell>{formatDue(row.dueDate)}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-md text-xs bg-red-100 text-red-700">
                      {row.overdueDay} day(s)
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    No overdue records
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
