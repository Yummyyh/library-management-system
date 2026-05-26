import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { librarianBookAPI, studentBookAPI } from '@/lib/api';
import { studentSession } from '@/lib/studentSession';
import { Button } from '@/components/ui/button';
import JsBarcode from 'jsbarcode'; // ✅ 必须引入 JsBarcode 才能生成图片

/** Shown when a field is null, empty, or missing in the API payload */
const MISSING = 'Information unavailable';

function textOrMissing(value) {
  if (value === null || value === undefined) return MISSING;
  if (typeof value === 'string' && value.trim() === '') return MISSING;
  return value;
}

/** Maps API borrowStatus to user-facing English labels */
function borrowStatusLabel(status) {
  if (status === 'available') return 'Available';
  if (status === 'borrowed') return 'Currently Borrowed';
  return 'Status Unavailable';
}

function formatPublishDate(iso) {
  if (!iso) return MISSING;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return MISSING;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function BookDetailPage() {
  const { bookId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const mode = location.pathname.startsWith('/librarian') ? 'librarian' : 'student';
  const backPath = mode === 'librarian' ? '/librarian/books' : '/student/books';

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // ✅ 新增：放大查看状态
  const [zoomedImageData, setZoomedImageData] = useState(null);
  const [zoomedBarcodeText, setZoomedBarcodeText] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!bookId || !String(bookId).trim()) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      setNotFound(false);
      setLoadError(null);
      try {
        const data = mode === 'librarian' ? await librarianBookAPI.getById(bookId) : await studentBookAPI.getById(bookId);
        if (!cancelled) setBook(data);
      } catch (e) {
        if (cancelled) return;
        const msg = String(e?.message || 'Request failed');
        const lower = msg.toLowerCase();
        if (lower.includes('not found') || lower.includes('404')) {
          setNotFound(true);
        } else {
          setLoadError(msg);
          toast({ variant: 'destructive', title: 'Unable to load book', description: msg });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [bookId, mode, toast]);

  // ✅ 新增：绘制详情页中的条形码
  useEffect(() => {
    if (book && Array.isArray(book.barcodes)) {
      setTimeout(() => {
        book.barcodes.forEach(bc => {
          const canvas = document.getElementById(`barcode-canvas-${bc.id}`);
          const img = document.getElementById(`barcode-img-${bc.id}`);
          if (canvas && img) {
            try {
              JsBarcode(canvas, bc.barcode, { format: "CODE128", width: 1.5, height: 30, displayValue: false, margin: 0 });
              img.src = canvas.toDataURL('image/png'); // 将 canvas 转为图片显示
            } catch (e) { console.error("Barcode render error:", e); }
          }
        });
      }, 100);
    }
  }, [book]);

  const handleLogout = mode === 'librarian'
    ? () => { localStorage.removeItem('librarian_token'); navigate('/login'); }
    : () => { studentSession.clear(); navigate('/login'); };

  if (loading) return <div className="p-6 max-w-3xl mx-auto space-y-4"><p className="text-muted-foreground">Loading book details…</p></div>;
  if (notFound) return <div className="p-6 max-w-3xl mx-auto space-y-4"><h1 className="text-2xl font-bold">Book Details</h1><div className="border rounded-lg p-6 bg-muted/30"><p className="font-medium">Book not found</p></div><Button asChild variant="outline"><Link to={backPath}>Back to list</Link></Button></div>;
  if (loadError || !book) return <div className="p-6 max-w-3xl mx-auto space-y-4"><h1 className="text-2xl font-bold">Book Details</h1><div className="border rounded-lg p-6 border-destructive/40 bg-destructive/5"><p className="font-medium">We could not load this book</p><p className="text-sm text-muted-foreground mt-2">{loadError || MISSING}</p></div></div>;

  const statusKey = book.borrowStatus || 'unavailable';
  const canBorrow = statusKey === 'available';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Book Details</h1>
          <p className="text-sm text-muted-foreground">Catalog id: {textOrMissing(book.bookId || book.id)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to={backPath}>← Back</Link></Button>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      <section className="border rounded-lg p-6 space-y-4 bg-card">
        <h2 className="text-lg font-semibold border-b pb-2">Summary</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt className="text-xs uppercase text-muted-foreground">Title</dt><dd className="font-medium">{textOrMissing(book.title)}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">Author</dt><dd>{textOrMissing(book.author)}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">ISBN</dt><dd className="font-mono text-sm">{textOrMissing(book.isbn)}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">Category</dt><dd>{textOrMissing(book.category)}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">Genre</dt><dd>{textOrMissing(book.genre)}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">Publisher</dt><dd>{textOrMissing(book.publisher)}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">Publish date</dt><dd>{formatPublishDate(book.publishedAt)}</dd></div>
        </dl>
        <div><dt className="text-xs uppercase text-muted-foreground">Description</dt><dd className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{textOrMissing(book.description)}</dd></div>
      </section>

      <section className="border rounded-lg p-6 space-y-3 bg-card">
        <h2 className="text-lg font-semibold border-b pb-2">Availability</h2>
        <p className="text-sm text-muted-foreground">Copies on hand: <span className="font-medium text-foreground">{book.totalCopies ?? 0}</span> · Available now: <span className="font-medium text-foreground">{book.availableCount ?? 0}</span></p>
        <p><span className="text-xs uppercase text-muted-foreground">Borrow status</span><span className={`ml-2 inline-flex items-center rounded px-2 py-1 text-sm font-medium ${canBorrow ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{borrowStatusLabel(statusKey)}</span></p>
      </section>

      {/* Copies 区域 */}
      {Array.isArray(book.barcodes) && book.barcodes.length > 0 && (
        <section className="border rounded-lg p-6 space-y-3 bg-card">
          <h2 className="text-lg font-semibold border-b pb-2">Copies</h2>
          <ul className="divide-y rounded-md border text-sm">
            {book.barcodes.map((bc) => (
              <li 
                key={bc.id || bc.barcode} 
                className="flex justify-between items-center gap-4 px-3 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => {
                  const img = document.getElementById(`barcode-img-${bc.id}`);
                  if (img) {
                    setZoomedImageData(img.src);
                    setZoomedBarcodeText(bc.barcode);
                  }
                }}
                title="Click to zoom"
              >
                <div className="flex items-center gap-6 flex-1">
                  <canvas id={`barcode-canvas-${bc.id}`} className="hidden" />
                  <img id={`barcode-img-${bc.id}`} alt={bc.barcode} className="h-10 w-48 object-contain bg-white border rounded p-1 shadow-sm" />
                  <span className="font-mono truncate text-xs text-muted-foreground" title={bc.barcode}>{textOrMissing(bc.barcode)}</span>
                </div>
                <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-full ${bc.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {textOrMissing(bc.status)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 放大查看遮罩层 (Lightbox) */}
      {zoomedImageData && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setZoomedImageData(null)}>
          <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Barcode Detail</h3>
            <img src={zoomedImageData} alt="Zoomed Barcode" className="w-full h-auto mb-4 border rounded p-2 bg-gray-50" />
            <p className="text-xl font-mono text-gray-800 mb-6">{zoomedBarcodeText}</p>
            <Button variant="outline" onClick={() => setZoomedImageData(null)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}