import { useState, useEffect } from 'react';
import { Plus, Check, Zap } from 'lucide-react';
import { Service } from '../lib/types';

interface CartItem {
  service_type: 'wash_iron' | 'iron_only' | 'inspection';
  quantity: number;
  unit_price: number;
  customBasePrice?: number;
  is_fast?: boolean;
}

interface Props {
  service: Service;
  cartItems: CartItem[];
  onAdd: (service: Service, type: 'wash_iron' | 'iron_only' | 'inspection', isFast: boolean) => void;
  onIncrement: (service: Service, type: 'wash_iron' | 'iron_only' | 'inspection') => void;
  onDecrement: (service: Service, type: 'wash_iron' | 'iron_only' | 'inspection') => void;
  onCustomPrice: (service: Service, type: 'wash_iron' | 'iron_only', basePrice: number) => void;
  onToggleFast: (service: Service, type: 'wash_iron' | 'iron_only') => void;
}

const formatP = (p: number) => p.toFixed(3);

export function ServiceCard({ service, cartItems, onAdd, onIncrement, onDecrement, onCustomPrice, onToggleFast }: Props) {
  const washIronItem = cartItems.find((i) => i.service_type === 'wash_iron');
  const ironOnlyItem = cartItems.find((i) => i.service_type === 'iron_only');
  const inspectionItem = cartItems.find((i) => i.service_type === 'inspection');
  const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{
        boxShadow: totalQty > 0 ? '0 0 0 2px #1a4d6e, 0 4px 12px rgba(26,77,110,0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.2s',
      }}
    >
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-tight" style={{ fontFamily: 'Tajawal', fontWeight: 700, color: '#1a4d6e', lineHeight: 1.3 }}>
              {service.name_ar}
            </p>
            <p className="text-xs leading-tight mt-0.5" style={{ fontFamily: 'Inter', color: '#6c757d', direction: 'ltr', lineHeight: 1.2 }}>
              {service.name_en}
            </p>
          </div>
          {totalQty > 0 && (
            <span
              className="flex-shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold mr-1"
              style={{ width: 22, height: 22, background: '#1a4d6e', fontSize: 10, fontFamily: 'Inter' }}
            >
              {totalQty}
            </span>
          )}
        </div>

        {service.requires_inspection ? (
          <div className="space-y-2">
            <div className="text-xs text-center py-1 rounded-lg" style={{ background: '#fef3c7', color: '#92400e', fontFamily: 'Tajawal', fontWeight: 600 }}>
              السعر بعد المعاينة | After Inspection
            </div>
            {!inspectionItem ? (
              <button
                onClick={() => onAdd(service, 'inspection', false)}
                className="w-full flex items-center justify-center gap-1 py-2 rounded-xl text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg,#1a4d6e,#2a6d9e)', fontFamily: 'Tajawal', border: 'none', cursor: 'pointer' }}
              >
                <Plus size={16} />
                إضافة | Add
              </button>
            ) : (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onDecrement(service, 'inspection')}
                  className="rounded-full flex items-center justify-center font-bold text-lg"
                  style={{ width: 32, height: 32, background: '#f1f3f5', border: 'none', cursor: 'pointer', color: '#343a40' }}
                >−</button>
                <span style={{ fontFamily: 'Inter', fontWeight: 700, color: '#1a4d6e', fontSize: 16 }}>{inspectionItem.quantity}</span>
                <button
                  onClick={() => onIncrement(service, 'inspection')}
                  className="rounded-full flex items-center justify-center font-bold text-lg text-white"
                  style={{ width: 32, height: 32, background: '#1a4d6e', border: 'none', cursor: 'pointer' }}
                >+</button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {service.wash_iron_price !== null && (
              <ServiceTypeRow
                labelAr="غسيل+كي"
                labelEn="Wash+Iron"
                basePrice={service.wash_iron_price}
                item={washIronItem}
                onAdd={(isFast) => onAdd(service, 'wash_iron', isFast)}
                onInc={() => onIncrement(service, 'wash_iron')}
                onDec={() => onDecrement(service, 'wash_iron')}
                onApplyCustomPrice={(bp) => onCustomPrice(service, 'wash_iron', bp)}
                onToggleFast={() => onToggleFast(service, 'wash_iron')}
              />
            )}
            {service.iron_only_price !== null && (
              <ServiceTypeRow
                labelAr="كي فقط"
                labelEn="Iron Only"
                basePrice={service.iron_only_price}
                item={ironOnlyItem}
                onAdd={(isFast) => onAdd(service, 'iron_only', isFast)}
                onInc={() => onIncrement(service, 'iron_only')}
                onDec={() => onDecrement(service, 'iron_only')}
                onApplyCustomPrice={(bp) => onCustomPrice(service, 'iron_only', bp)}
                onToggleFast={() => onToggleFast(service, 'iron_only')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface RowProps {
  labelAr: string;
  labelEn: string;
  basePrice: number;
  item?: CartItem;
  onAdd: (isFast: boolean) => void;
  onInc: () => void;
  onDec: () => void;
  onApplyCustomPrice: (basePrice: number) => void;
  onToggleFast: () => void;
}

function ServiceTypeRow({ labelAr, labelEn, basePrice, item, onAdd, onInc, onDec, onApplyCustomPrice, onToggleFast }: RowProps) {
  const isFast = item?.is_fast ?? false;
  const appliedBase = item?.customBasePrice ?? basePrice;
  const [inputVal, setInputVal] = useState(appliedBase.toFixed(3));
  const [applied, setApplied] = useState(false);
  const [pendingFast, setPendingFast] = useState(false);

  useEffect(() => {
    setInputVal(appliedBase.toFixed(3));
    setApplied(false);
  }, [appliedBase]);

  const effectivePrice = (item ? isFast : pendingFast) ? appliedBase * 2 : appliedBase;
  const isCustom = item?.customBasePrice !== undefined && item.customBasePrice !== basePrice;

  const handleApply = () => {
    const v = parseFloat(inputVal);
    if (!isNaN(v) && v >= 0) {
      onApplyCustomPrice(v);
      setApplied(true);
      setTimeout(() => setApplied(false), 1500);
    }
  };

  const handleToggleFast = () => {
    if (item) {
      onToggleFast();
    } else {
      setPendingFast((v) => !v);
    }
  };

  const displayFast = item ? isFast : pendingFast;

  return (
    <div
      className="rounded-xl px-2 py-2"
      style={{
        background: item ? (isFast ? '#fffbeb' : '#eff6ff') : '#f8f9fa',
        border: item ? `1px solid ${isFast ? '#fde68a' : '#bfdbfe'}` : '1px solid transparent',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span style={{ fontFamily: 'Tajawal', fontWeight: 600, fontSize: 11, color: '#343a40' }}>{labelAr}</span>
            <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#9ca3af' }}>|</span>
            <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#9ca3af' }}>{labelEn}</span>
            <button
              onClick={handleToggleFast}
              style={{
                display: 'flex', alignItems: 'center', gap: 2, padding: '1px 6px',
                borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 9,
                fontFamily: 'Tajawal', fontWeight: 700,
                background: displayFast ? '#d97706' : '#e5e7eb',
                color: displayFast ? 'white' : '#6b7280',
                transition: 'all 0.15s',
              }}
            >
              <Zap size={9} fill={displayFast ? 'white' : 'none'} />
              {displayFast ? 'مستعجل' : 'عادي'}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span style={{
              fontFamily: 'Inter', fontWeight: 700, fontSize: 12,
              color: isCustom ? '#059669' : (displayFast ? '#d97706' : '#1a4d6e'),
            }}>
              {formatP(effectivePrice)} BHD
            </span>
            {displayFast && <span style={{ fontSize: 9, color: '#d97706', fontFamily: 'Tajawal', fontWeight: 700 }}>×2⚡</span>}
            {isCustom && <span style={{ fontSize: 9, color: '#059669', fontFamily: 'Tajawal', fontWeight: 700 }}>مخصص</span>}
          </div>
        </div>
        {!item ? (
          <button
            onClick={() => onAdd(pendingFast)}
            className="rounded-full flex items-center justify-center text-white"
            style={{ width: 28, height: 28, background: pendingFast ? '#d97706' : '#1a4d6e', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            <Plus size={14} />
          </button>
        ) : (
          <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
            <button
              onClick={onDec}
              className="rounded-full flex items-center justify-center font-bold"
              style={{ width: 26, height: 26, background: '#e9ecef', border: 'none', cursor: 'pointer', fontSize: 16, color: '#343a40' }}
            >−</button>
            <span style={{ fontFamily: 'Inter', fontWeight: 700, color: '#1a4d6e', fontSize: 14, minWidth: 16, textAlign: 'center' }}>
              {item.quantity}
            </span>
            <button
              onClick={onInc}
              className="rounded-full flex items-center justify-center text-white font-bold"
              style={{ width: 26, height: 26, background: '#1a4d6e', border: 'none', cursor: 'pointer', fontSize: 16 }}
            >+</button>
          </div>
        )}
      </div>

      {item && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className="flex-1 relative">
            <input
              type="number"
              step="0.001"
              min="0"
              value={inputVal}
              onChange={(e) => { setInputVal(e.target.value); setApplied(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              style={{
                width: '100%', padding: '5px 8px',
                border: `1.5px solid ${applied ? '#059669' : (isFast ? '#fde68a' : '#bfdbfe')}`,
                borderRadius: 8, fontFamily: 'Inter', fontSize: 12,
                textAlign: 'center', outline: 'none',
                color: '#1a4d6e', background: 'white',
                transition: 'border-color 0.2s',
              }}
              placeholder="0.000"
            />
          </div>
          <button
            onClick={handleApply}
            style={{
              flexShrink: 0, padding: '5px 8px',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              fontFamily: 'Tajawal', fontWeight: 700, fontSize: 11,
              background: applied ? '#059669' : '#1a4d6e',
              color: 'white', transition: 'background 0.2s',
              display: 'flex', alignItems: 'center', gap: 3,
            }}
          >
            {applied ? <Check size={12} /> : null}
            {applied ? 'تم' : 'تطبيق'}
          </button>
        </div>
      )}
    </div>
  );
}
