import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { librarianHoldAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function LibrarianHoldsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [holds, setHolds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchHolds = async () => {
    try {
      setLoading(true);
      const params = filter ? { status: filter } : {};
      const data = await librarianHoldAPI.list(params);
      setHolds(data?.list || []);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHolds(); }, [filter]);

  const handleMarkReady = async (id) => {
    try {
      await librarianHoldAPI.markReady(id);
      toast({ title: 'Success', description: 'Hold marked as ready, student notified' });
      fetchHolds();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const handleCancel = async (id) => {
    try {
      await librarianHoldAPI.cancel(id);
      toast({ title: 'Cancelled', description: 'Hold cancelled, student notified' });
      fetchHolds();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const statusBadge = (s) => {
    const map = {
      WAITING: 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 shadow-sm',
      READY: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm',
      CANCELLED: 'bg-gray-500/10 text-gray-500 border border-gray-500/10',
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[s] || 'bg-gray-100 text-gray-500'}`}>{s}</span>;
  };

  return (
    <div className="h-screen p-6 bg-transparent flex flex-col justify-start overflow-hidden">
      <div className="max-w-[1920px] w-full mx-auto h-full bg-white/90 backdrop-blur-[4px] rounded-2xl p-6 shadow-md border border-white/40 flex flex-col space-y-5 overflow-hidden animate-page-fade">

        {/* ========== 固定顶栏 ========== */}
        <div className="flex-shrink-0 flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Hold Management</h1>
          <div className="flex items-center gap-3">
            <select className="border border-gray-200/60 rounded-xl px-3 py-1.5 text-sm bg-white/60 text-gray-600" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="WAITING">WAITING</option>
              <option value="READY">READY</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => navigate('/librarian')}>← Dashboard</Button>
          </div>
        </div>

        {/* ========== 独立滚动表格区 ========== */}
        <div className="flex-1 w-full overflow-y-auto pr-1">
          {loading ? (
            <p className="text-sm text-gray-400 py-8">Loading...</p>
          ) : holds.length === 0 ? (
            <div className="p-12 text-center border border-gray-100/60 rounded-xl">
              <p className="text-sm text-gray-400">No holds found</p>
            </div>
          ) : (
            <div className="border border-gray-100/60 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 shadow-sm">
                  <tr className="text-left">
                    <th className="p-3 font-medium text-gray-500">Reader</th>
                    <th className="p-3 font-medium text-gray-500">Book</th>
                    <th className="p-3 font-medium text-gray-500">ISBN</th>
                    <th className="p-3 font-medium text-gray-500">Status</th>
                    <th className="p-3 font-medium text-gray-500">Requested</th>
                    <th className="p-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holds.map((h) => (
                    <tr key={h.id} className="border-b border-gray-50 hover:bg-white/40 transition-colors">
                      <td className="p-3">
                        <div className="text-sm text-gray-700">{h.user?.name}</div>
                        <div className="text-xs text-gray-400">{h.user?.studentId}</div>
                      </td>
                      <td className="p-3 text-sm text-gray-600">{h.book?.title}</td>
                      <td className="p-3 text-xs text-gray-400">{h.book?.isbn}</td>
                      <td className="p-3">{statusBadge(h.status)}</td>
                      <td className="p-3 text-xs text-gray-400">{new Date(h.createdAt).toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {h.status === 'WAITING' && (
                            <Button size="sm" onClick={() => handleMarkReady(h.id)}>Ready</Button>
                          )}
                          {(h.status === 'WAITING' || h.status === 'READY') && (
                            <Button size="sm" variant="outline" onClick={() => handleCancel(h.id)}>Cancel</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
