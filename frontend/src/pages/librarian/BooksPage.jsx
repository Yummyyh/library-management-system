import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

// 📖 Librarian book API configuration
const LIB_API_BASE = 'http://localhost:3001/api/librarian/books';
const getLibToken = () => localStorage.getItem('librarian_token');

// Generic request handler with auth and error handling
const request = async (endpoint, options = {}) => {
  const url = `${LIB_API_BASE}${endpoint}`;
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
    if (err.message?.includes('401') || err.message?.includes('403')) {
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
  // ✅ New: Get single book details (including barcodes)
  getById: (id) => request(`/${id}`),
};

// Initial Form State (using copyCount for creation)
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

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Handle View Barcodes
  const handleViewBarcodes = async (book) => {
    try {
      setLoadingBarcodes(true);
      setSelectedBook(book);
      const details = await bookAPI.getById(book.id);
      // Ensure we have the barcodes array
      setBarcodeList(details.barcodes || []);
      setBarcodeDialogOpen(true);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to Load Barcodes', description: err.message });
    } finally {
      setLoadingBarcodes(false);
    }
  };

  // Handle Create/Update Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!form.title || !form.author || !form.isbn || !form.genre) {
        throw new Error('Please fill in Title, Author, ISBN, and Genre');
      }
      if (form.copyCount < 1) throw new Error('Copy count must be at least 1');
      
      const payload = {
        ...form,
        description: form.description || 'No description',
        language: form.language || 'English',
        shelfLocation: form.shelfLocation || 'Unassigned',
        copyCount: form.copyCount,
      };
      
      if (editingId) {
        await bookAPI.update(editingId, payload);
        toast({ title: 'Updated', description: `${form.title} has been updated` });
      } else {
        await bookAPI.create(payload);
        toast({ title: 'Created', description: `Book ${form.title} has been added` });
      }
      setOpen(false);
      setForm(initialForm);
      setEditingId(null);
      fetchBooks(keyword);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Operation Failed', description: err.message });
    }
  };

  // Open Edit Dialog
  const handleEdit = (book) => {
    setForm({
      title: book.title, author: book.author, isbn: book.isbn, genre: book.genre,
      description: book.description || '', language: book.language || 'English',
      shelfLocation: book.shelfLocation || '',
      category: book.category || '', copyCount: 1, // Reset copyCount as it's only for create
    });
    setEditingId(book.id);
    setOpen(true);
  };

  // Soft Delete
  const handleDelete = async (book) => {
    if (!confirm(`Confirm remove book "${book.title}"? (Soft delete)`)) return;
    try {
      await bookAPI.remove(book.id);
      toast({ title: 'Removed', description: 'Book has been hidden from catalog' });
      fetchBooks(keyword);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Operation Failed', description: err.message });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('librarian_token');
    toast({ title: 'Logged Out' });
    navigate('/login');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header & Actions */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">📚 Book Management</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleLogout}>🚪 Logout</Button>
          
          {/* Add Book Dialog */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>+ Add Book</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Book' : 'Add New Book'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  {/* Only show Copy Count when Creating */}
                  {!editingId && (
                    <div className="grid gap-2">
                      <Label>Copy Count *</Label>
                      <Input type="number" min={1} required value={form.copyCount}
                        onChange={(e) => setForm({ ...form, copyCount: parseInt(e.target.value) || 1 })} />
                    </div>
                  )}
                </div>
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
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingId ? 'Save' : 'Create'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2 max-w-lg">
        <Input
          placeholder="Search by title/author/ISBN"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchBooks(keyword)}
        />
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
              <TableHead>Details</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : books.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">{keyword ? 'No results' : 'No books yet'}</TableCell></TableRow>
            ) : (
              books.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium">
                    <Link className="text-primary hover:underline" to={`/librarian/books/${book.id}`}>
                      {book.title}
                    </Link>
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
                  <TableCell>
                    <Button size="sm" variant="secondary" asChild>
                      <Link to={`/librarian/books/${book.id}`}>View</Link>
                    </Button>
                  </TableCell>
                  <TableCell className="space-x-2">
                    {/* ✅ New Button: View Barcodes */}
                    <Button size="sm" variant="outline" onClick={() => handleViewBarcodes(book)}>
                      🔍 Barcodes
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(book)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(book)}>Remove</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Barcode Details Dialog */}
      <Dialog open={barcodeDialogOpen} onOpenChange={setBarcodeDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              📖 {selectedBook?.title}
              <span className="block text-sm font-normal text-muted-foreground mt-1">
                Barcode Details (Total: {barcodeList.length})
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {loadingBarcodes ? (
              <p className="text-center py-4 text-muted-foreground">Loading barcodes...</p>
            ) : barcodeList.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {barcodeList.map((bc) => (
                      <TableRow key={bc.id}>
                        <TableCell className="font-mono text-sm">{bc.barcode}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            bc.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                            bc.status === 'BORROWED' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {bc.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No barcodes found for this book.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}