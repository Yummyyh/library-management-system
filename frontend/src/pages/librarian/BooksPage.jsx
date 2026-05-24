import { useState, useEffect, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import JsBarcode from 'jsbarcode';
import { ChevronDown, ChevronRight } from 'lucide-react'; 

// 📖 Librarian book API configuration
const LIB_API_BASE = 'http://localhost:3001/api/librarian/books';
const EXT_API_BASE = 'http://localhost:3001/api/external';
const getLibToken = () => localStorage.getItem('librarian_token');

// Generic request handler with auth and error handling
const request = async (endpoint, options = {}, isExternal = false) => {
  const base = isExternal ? EXT_API_BASE : LIB_API_BASE;
  const url = `${base}${endpoint}`;
  const token = getLibToken();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token || ''}`,
    ...options.headers
  };
  try {
    const res = await fetch(url, { ...options, headers });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.msg || `Request failed: ${res.status}`);
    }
    return json.data;
  } catch (err) {
    if (!isExternal && (err.message?.includes('401') || err.message?.includes('403'))) {
      localStorage.removeItem('librarian_token');
      window.location.href = '/login';
    }
    console.error('API Error:', err.message);
    throw err;
  }
};

// API Service Object
const bookAPI = {
  list: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`?${qs}`);
  },
  create: (data) => request('/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => request(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  remove: (id) => request(`/${id}`, {
    method: 'DELETE'
  }),
  getById: (id) => request(`/${id}`),
};

// Initial Form State
const initialForm = {
  title: '', author: '', isbn: '', genre: 'Technology',
  description: '', language: 'English', shelfLocation: '',
  category: '', copyCount: 1,
};

export default function LibrarianBooksPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // List State
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  // Add/Edit Dialog State
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  // Barcode Details Dialog State
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [barcodeList, setBarcodeList] = useState([]);
  const [loadingBarcodes, setLoadingBarcodes] = useState(false);
  const [selectedBarcodes, setSelectedBarcodes] = useState([]);

  // ✅ 修改：支持多行同时展开的状态
  const [expandedRowIds, setExpandedRowIds] = useState([]);
  const [expandedBookDataMap, setExpandedBookDataMap] = useState({});
  const [loadingExpandedIds, setLoadingExpandedIds] = useState([]);
  
  // Lightbox State
  const [zoomedImageData, setZoomedImageData] = useState(null);
  const [zoomedBarcodeText, setZoomedBarcodeText] = useState('');

  // ✅ 新增：打印暂存区相关状态
  const [printQueue, setPrintQueue] = useState([]); 
  const [queueOpen, setQueueOpen] = useState(false); 
  const [queueSelectedIds, setQueueSelectedIds] = useState([]); 

  // ISBN Lookup State
  const [isbnQuery, setIsbnQuery] = useState('');
  const [fetchingISBN, setFetchingISBN] = useState(false);

  // Barcode Preview State
  const [showBarcodePreview, setShowBarcodePreview] = useState(false);
  const [previewBarcodeList, setPreviewBarcodeList] = useState([]);

  // ✅ Unified reset function
  const resetFormState = useCallback(() => {
    setEditingId(null);
    setForm(initialForm);
    setIsbnQuery('');
    setShowBarcodePreview(false);
    setPreviewBarcodeList([]);
    setSelectedBarcodes([]); 
  }, []);

  // Fetch Books List
  const fetchBooks = useCallback(async (kw = '') => {
    try {
      setLoading(true);
      const res = await bookAPI.list({ keyword: kw, page: 1, size: 100 });
      setBooks(res.list || []);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to Load', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  // ✅ 修改：处理行展开/收起（支持多行）
  const handleToggleExpand = async (book) => {
    if (expandedRowIds.includes(book.id)) {
      // 收起
      setExpandedRowIds(prev => prev.filter(id => id !== book.id));
      setExpandedBookDataMap(prev => {
        const newMap = { ...prev };
        delete newMap[book.id];
        return newMap;
      });
    } else {
      // 展开
      setExpandedRowIds(prev => [...prev, book.id]);
      setLoadingExpandedIds(prev => [...prev, book.id]);
      try {
        const data = await bookAPI.getById(book.id);
        setExpandedBookDataMap(prev => ({ ...prev, [book.id]: data }));
      } catch (err) {
        toast({ variant: 'destructive', title: 'Failed to load details', description: err.message });
        setExpandedRowIds(prev => prev.filter(id => id !== book.id));
      } finally {
        setLoadingExpandedIds(prev => prev.filter(id => id !== book.id));
      }
    }
  };

  // ✅ 新增：处理条形码放大查看
  const handleZoomBarcode = (bookId, bcId, barcodeText) => {
    const img = document.getElementById(`img-${bookId}-${bcId}`);
    if (img) {
      setZoomedImageData(img.src);
      setZoomedBarcodeText(barcodeText);
    }
  };

  // ✅ 修改：绘制展开行内的条形码（遍历所有展开的行）
  useEffect(() => {
    expandedRowIds.forEach(bookId => {
      if (expandedBookDataMap[bookId]?.barcodes) {
        setTimeout(() => {
          expandedBookDataMap[bookId].barcodes.forEach(bc => {
            const canvas = document.getElementById(`canvas-${bookId}-${bc.id}`);
            const img = document.getElementById(`img-${bookId}-${bc.id}`);
            if (canvas && img) {
              try {
                JsBarcode(canvas, bc.barcode, { format: "CODE128", width: 2, height: 40, displayValue: false, margin: 0 });
                img.src = canvas.toDataURL('image/png');
              } catch (e) { console.error("Barcode render error:", e); }
            }
          });
        }, 100); 
      }
    });
  }, [expandedRowIds, expandedBookDataMap]);

  // Handle View Barcodes (Existing)
  const handleViewBarcodes = async (book) => {
    try {
      setLoadingBarcodes(true);
      setSelectedBook(book);
      setSelectedBarcodes([]); // Clear previous selection
      const details = await bookAPI.getById(book.id);
      setBarcodeList(details.barcodes || []);
      setBarcodeDialogOpen(true);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to Load Barcodes', description: err.message });
    } finally {
      setLoadingBarcodes(false);
    }
  };

  // ✅ New: Selection Handlers
  const toggleSelectBarcode = (barcodeObj, checked) => {
    if (checked) {
      setSelectedBarcodes([...selectedBarcodes, barcodeObj]);
    } else {
      setSelectedBarcodes(selectedBarcodes.filter(b => b.id !== barcodeObj.id));
    }
  };

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedBarcodes(barcodeList);
    } else {
      setSelectedBarcodes([]);
    }
  };

  // ✅ New: Print Selected Barcodes (Offline-friendly, using canvas.toDataURL)
  const handlePrintSelectedBarcodes = () => {
    if (selectedBarcodes.length === 0) {
      toast({ variant: "destructive", title: "Nothing to print", description: "Please select at least one barcode." });
      return;
    }

    // Create a hidden container to render barcodes
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);

    // Render all selected barcodes to canvas
    const barcodeDataUrls = [];
    let renderedCount = 0;

    selectedBarcodes.forEach((bc, _idx) => {
      const canvas = document.createElement('canvas');
      canvas.id = `print-canvas-${_idx}`;
      container.appendChild(canvas);

      try {
        JsBarcode(canvas, bc.barcode, {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 14,
          margin: 10
        });
        
        // Convert to data URL immediately
        const dataUrl = canvas.toDataURL('image/png');
        barcodeDataUrls[_idx] = { barcode: bc.barcode, dataUrl };
        renderedCount++;

        // When all rendered, open print window
        if (renderedCount === selectedBarcodes.length) {
          openPrintWindow(barcodeDataUrls);
          document.body.removeChild(container);
        }
      } catch {
        // ✅ 修复3：catch 不声明未使用的 err
        renderedCount++;
        if (renderedCount === selectedBarcodes.length) {
          openPrintWindow(barcodeDataUrls);
          document.body.removeChild(container);
        }
      }
    });
  };

  // ✅ 新增：将当前选中的条形码加入暂存区
  const addToPrintQueue = () => {
    if (selectedBarcodes.length === 0) {
      toast({ variant: "destructive", title: "Nothing to add", description: "Please select at least one barcode." });
      return;
    }
    // 获取当前暂存区已有的条形码集合，用于去重
    const currentQueueBarcodes = new Set(printQueue.map(item => item.barcode));
    
    // 过滤出未添加的条形码，并附带书名
    const toAdd = selectedBarcodes
      .filter(bc => !currentQueueBarcodes.has(bc.barcode))
      .map(bc => ({ ...bc, bookTitle: selectedBook.title }));

    if (toAdd.length === 0) {
      toast({ title: "Already in queue", description: "Selected barcodes are already in the print queue." });
    } else {
      setPrintQueue(prev => [...prev, ...toAdd]);
      toast({ title: "Added to queue", description: `${toAdd.length} barcodes added to print queue.` });
    }
  };

  // ✅ 新增：暂存区选择逻辑
  const toggleQueueSelect = (barcode, checked) => {
    if (checked) {
      setQueueSelectedIds(prev => [...prev, barcode]);
    } else {
      setQueueSelectedIds(prev => prev.filter(id => id !== barcode));
    }
  };

  const toggleQueueSelectAll = (checked) => {
    if (checked) {
      setQueueSelectedIds(printQueue.map(item => item.barcode));
    } else {
      setQueueSelectedIds([]);
    }
  };

  const removeSelectedFromQueue = () => {
    setPrintQueue(prev => prev.filter(item => !queueSelectedIds.includes(item.barcode)));
    setQueueSelectedIds([]);
  };

  const clearQueue = () => {
    setPrintQueue([]);
    setQueueSelectedIds([]);
  };

  // ✅ 新增：打印暂存区选中项 (复用 Canvas 生成逻辑)
  const printFromQueue = () => {
    const selectedItems = printQueue.filter(item => queueSelectedIds.includes(item.barcode));
    if (selectedItems.length === 0) {
      toast({ variant: "destructive", title: "Nothing to print", description: "Please select barcodes in the queue." });
      return;
    }

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);

    const barcodeDataUrls = [];
    let renderedCount = 0;
    
    selectedItems.forEach((item, idx) => {
      const canvas = document.createElement('canvas');
      canvas.id = `queue-print-canvas-${idx}`;
      container.appendChild(canvas);
      try {
        JsBarcode(canvas, item.barcode, { format: "CODE128", width: 2, height: 50, displayValue: true, margin: 10 });
        const dataUrl = canvas.toDataURL('image/png');
        barcodeDataUrls[idx] = { barcode: item.barcode, bookTitle: item.bookTitle, dataUrl };
        renderedCount++;
        if (renderedCount === selectedItems.length) {
          openQueuePrintWindow(barcodeDataUrls);
          document.body.removeChild(container);
        }
      } catch {
        renderedCount++;
        if (renderedCount === selectedItems.length) {
          openQueuePrintWindow(barcodeDataUrls);
          document.body.removeChild(container);
        }
      }
    });
  };

  // ✅ 新增：打开暂存区打印窗口
  const openQueuePrintWindow = (barcodeDataUrls) => {
    const printWindow = window.open('', '_blank');
    const barcodeHTML = barcodeDataUrls.map((item) => `
      <div class="barcode-item">
        <div style="font-size: 10px; color: #666; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.bookTitle}</div>
        <img src="${item.dataUrl}" alt="${item.barcode}" style="max-width: 100%; display: block; margin: 0 auto;" />
        <p class="bc-text">${item.barcode}</p>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
      <head>
        <title>Print Barcodes from Queue</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 20px; }
          .barcode-item { display: inline-block; margin: 10px; border: 1px solid #ddd; padding: 10px; page-break-inside: avoid; width: 200px; vertical-align: top; }
          .bc-text { font-family: monospace; font-size: 12px; margin-top: 5px; color: #333; }
          @media print { body { padding: 0; } .barcode-item { margin: 5px; } }
        </style>
      </head>
      <body>
        <h3>Print Queue (${barcodeDataUrls.length} items)</h3>
        ${barcodeHTML}
        <script>
          window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 500); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Open print window with pre-rendered barcode images
  const openPrintWindow = (barcodeDataUrls) => {
    const printWindow = window.open('', '_blank');
    
    // ✅ 修复1：使用 _index 表示未使用的参数
    const barcodeHTML = barcodeDataUrls.map((item) => `
      <div class="barcode-item">
        <img src="${item.dataUrl}" alt="${item.barcode}" style="max-width: 100%; display: block; margin: 0 auto;" />
        <p class="bc-text">${item.barcode}</p>
      </div>
    `).join('');

    // ✅ 修复2：移除不必要的 \/ 转义
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcodes - ${selectedBook?.title || 'Selected Items'}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; }
            h3 { margin-bottom: 20px; }
            .barcode-item { display: inline-block; margin: 10px; border: 1px solid #ddd; padding: 10px; page-break-inside: avoid; }
            .bc-text { font-family: monospace; font-size: 12px; margin-top: 5px; color: #333; }
            @media print {
              body { padding: 0; }
              .barcode-item { margin: 5px; }
            }
          </style>
        </head>
        <body>
          <h3>Barcodes for: ${selectedBook?.title || 'Selected Items'}</h3>
          ${barcodeHTML}
          <script>
            window.onload = function() { 
              setTimeout(() => { window.print(); window.close(); }, 500); 
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ISBN Lookup
  const fetchBookByISBN = async () => {
    if (!isbnQuery.trim()) {
      toast({ variant: 'destructive', title: 'ISBN Required', description: 'Please enter an ISBN number' });
      return;
    }
    try {
      setFetchingISBN(true);
      const cleanISBN = isbnQuery.replace(/[-\s]/g, '');
      const data = await request(`/books/isbn/${cleanISBN}`, {}, true);
      setForm(prev => ({
        ...prev,
        title: data.title || prev.title,
        author: data.author || prev.author,
        isbn: cleanISBN,
        description: data.description || prev.description,
        language: data.language || prev.language,
      }));
      toast({ title: '✅ Success', description: 'Book information auto-filled' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'ISBN Lookup Failed', description: err.message });
    } finally {
      setFetchingISBN(false);
    }
  };

  // Preview Generator
  const generateBarcodePreview = () => {
    const rawCount = form.copyCount || 1;
    const count = Math.max(1, Math.min(100, rawCount));
    if (rawCount !== count) toast({ title: "Copy Count Adjusted", description: `Limited to ${count} copies` });

    const cleanISBN = form.isbn.replace(/[-\s]/g, '');
    if (!cleanISBN) return toast({ variant: 'destructive', title: 'ISBN Required', description: 'Please enter ISBN first' });

    const barcodes = [];
    for (let i = 1; i <= count; i++) {
      barcodes.push({ id: i, barcode: `${cleanISBN}-${String(i).padStart(3, '0')}` });
    }
    setPreviewBarcodeList(barcodes);
    setShowBarcodePreview(true);
  };

  // Render Preview Barcodes
  useEffect(() => {
    if (showBarcodePreview && previewBarcodeList.length > 0) {
      setTimeout(() => {
        previewBarcodeList.forEach((bc) => {
          const canvas = document.getElementById(`preview-canvas-${bc.id}`);
          if (canvas) {
            try { JsBarcode(canvas, bc.barcode, { format: "CODE128", width: 2, height: 50, displayValue: true, margin: 10 }); } catch {/* intentionally empty */}
          }
        });
      }, 100);
    }
  }, [showBarcodePreview, previewBarcodeList]);

  // Print Preview Barcodes (Existing)
  const printPreviewBarcodes = () => {
    const printWindow = window.open('', '_blank');
    const barcodeImages = previewBarcodeList.map((bc) => {
      const canvas = document.getElementById(`preview-canvas-${bc.id}`);
      return canvas ? `<div style="margin-bottom: 20px; text-align: center;"><img src="${canvas.toDataURL()}" style="max-width: 100%;" /><p style="font-family: monospace;">${bc.barcode}</p></div>` : '';
    }).join('');
    // ✅ 修复4：移除不必要的 \/ 转义
    printWindow.document.write(`<html><body style="text-align:center;padding:20px;"><h2>${form.title}</h2>${barcodeImages}<script>window.onload=function(){window.print();window.close();}</script></body></html>`);
    printWindow.document.close();
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!form.title || !form.author || !form.isbn || !form.genre) throw new Error('Missing required fields');
      const payload = { ...form, description: form.description || 'No description', language: form.language || 'English', shelfLocation: form.shelfLocation || 'Unassigned' };
      if (editingId) {
        await bookAPI.update(editingId, payload);
        toast({ title: 'Updated', description: `${form.title} updated` });
      } else {
        await bookAPI.create(payload);
        toast({ title: 'Created', description: `${form.title} added` });
      }
      resetFormState();
      setOpen(false);
      fetchBooks(keyword);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Operation Failed', description: err.message });
    }
  };

  // Edit & Delete
  const handleEdit = (book) => {
    setForm({
      title: book.title, author: book.author, isbn: book.isbn, genre: book.genre,
      description: book.description || '', language: book.language || 'English',
      shelfLocation: book.shelfLocation || '', category: book.category || '', copyCount: 1,
    });
    setEditingId(book.id);
    setOpen(true);
  };

  const handleDelete = async (book) => {
    if (!confirm(`Confirm remove book "${book.title}"?`)) return;
    try {
      await bookAPI.remove(book.id);
      toast({ title: 'Removed', description: 'Book hidden' });
      fetchBooks(keyword);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('librarian_token');
    navigate('/login');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header & Actions */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">📚 Book Management</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleLogout}>🚪 Logout</Button>
          <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetFormState(); setOpen(isOpen); }}>
            <DialogTrigger asChild>
              <Button>+ Add Book</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Book' : 'Add New Book'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingId && (
                  <div className="p-4 border rounded-lg bg-blue-50 space-y-2">
                    <Label className="text-blue-800">🔍 ISBN Auto-Lookup (Optional)</Label>
                    <div className="flex gap-2">
                      <Input value={isbnQuery} onChange={(e) => setIsbnQuery(e.target.value)} placeholder="Enter ISBN" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), fetchBookByISBN())} />
                      <Button type="button" variant="secondary" onClick={fetchBookByISBN} disabled={fetchingISBN}>{fetchingISBN ? 'Searching...' : 'Fetch'}</Button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Title *</Label>
                    <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Author *</Label>
                    <Input required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>ISBN *</Label>
                    <Input required value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Genre *</Label>
                    <Input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} placeholder="Technology/Fiction/..." />
                  </div>
                  <div className="grid gap-2">
                    <Label>Custom Category</Label>
                    <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Optional" />
                  </div>
                  {!editingId && (
                    <div className="grid gap-2">
                      <Label>Copy Count *</Label>
                      <Input type="number" min={1} required value={form.copyCount} onChange={(e) => setForm({ ...form, copyCount: parseInt(e.target.value) || 1 })} />
                    </div>
                  )}
                </div>
                {!editingId && form.copyCount > 0 && form.isbn && (
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={generateBarcodePreview} className="text-blue-600">🔍 Preview Barcodes ({form.copyCount})</Button>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Language</Label>
                    <Input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="English" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Shelf Location</Label>
                    <Input value={form.shelfLocation} onChange={(e) => setForm({ ...form, shelfLocation: e.target.value })} placeholder="Tech-A1" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { resetFormState(); setOpen(false); }}>Cancel</Button>
                  <Button type="submit">{editingId ? 'Save' : 'Create'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2 max-w-lg">
        <Input placeholder="Search by title/author/ISBN" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchBooks(keyword)} />
        <Button onClick={() => fetchBooks(keyword)}>Search</Button>
      </div>

      {/* Books Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead>Genre</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : books.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">{keyword ? 'No results' : 'No books yet'}</TableCell></TableRow>
            ) : (
              books.map((book) => (
                <Fragment key={book.id}>
                  {/* 主行：点击整行触发展开 */}
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/50 transition-colors" 
                    onClick={() => handleToggleExpand(book)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {expandedRowIds.includes(book.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        {book.title}
                      </div>
                    </TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell className="text-xs">{book.isbn}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs">{book.genre}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold ${(book.availableCount ?? 0) === 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {book.availableCount ?? 0}
                      </span>
                    </TableCell>
                    {/* Actions 列：阻止事件冒泡，防止点击按钮时触发展开 */}
                    <TableCell className="space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => handleViewBarcodes(book)}>🔍 Barcodes</Button>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(book)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(book)}>Remove</Button>
                    </TableCell>
                  </TableRow>

                  {/* ✅ 修改：展开行改为列表布局，一个条形码占一整行 */}
                  {expandedRowIds.includes(book.id) && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-slate-50/50 p-6">
                        {loadingExpandedIds.includes(book.id) ? (
                          <div className="text-center text-muted-foreground py-4">Loading barcodes...</div>
                        ) : expandedBookDataMap[book.id]?.barcodes?.length > 0 ? (
                          <ul className="divide-y rounded-md border text-sm bg-white w-full">
                            {expandedBookDataMap[book.id].barcodes.map((bc) => (
                              <li 
                                key={bc.id || bc.barcode} 
                                className="flex justify-between items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => handleZoomBarcode(book.id, bc.id, bc.barcode)}
                                title="Click to zoom"
                              >
                                <div className="flex items-center gap-6 flex-1">
                                  {/* 隐藏的 canvas 用于生成条形码 */}
                                  <canvas id={`canvas-${book.id}-${bc.id}`} className="hidden" />
                                  {/* 显示的 img 标签，增加边框和背景使其更清晰 */}
                                  <img id={`img-${book.id}-${bc.id}`} alt={bc.barcode} className="h-10 w-48 object-contain bg-white border rounded p-1 shadow-sm" />
                                  <span className="font-mono truncate text-xs text-muted-foreground" title={bc.barcode}>
                                    {bc.barcode}
                                  </span>
                                </div>
                                {/* 状态标签 */}
                                <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                                  bc.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {bc.status}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-center text-muted-foreground py-4">No barcodes found.</div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ✅ Updated: Barcode Details Dialog with Selection */}
      <Dialog open={barcodeDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) setSelectedBarcodes([]); setBarcodeDialogOpen(isOpen); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              📖 {selectedBook?.title}
              <span className="block text-sm font-normal text-muted-foreground mt-1">
                Select barcodes to print or manage
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {loadingBarcodes ? (
              <p className="text-center py-4 text-muted-foreground">Loading barcodes...</p>
            ) : barcodeList.length > 0 ? (
              <>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input 
                            type="checkbox" 
                            checked={barcodeList.length > 0 && selectedBarcodes.length === barcodeList.length}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                          />
                        </TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {barcodeList.map((bc) => (
                        <TableRow key={bc.id} className={selectedBarcodes.some(s => s.id === bc.id) ? "bg-blue-50" : ""}>
                          <TableCell>
                            <input 
                              type="checkbox" 
                              checked={selectedBarcodes.some(s => s.id === bc.id)}
                              onChange={(e) => toggleSelectBarcode(bc, e.target.checked)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">{bc.barcode}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${bc.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{bc.status}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between items-center mt-4 p-2 bg-gray-50 rounded">
                  <span className="text-sm text-muted-foreground">Selected: {selectedBarcodes.length} items</span>
                  <div className="flex gap-2">
                    {/* ✅ 新增：加入暂存区按钮 */}
                    <Button variant="secondary" onClick={addToPrintQueue} disabled={selectedBarcodes.length === 0}>
                      ➕ Add to Queue
                    </Button>
                    {/* 保留原有功能：直接打印 */}
                    <Button onClick={handlePrintSelectedBarcodes} disabled={selectedBarcodes.length === 0}>
                      🖨️ Print Selected
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-4">No barcodes found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode Preview Dialog (Existing) */}
      <Dialog open={showBarcodePreview} onOpenChange={setShowBarcodePreview}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📊 Barcode Preview - {form.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {previewBarcodeList.map((bc) => (
                <div key={bc.id} className="border rounded-lg p-4 text-center bg-white shadow-sm">
                  <canvas id={`preview-canvas-${bc.id}`} />
                  <p className="text-xs font-mono mt-2">{bc.barcode}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBarcodePreview(false)}>Close</Button>
              <Button onClick={printPreviewBarcodes}>🖨️ Print All</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ 放大查看遮罩层 (Lightbox) */}
      {zoomedImageData && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" 
          onClick={() => setZoomedImageData(null)} // 点击空白区域关闭
        >
          <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Barcode Detail</h3>
            <img src={zoomedImageData} alt="Zoomed Barcode" className="w-full h-auto mb-4 border rounded p-2 bg-gray-50" />
            <p className="text-xl font-mono text-gray-800 mb-6">{zoomedBarcodeText}</p>
            <Button variant="outline" onClick={() => setZoomedImageData(null)}>Close</Button>
          </div>
        </div>
      )}

      {/* ✅ 新增：左下角悬浮按钮 (FAB) */}
      <div className="fixed bottom-8 left-8 z-50">
        <Button 
          size="lg" 
          className="rounded-full shadow-lg h-14 w-14 p-0 flex items-center justify-center relative bg-blue-600 hover:bg-blue-700"
          onClick={() => setQueueOpen(true)}
        >
          🖨️
          {printQueue.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white">
              {printQueue.length}
            </span>
          )}
        </Button>
      </div>

      {/* ✅ 新增：打印暂存区 Dialog */}
      <Dialog open={queueOpen} onOpenChange={setQueueOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🖨️ Print Queue (暂存区)</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {printQueue.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Queue is empty.</p>
                <p className="text-sm mt-2">Open book details and click "Add to Queue" to add barcodes.</p>
              </div>
            ) : (
              <>
                <div className="border rounded-md mb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input 
                            type="checkbox" 
                            checked={printQueue.length > 0 && queueSelectedIds.length === printQueue.length}
                            onChange={(e) => toggleQueueSelectAll(e.target.checked)}
                          />
                        </TableHead>
                        <TableHead>Book Title</TableHead>
                        <TableHead>Barcode</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {printQueue.map((item) => (
                        <TableRow key={item.barcode} className={queueSelectedIds.includes(item.barcode) ? "bg-blue-50" : ""}>
                          <TableCell>
                            <input 
                              type="checkbox" 
                              checked={queueSelectedIds.includes(item.barcode)}
                              onChange={(e) => toggleQueueSelect(item.barcode, e.target.checked)}
                            />
                          </TableCell>
                          <TableCell className="text-sm truncate max-w-[250px]" title={item.bookTitle}>
                            {item.bookTitle}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{item.barcode}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={removeSelectedFromQueue} disabled={queueSelectedIds.length === 0}>
                      🗑️ Remove Selected ({queueSelectedIds.length})
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearQueue} disabled={printQueue.length === 0}>
                      ❌ Clear All
                    </Button>
                  </div>
                  <Button onClick={printFromQueue} disabled={queueSelectedIds.length === 0} className="bg-blue-600 hover:bg-blue-700">
                    🖨️ Print Selected ({queueSelectedIds.length})
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}