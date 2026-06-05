import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentHoldAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
    /* 修复 1：加上 h-screen overflow-hidden，彻底干掉浏览器最外层的第二条滚动条 */
    <div className="h-screen p-6 bg-transparent flex flex-col justify-start overflow-hidden">
      
      {/* 外层大面板：完美咬合高度，内部禁止溢出 */}
      <div className="max-w-[1920px] w-full mx-auto h-full bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-md border border-white/40 flex flex-col space-y-5 overflow-hidden">
        
        {/* 固定顶栏：头部和操作按钮固定在最上方，不参与滚动 */}
        <div className="flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">My Reservations</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Track your book reservation status</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="bg-white/50 backdrop-blur-sm border-gray-200" 
                onClick={() => navigate('/student')}
              >
                Back
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/50 backdrop-blur-sm border-gray-200" 
                onClick={() => navigate('/student/books')}
              >
                Browse Books
              </Button>
            </div>
          </div>
        </div>

        {/* 内部滚动层：现在作为全屏唯一的滚动通道 */}
        <div className="flex-1 w-full overflow-y-auto pr-1">
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Loading...</p>
          ) : holds.length === 0 ? (
            <div className="p-12 text-center border border-white/40 bg-white/40 backdrop-blur-sm rounded-xl">
              <p className="text-sm text-muted-foreground mb-4">No reservations yet</p>
              <Button onClick={() => navigate('/student/books')}>Browse Books to Reserve</Button>
            </div>
          ) : (
            /* 卡片网格列表 */
            <div className="space-y-4 pb-4">
              {holds.map((h) => (
                /* 修复 2：为了干掉由于透光引起的“偏红”视觉，
                     将卡片背景换成了半透明冷靛蓝灰 `bg-indigo-950/[0.04]` 与微量冷蓝天色 `bg-sky-50/30` 的复合层，
                     再配合冷调灰色边框 `border-slate-200/50`。
                     重叠后能完美中和底层色温，呈现清澈、高级的冷蓝灰色。 */
                <div 
                  key={h.id} 
                  className="border border-slate-200/50 bg-sky-50/30 bg-indigo-950/[0.04] backdrop-blur-xs p-5 rounded-xl flex justify-between items-start shadow-sm transition-all hover:bg-white/60"
                >
                  <div className="space-y-1">
                    <h3 className="text-base text-gray-800">{h.book?.title}</h3>
                    <p className="text-xs text-gray-500">by {h.book?.author} (ISBN: {h.book?.isbn})</p>
                    <div className="flex gap-3 items-center mt-2">
                      {statusBadge(h.status)}
                      <span className="text-xs text-muted-foreground">Requested: {new Date(h.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    {(h.status === 'WAITING' || h.status === 'READY') && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-white/80 hover:bg-red-50 hover:text-white transition-colors" 
                        onClick={() => handleCancel(h.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}