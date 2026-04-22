import { useState, useEffect } from 'react';
import { Trash2, MessageCircle, Save, User, Phone, CreditCard, Tag, PlusCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Service, InvoiceItem } from '../lib/types';
import { generateInvoiceNumber, buildWhatsAppMessage, formatPrice, formatWhatsAppPhone } from '../lib/utils';

interface CartItem extends InvoiceItem {
  tempId: string;
  is_fast: boolean;
}

interface Props {
  onOrderSaved: () => void;
}

export function NewOrderPage({ onOrderSaved }: Props) {
  // الحالات الأساسية للنظام
  const [services, setServices] = useState<Service[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);

  // حالات نموذج الإدخال (الطريقة القديمة التي طلبتها)
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [serviceMode, setServiceMode] = useState<'wash_iron' | 'iron_only'>('wash_iron');
  const [isUrgent, setIsUrgent] = useState(false);
  const [manualPrice, setManualPrice] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    const { data } = await supabase.from('services').select('*').order('name_ar');
    if (data) setServices(data);
  };

  const subtotal = cart.reduce((s, i) => s + i.total_price, 0);
  const total = Math.max(0, subtotal - (parseFloat(discountInput) || 0));

  // --- منطق إضافة الخدمة (AddItem) ---
  const addItemToCart = () => {
    const service = services.find(s => s.id === selectedServiceId);
    if (!service) return;

    // القاعدة: السعر اليدوي له الأولوية، وإلا نستخدم السعر من قاعدة البيانات
    let basePrice = manualPrice !== '' ? parseFloat(manualPrice) : 
                    (serviceMode === 'wash_iron' ? (service.wash_iron_price || 0) : (service.iron_only_price || 0));
    
    // احتساب الاستعجال (مضاعفة السعر)
    const unitPrice = isUrgent ? basePrice * 2 : basePrice;

    const newItem: CartItem = {
      tempId: Date.now().toString(),
      service_id: service.id,
      service_name_en: service.name_en,
      service_name_ar: service.name_ar,
      service_type: serviceMode,
      quantity: quantity,
      unit_price: unitPrice,
      total_price: unitPrice * quantity,
      is_fast: isUrgent,
    };

    setCart([...cart, newItem]);
    // إعادة ضبط النموذج للإدخال القادم
    setSelectedServiceId(''); setManualPrice(''); setQuantity(1); setIsUrgent(false);
  };

  // --- منطق الحفظ النهائي والواتساب ---
  const handleSave = async (sendWhatsApp = false) => {
    if (cart.length === 0 || !customerPhone) return;
    setSaving(true);
    const invNumber = generateInvoiceNumber();
    
    const { data: inv, error } = await supabase.from('invoices').insert({
      invoice_number: invNumber,
      customer_name: customerName || 'عميل',
      customer_phone: customerPhone,
      is_fast_service: cart.some(i => i.is_fast),
      discount: parseFloat(discountInput) || 0,
      subtotal, total, status: 'unpaid', notes: isCredit ? 'credit' : '',
    }).select().single();

    if (inv) {
      const itemsToInsert = cart.map(({ tempId, ...rest }) => ({ ...rest, invoice_id: inv.id }));
      await supabase.from('invoice_items').insert(itemsToInsert);
      
      if (sendWhatsApp) {
        const msg = buildWhatsAppMessage({ ...inv, created_at: new Date().toISOString() }, cart);
        window.open(`https://wa.me/${formatWhatsAppPhone(customerPhone)}?text=${encodeURIComponent(msg)}`, '_blank');
      }
      
      setCart([]); setCustomerName(''); setCustomerPhone(''); setDiscountInput(''); setIsCredit(false);
      onOrderSaved();
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col min-h-screen pb-32" style={{ background: '#f8fafc', direction: 'rtl' }}>
      {/* 1. قسم بيانات العميل */}
      <div className="p-4 bg-white shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-blue-900" style={{ fontFamily: 'Tajawal' }}>بيانات الفاتورة</h2>
          <button onClick={loadServices} className="p-2 bg-gray-100 rounded-lg border-none hover:bg-gray-200 transition-colors"><RefreshCw size={14}/></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اسم العميل" className="p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:border-blue-300" />
          <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="رقم الهاتف" className="p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-mono focus:border-blue-300" />
        </div>
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
           <span className="text-xs font-bold text-blue-700">القائمة الشهرية (آجل)</span>
           <input type="checkbox" checked={isCredit} onChange={() => setIsCredit(!isCredit)} className="w-5 h-5 cursor-pointer" />
        </div>
      </div>

      {/* 2. لوحة الإدخال السريع (نظام POS القديم) */}
      <div className="m-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-gray-400 mr-1">الخدمة | Service</label>
          <select 
            value={selectedServiceId} 
            onChange={e => setSelectedServiceId(e.target.value)}
            className="w-full p-3 bg-white border-2 border-blue-50 rounded-xl outline-none text-sm font-bold text-gray-700 focus:border-blue-400"
          >
            <option value="">-- اختر قطعة من القائمة --</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name_ar} | {s.name_en}</option>)}
          </select>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setServiceMode('wash_iron')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${serviceMode === 'wash_iron' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>غسيل وكوي</button>
          <button onClick={() => setServiceMode('iron_only')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${serviceMode === 'iron_only' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>كوي فقط</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-amber-600 mr-1">تعديل السعر (BHD)</label>
            <input type="number" value={manualPrice} onChange={e => setManualPrice(e.target.value)} placeholder="سعر يدوي" className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl outline-none text-center font-bold text-amber-700 focus:border-amber-400" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-400 mr-1">الكمية</label>
            <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-center font-bold focus:border-blue-300" />
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
           <span className="text-xs font-bold text-orange-700">⚡ مستعجل (مضاعفة السعر)</span>
           <input type="checkbox" checked={isUrgent} onChange={() => setIsUrgent(!isUrgent)} className="w-5 h-5 cursor-pointer" />
        </div>

        <button onClick={addItemToCart} disabled={!selectedServiceId} className="w-full py-4 bg-blue-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg active:scale-95 transition-transform">
          <PlusCircle size={18} /> إضافة للطلب
        </button>
      </div>

      {/* 3. قائمة المواد المضافة (Preview) */}
      <div className="px-4 space-y-2">
        <p className="text-[11px] font-bold text-gray-400 px-1 uppercase tracking-wider">تفاصيل الفاتورة الحالية:</p>
        {cart.length === 0 && <p className="text-center py-4 text-gray-400 text-xs italic">لم يتم إضافة أي قطعة بعد..</p>}
        {cart.map(item => (
          <div key={item.tempId} className="bg-white p-3 rounded-xl flex justify-between items-center border-r-4 border-blue-600 shadow-sm animate-in fade-in slide-in-from-right-2">
            <div>
              <div className="text-sm font-bold text-gray-800">{item.service_name_ar} <span className="text-[10px] text-gray-400">×{item.quantity}</span></div>
              <div className="text-[10px] text-blue-600 font-bold">{item.service_type === 'wash_iron' ? 'غسيل وكوي' : 'كوي فقط'} {item.is_fast && ' | مستعجل'}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm text-gray-900">{formatPrice(item.total_price)}</span>
              <button onClick={() => setCart(cart.filter(i => i.tempId !== item.tempId))} className="p-2 text-red-500 bg-red-50 rounded-lg border-none hover:bg-red-100"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>

      {/* 4. الإجمالي النهائي وأزرار الحفظ (ثابتة بالأسفل) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t-2 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-[100]">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={16} className="text-gray-400" />
          <input type="number" value={discountInput} onChange={e => setDiscountInput(e.target.value)} placeholder="خصم" className="w-24 p-2 bg-gray-50 border rounded-lg text-sm outline-none" />
          <div className="flex-1 text-left font-black text-blue-900 text-xl">{formatPrice(total)} BHD</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => handleSave(false)} disabled={saving || cart.length === 0} className="bg-gray-800 text-white py-4 rounded-2xl font-bold text-xs hover:bg-gray-900 transition-colors">حفظ فقط</button>
          <button onClick={() => handleSave(true)} disabled={saving || cart.length === 0 || !customerPhone} className="bg-green-600 text-white py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-green-700 transition-colors">
            <MessageCircle size={16} /> اعتماد وواتساب
          </button>
        </div>
      </div>
    </div>
  );
}