import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { librarianAPI } from '@/lib/api';
import dayjs from 'dayjs';

export default function BorrowBook() {
  const { toast } = useToast();
  const [barcode, setBarcode] = useState('');
  const [studentId, setStudentId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [loans, setLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(true);

  const fetchLoans = useCallback(async () => {
    try {
      setLoansLoading(true);
      const data = await librarianAPI.loans(1, 20);
      setLoans(data?.list || []);
    } catch (err) {
      // silent — don't block the form
    } finally {
      setLoansLoading(false);
    }
  }, []);

  useEffect(() => {
    librarianAPI.students()
      .then(data => setStudents(data || []))
      .catch(err => toast({ variant: 'destructive', title: 'Failed to load', description: err.message }));
    fetchLoans();
  }, [fetchLoans, toast]);

  const borrowBook = async () => {
    if (!barcode || !studentId || !dueDate) {
      return toast({ variant: 'destructive', title: 'Validation Failed', description: 'Please fill in all fields' });
    }
    try {
      setLoading(true);
      await librarianAPI.checkout({ barcode, studentId, dueDate });
      toast({ title: 'Borrow Successful', description: 'Checkout completed' });
      setBarcode(''); setStudentId(''); setDueDate('');
      fetchLoans();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Borrow Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '—');

  const getLoanStatus = (loan) => {
    if (loan.returnDate) return 'Returned';
    if (loan.dueDate && dayjs(loan.dueDate).isBefore(dayjs(), 'day')) return 'Overdue';
    return 'Borrowed';
  };

  return (
    <div className="h-screen p-6 bg-transparent flex flex-col justify-start overflow-hidden">
      <div className="max-w-[1920px] w-full mx-auto h-full bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-md border border-white/40 flex flex-col space-y-5 overflow-hidden animate-page-fade">

        {/* ========== 固定顶栏 ========== */}
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-800">Borrow Registration</h1>
        </div>

        {/* ========== 双栏布局 ========== */}
        <div className="flex-1 w-full flex gap-6 overflow-hidden">

          {/* 左栏：表单 */}
          <div className="w-[400px] flex-shrink-0 flex flex-col space-y-4">
            <div className="grid gap-2">
              <Label>Barcode *</Label>
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan or type barcode" />
            </div>
            <div className="grid gap-2">
              <Label>Student *</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select a student" /></SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)] max-h-64 z-[9999]">
                  {students.map(s => (
                    <SelectItem key={s.studentId} value={s.studentId}>
                      <div className="flex flex-col">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground">{s.studentId}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Due Date *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <Button
              onClick={borrowBook}
              disabled={loading}
              className="w-full text-sm font-medium text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl shadow-sm shadow-emerald-500/5 transition-all duration-150"
            >
              {loading ? 'Processing...' : 'Confirm Borrow'}
            </Button>
          </div>

          {/* 右栏：借阅历史 */}
          <div className="flex-1 flex flex-col min-w-0 bg-gray-50/30 border border-gray-100 rounded-2xl p-5 overflow-hidden">
            <h2 className="text-sm font-semibold text-gray-500 mb-3 flex-shrink-0">Recent Registrations</h2>
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="border border-gray-100/60 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loansLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-sm text-gray-400">Loading...</TableCell></TableRow>
                    ) : loans.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-sm text-gray-400">No registrations yet</TableCell></TableRow>
                    ) : (
                      loans.map((loan) => (
                        <TableRow key={loan.id} className="hover:bg-white/50 transition-colors">
                          <TableCell className="text-sm text-gray-600 font-mono">{loan.barcode?.barcode}</TableCell>
                          <TableCell className="text-sm text-gray-600">{loan.user?.name}</TableCell>
                          <TableCell className="text-sm text-gray-600">{formatDate(loan.dueDate)}</TableCell>
                          <TableCell>
                            {(() => {
                              const s = getLoanStatus(loan);
                              if (s === 'Borrowed') {
                                return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm">Borrowed</span>;
                              }
                              if (s === 'Overdue') {
                                return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 border border-red-500/20 shadow-sm">Overdue</span>;
                              }
                              return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">Returned</span>;
                            })()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}