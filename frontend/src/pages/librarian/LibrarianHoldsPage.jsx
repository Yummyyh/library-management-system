import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { librarianHoldAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import LibrarianBackground from '@/components/ui/LibrarianBackground';

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
      WAITING: 'bg-yellow-100 text-yellow-800',
      READY: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-500',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[s] || ''}`}>{s}</span>;
  };

  return (
    <div className="relative min-h-screen bg-gray-50 p-6">
      <LibrarianBackground className="pointer-events-none" />
      <div className="relative z-10 max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">📌 Hold Management</h1>
            <p className="text-muted-foreground mt-1">Manage student book reservations (ordered by request time)</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/librarian')}>← Dashboard</Button>
            <select className="border rounded px-3 py-1.5 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="WAITING">WAITING</option>
              <option value="READY">READY</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : holds.length === 0 ? (
          <div className="p-12 text-center border rounded-xl bg-white">
            <p className="text-muted-foreground">No holds found</p>
          </div>
        ) : (
          <div className="border rounded-xl bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  <th className="p-3">Student</th>
                  <th className="p-3">Book</th>
                  <th className="p-3">ISBN</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Requested</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {holds.map((h) => (
                  <tr key={h.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{h.user?.name}</div>
                      <div className="text-xs text-muted-foreground">{h.user?.studentId}</div>
                    </td>
                    <td className="p-3">{h.book?.title}</td>
                    <td className="p-3 text-xs text-muted-foreground">{h.book?.isbn}</td>
                    <td className="p-3">{statusBadge(h.status)}</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {h.status === 'WAITING' && (
                          <Button size="sm" onClick={() => handleMarkReady(h.id)}>✅ Ready</Button>
                        )}
                        {(h.status === 'WAITING' || h.status === 'READY') && (
                          <Button size="sm" variant="outline" onClick={() => handleCancel(h.id)}>✕ Cancel</Button>
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
  );
}
