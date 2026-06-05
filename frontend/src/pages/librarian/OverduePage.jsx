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
    <div className="h-screen p-6 bg-transparent flex flex-col justify-start overflow-hidden">
      <div className="max-w-[1920px] w-full mx-auto h-full bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-md border border-white/40 flex flex-col space-y-5 overflow-hidden animate-page-fade">

        {/* ========== 固定顶栏 ========== */}
        <div className="flex-shrink-0 flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Overdue List</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/librarian')}>Back</Button>
            <Button variant="outline" size="sm" onClick={loadOverdue} disabled={loading}>Refresh</Button>
            <Button size="sm" onClick={sendReminders} disabled={sending || loading || rows.length === 0}>Send Reminder</Button>
          </div>
        </div>

        {/* ========== 独立滚动表格区 ========== */}
        <div className="flex-1 w-full overflow-y-auto pr-1">
          <div className="border border-gray-100/60 rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      className="accent-red-500"
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
                  <TableRow key={row.loanId} className="hover:bg-white/40 transition-colors">
                    <TableCell>
                      <input
                        type="checkbox"
                        className="accent-red-500"
                        checked={selectedSet.has(row.loanId)}
                        onChange={() => toggleOne(row.loanId)}
                        aria-label={`Select loan ${row.loanId}`}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{row.student?.name || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{row.student?.studentId || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-600">{row.book?.title || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{row.book?.author || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-600">{formatDue(row.dueDate)}</TableCell>
                    <TableCell>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 border border-red-500/20 shadow-sm">
                        {row.overdueDay} day(s)
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-400 py-10 text-sm">
                      No overdue records
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

      </div>
    </div>
  );
}
