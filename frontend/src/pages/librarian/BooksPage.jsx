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

// 📖 Librarian book API (points to /api/librarian/books)
const LIB_API_BASE = 'http://localhost:3001/api/librarian/books';

const getLibToken = () => localStorage.getItem('librarian_token');

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
};

const initialForm = {
  title: '', author: '', isbn: '', genre: 'Technology',
  description: '', language: 'English', shelfLocation: '',
  category: '', stock: 1,
};

export default function LibrarianBooksPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [keyword, setKeyword] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!form.title || !form.author || !form.isbn || !form.genre) {
        throw new Error('Please fill in Title, Author, ISBN, and Genre');
      }
      if (form.stock < 0) throw new Error('Stock cannot be negative');

      const payload = {
        ...form,
        description: form.description || 'No description',
        language: form.language || 'English',
        shelfLocation: form.shelfLocation || 'Unassigned',
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

  const handleEdit = (book) => {
    setForm({
      title: book.title, author: book.author, isbn: book.isbn, genre: book.genre,
      description: '', language: '', shelfLocation: '',
      category: book.category || '', stock: book.stock,
    });
    setEditingId(book.id);
    setOpen(true);
  };

  const handleDelete = async (book) => {
    if (!confirm(`Confirm remove book "${book.title}"? (Soft delete, history preserved)`)) return;
    try {
      await bookAPI.remove(book.id);
      toast({ title: 'Removed', description: 'Book has been hidden from catalog' });
      fetchBooks(keyword);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Operation Failed', description: err.message });
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBooks(keyword);
  };

  const handleLogout = () => {
    localStorage.removeItem('librarian_token');
    toast({ title: 'Logged Out' });
    navigate('/login');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📚 Book Management</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleLogout}>🚪 Logout</Button>
          <div className="flex gap-2">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input 
                placeholder="Search by title/author/ISBN" 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)} 
                className="w-64" 
              />
              <Button type="submit">Search</Button>
            </form>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setForm(initialForm); setEditingId(null); }}>
                  + Add Book
                </Button>
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
                    <div className="grid gap-2">
                      <Label>Stock *</Label>
                      <Input type="number" min={0} required value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} />
                    </div>
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
      </div>

      {/* Book list */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead>Genre</TableHead>
              <TableHead>Stock</TableHead>
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
                    <span className={`font-bold ${book.stock === 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {book.stock}
                    </span>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(book)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(book)}>Remove</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}