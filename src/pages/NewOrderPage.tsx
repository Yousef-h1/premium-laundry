import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingCart, User, Phone, Zap, Save } from 'lucide-react';
// تأكد من استيراد الأدوات المساعدة والأنواع
import { formatPrice } from '../lib/utils';

// التصدير باستخدام Named Export ليتوافق مع App.tsx
export function NewOrderPage({ onOrderSaved }: { onOrderSaved: () => void }) {
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isFastService, setIsFastService] = useState(false);

  const handleSave = async () => {
    if (!customerName) {
      alert('يرجى إدخال اسم العميل');
      return;
    }

    setLoading(true);
    try {
      // منطق حفظ الفاتورة في Supabase
      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          customer_name: customerName,
          customer_phone: customerPhone,
          is_fast_service: isFastService,
          status: 'unpaid',
          total: 0, // سيتم تحديثه عند إضافة العناصر
          created_at: new Date().toISOString(),
        }]);

      if (error) throw error;

      alert('تم حفظ الطلب بنجاح');
      onOrderSaved(); // تحديث القائمة في App.tsx
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6" style={{ direction: 'rtl', fontFamily: 'Tajawal' }}>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 space-y-4">
        <h2 className="text-xl font-bold text-[#1a4d6e] mb-4">إنشاء طلب جديد</h2>
        
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-600">اسم العميل</label>
          <div className="relative">
            <User size={18} className="absolute right-3 top-3 text-gray-400" />
            <input 
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full p-3 pr-10 border border-gray-100 rounded-xl bg-gray-50 outline-none focus:border-[#1a4d6e]"
              placeholder="أدخل اسم العميل"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-600">رقم الهاتف</label>
          <div className="relative">
            <Phone size={18} className="absolute right-3 top-3 text-gray-400" />
            <input 
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full p-3 pr-10 border border-gray-100 rounded-xl bg-gray-50 outline-none focus:border-[#1a4d6e]"
              placeholder="33xxxxxx"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-100">
          <div className="flex items-center gap-2 text-yellow-700 font-bold">
            <Zap size={20} />
            <span>خدمة مستعجلة (تسليم سريع)</span>
          </div>
          <input 
            type="checkbox"
            checked={isFastService}
            onChange={(e) => setIsFastService(e.target.checked)}
            className="w-6 h-6 accent-yellow-600"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-4 bg-[#1a4d6e] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
        >
          <Save size={20} />
          {loading ? 'جارٍ الحفظ...' : 'حفظ الطلب والبدء'}
        </button>
      </div>
    </div>
  );
}
