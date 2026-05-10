import { useState, useEffect, useCallback } from 'react';
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
    // ✅ 修复1：仅内部接口触发 401/403 时清理本地存储并跳转
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
  
  // ✅ New State: For selecting barcodes in Details Dialog
  const [selectedBarcodes, setSelectedBarcodes] = useState([]);

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
    setSelectedBarcodes([]); // Reset selection when closing dialogs
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
                <TableRow key={book.id}>
                  <TableCell className="font-medium">{book.title}</TableCell>
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
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewBarcodes(book)}>🔍 Barcodes</Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(book)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(book)}>Remove</Button>
                  </TableCell>
                </TableRow>
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
                  <Button onClick={handlePrintSelectedBarcodes} disabled={selectedBarcodes.length === 0}>
                    🖨️ Print Selected
                  </Button>
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

    </div>
  );
}