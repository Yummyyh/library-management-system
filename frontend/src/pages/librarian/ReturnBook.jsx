import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { librarianAPI } from '@/lib/api';

export default function ReturnBook() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [loans, setLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const size = 10;

    const fetchLoans = async (p = 1) => {
    try {
      setLoansLoading(true);
      const data = await librarianAPI.loans(p, size);
      console.log('loans data:', data); // 加这行
      setLoans(data.list || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch loans:', err.message);
    } finally {
      setLoansLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans(page);
  }, [page]);

  const returnBook = async (barcodeValue) => {
    const target = barcodeValue || barcode;
    if (!target) {
      return toast({ variant: 'destructive', title: 'Validation Failed', description: 'Please scan or enter barcode' });
    }
    try {
      setLoading(true);
      await librarianAPI.return({ barcode: target });
      toast({ title: '✅ Return Successful', description: 'Return completed' });
      setBarcode('');
      fetchLoans(page);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Return Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('librarian_token');
    toast({ title: 'Logged Out' });
    navigate('/login');
  };


  const filteredLoans = loans.filter(loan => {
    const name = loan.user?.name?.toLowerCase() || '';
    const title = loan.barcode?.book?.title?.toLowerCase() || '';
    const q = search.toLowerCase();
    return name.includes(q) || title.includes(q);
  });

  const totalPages = Math.ceil(total / size);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">📚 Return Processing</h2>
        <Button variant="outline" onClick={handleLogout}>🚪 Logout</Button>
      </div>

      {/* Barcode Input */}
      <div className="grid gap-2">
        <Label>Barcode *</Label>
        <Input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Scan or type: 9780132350884-001"
        />
      </div>
      <Button onClick={() => returnBook()} disabled={loading} className="w-full">
        {loading ? 'Processing...' : 'Confirm Return'}
      </Button>
      <div className="grid gap-2">
        <Label>Search</Label>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by borrower name or book title..."
        />
      </div>

      {/* Loans List */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Current Loans</h3>
        {loansLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : loans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active loans</p>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Book</th>
                  <th className="px-4 py-3 font-medium">Borrower</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map((loan) => {
                  const isOverdue = !loan.returnDate && new Date(loan.dueDate) < new Date();
                  const isReturned = !!loan.returnDate;
                  return (
                    <tr key={loan.id} className={`border-t ${isOverdue ? 'bg-red-50' : 'bg-white'}`}>
                      
                      <td className="px-4 py-3">{loan.barcode?.book?.title || '-'}</td>
                      <td className="px-4 py-3">{loan.user?.name || '-'}</td>
                      <td className={`px-4 py-3 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                        {new Date(loan.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {isReturned ? (
                          <span className="text-gray-400">Returned</span>
                        ) : isOverdue ? (
                          <span className="text-red-600 font-medium">Overdue</span>
                        ) : (
                          <span className="text-green-600">Borrowed</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!isReturned && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() => returnBook(loan.barcode?.barcode)}
                          >
                            Return
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 p-3 border-t">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  Prev
                </Button>
                <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}