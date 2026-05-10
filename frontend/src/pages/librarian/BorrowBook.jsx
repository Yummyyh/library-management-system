import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { librarianAPI } from '@/lib/api';

export default function BorrowBook() {
  const navigate = useNavigate();
  const { toast } = useToast();
  // ✅ 字段名 isbn → barcode
  const [barcode, setBarcode] = useState('');
  const [studentId, setStudentId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    librarianAPI.students()
      .then(data => setStudents(data || []))
      .catch(err => toast({ variant: 'destructive', title: 'Failed to load', description: err.message }));
  }, [toast]);

  const borrowBook = async () => {
    if (!barcode || !studentId || !dueDate) {
      return toast({ variant: 'destructive', title: 'Validation Failed', description: 'Please fill in all fields' });
    }
    try {
      setLoading(true);
      // ✅ API 传参同步改为 barcode
      await librarianAPI.checkout({ barcode, studentId, dueDate });
      toast({ title: '✅ Borrow Successful', description: 'Checkout completed' });
      setBarcode(''); setStudentId(''); setDueDate('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Borrow Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('librarian_token');
    toast({ title: 'Logged Out' });
    navigate('/login');
  };

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">📚 Borrow Registration</h2>
        <Button variant="outline" onClick={handleLogout}>🚪 Logout</Button>
      </div>
      <div className="grid gap-2">
        <Label>Barcode *</Label>
        {/* ✅ 占位符与状态变量已对齐 */}
        <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan or type: 9780132350884-001" />
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
      <Button onClick={borrowBook} disabled={loading} className="w-full">
        {loading ? 'Processing...' : 'Confirm Borrow'}
      </Button>
    </div>
  );
}