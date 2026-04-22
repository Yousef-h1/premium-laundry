import { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Receipt } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatPrice } from '../lib/utils';

interface Expense {
  id: string;
  description: string;
  benefit_amount: number;
  cash_amount: number;
  total_amount: number;
  created_at: string;
}

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [benefitAmount, setBenefitAmount] = useState('');
  const [cashAmount, setCashAmount] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setExpenses(data as Expense[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const benefit = parseFloat(benefitAmount) || 0;
    const cash = parseFloat(cashAmount) || 0;
    const total = benefit + cash;

    const { error } = await supabase.from('expenses').insert({
      description,
      benefit_amount: benefit,
      cash_amount: cash,
      total_amount: total
    });

    if (!error) {
      setDescription('');
      setBenefitAmount('');
      setCashAmount('');
      load();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) load();
  };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Receipt className="text-blue-600" /> المصاريف اليومية
      </h1>
      
      <form onSubmit={handleAdd} className="bg-white p-4 rounded-2xl shadow-sm mb-6 border border-gray-100">
        <input 
          className="w-full p-3 border rounded-xl mb-3 outline-none focus:ring-2 focus:ring-blue-500" 
          placeholder="وصف المصروف..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input 
            type="number" step="0.001" className="p-3 border rounded-xl" 
            placeholder="مبلغ بنفت" 
            value={benefitAmount}
            onChange={(e) => setBenefitAmount(e.target.value)}
          />
          <input 
            type="number" step="0.001" className="p-3 border rounded-xl" 
            placeholder="مبلغ كاش" 
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
          />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2">
          <PlusCircle size={20} /> إضافة مصروف
        </button>
      </form>

      {loading ? <div className="text-center py-10">جاري التحميل...</div> : (
        <div className="space-y-3">
          {expenses.map(exp => (
            <div key={exp.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-50">
              <div>
                <div className="font-bold">{exp.description}</div>
                <div className="text-xs text-gray-500">{new Date(exp.created_at).toLocaleDateString('ar-BH')}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-red-600">{formatPrice(exp.total_amount)} BHD</span>
                <button onClick={() => handleDelete(exp.id)} className="p-2 bg-red-50 text-red-600 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
