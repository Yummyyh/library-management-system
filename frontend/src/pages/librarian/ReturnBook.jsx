import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { librarianAPI } from '@/lib/api';

export default function ReturnBook() {
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

  const filteredLoans = loans.filter(loan => {
    const name = loan.user?.name?.toLowerCase() || '';
    const title = loan.barcode?.book?.title?.toLowerCase() || '';
    const q = search.toLowerCase();
    return name.includes(q) || title.includes(q);
  });

  const totalPages = Math.ceil(total / size);

  return (
    <div className="h-screen p-6 bg-transparent flex flex-col justify-start overflow-hidden">
      <div className="max-w-[1920px] w-full mx-auto h-full bg-white/90 backdrop-blur-[4px] rounded-2xl p-6 shadow-md border border-white/40 flex flex-col space-y-5 overflow-hidden animate-page-fade">

        {/* ========== 固定顶栏 ========== */}
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-800">Return Processing</h1>
        </div>

        {/* ========== 独立滚动区 ========== */}
        <div className="flex-1 w-full overflow-y-auto pr-1 space-y-6">
          {/* Barcode Input */}
          <div className="grid gap-2">
            <Label>Barcode *</Label>
            <Input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan or type: 9780132350884-001"
            />
          </div>
          <Button onClick={() => returnBook()} disabled={loading} className="w-full text-sm">
            {loading ? 'Processing...' : 'Confirm Return'}
          </Button>

          {/* Search */}
          <div className="grid gap-2">
            <Label>Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by borrower name or book title..."
            />
          </div>

          {/* Current Loans Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500">Current Loans</h3>
            {loansLoading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : loans.length === 0 ? (
              <p className="text-sm text-gray-400">No active loans</p>
            ) : (
              <div className="border border-gray-100/60 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 shadow-sm text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-500">Book</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Borrower</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Due Date</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLoans.map((loan) => {
                      const isOverdue = !loan.returnDate && new Date(loan.dueDate) < new Date();
                      const isReturned = !!loan.returnDate;
                      return (
                        <tr key={loan.id} className="border-t border-gray-50 hover:bg-white/40 transition-colors">
                          <td className="px-4 py-3 text-gray-600">{loan.barcode?.book?.title || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{loan.user?.name || '-'}</td>
                          <td className={`px-4 py-3 text-gray-600 ${isOverdue ? 'text-red-600' : ''}`}>
                            {new Date(loan.dueDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            {isReturned ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">Returned</span>
                            ) : isOverdue ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 border border-red-500/20 shadow-sm">Overdue</span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm">Borrowed</span>
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
                  <div className="flex justify-center items-center gap-4 p-3 border-t border-gray-100">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                      Prev
                    </Button>
                    <span className="text-sm text-gray-400">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}