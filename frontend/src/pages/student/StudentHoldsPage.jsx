import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentHoldAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import StudentBackground from '@/components/ui/StudentBackground';

export default function StudentHoldsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [holds, setHolds] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHolds = async () => {
    try {
      setLoading(true);
      const data = await studentHoldAPI.list();
      setHolds(data?.list || []);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHolds(); }, []);

  const handleCancel = async (id) => {
    try {
      await studentHoldAPI.cancel(id);
      toast({ title: 'Cancelled', description: 'Reservation cancelled' });
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
      <StudentBackground className="pointer-events-none" />
      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">📌 My Reservations</h1>
            <p className="text-muted-foreground mt-1">Track your book reservation status</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/student/books')}>📖 Browse Books</Button>
            <Button variant="outline" onClick={() => navigate('/student')}>← Dashboard</Button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : holds.length === 0 ? (
          <div className="p-12 text-center border rounded-xl bg-white">
            <p className="text-muted-foreground mb-4">No reservations yet</p>
            <Button onClick={() => navigate('/student/books')}>Browse Books to Reserve</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {holds.map((h) => (
              <div key={h.id} className="border rounded-xl bg-white p-5 flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">{h.book?.title}</h3>
                  <p className="text-sm text-muted-foreground">by {h.book?.author} (ISBN: {h.book?.isbn})</p>
                  <div className="flex gap-3 items-center mt-2">
                    {statusBadge(h.status)}
                    <span className="text-xs text-muted-foreground">Requested: {new Date(h.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div>
                  {(h.status === 'WAITING' || h.status === 'READY') && (
                    <Button variant="outline" size="sm" onClick={() => handleCancel(h.id)}>Cancel</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
