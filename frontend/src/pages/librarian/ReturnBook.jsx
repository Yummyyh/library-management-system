import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { librarianAPI } from '@/lib/api';

export default function ReturnBook() {
  const navigate = useNavigate();
  const { toast } = useToast();
  // ✅ 字段名 isbn → barcode，移除 studentId（后端仅凭 barcode 即可定位未还记录）
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);

  const returnBook = async () => {
    if (!barcode) {
      return toast({ variant: 'destructive', title: 'Validation Failed', description: 'Please scan or enter barcode' });
    }
    try {
      setLoading(true);
      // ✅ API 传参同步改为 barcode
      await librarianAPI.return({ barcode });
      toast({ title: '✅ Return Successful', description: 'Return completed' });
      setBarcode('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Return Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('librarian_token');
    toast({ title: 'Logged Out' });
    navigate('/login');
  };

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">📚 Return Processing</h2>
        <Button variant="outline" onClick={handleLogout}>🚪 Logout</Button>
      </div>
      <div className="grid gap-2">
        <Label>Barcode *</Label>
        <Input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Scan or type: 9780132350884-001"
        />
      </div>
      <Button onClick={returnBook} disabled={loading} className="w-full">
        {loading ? 'Processing...' : 'Confirm Return'}
      </Button>
    </div>
  );
}