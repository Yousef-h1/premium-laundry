import { useState, useEffect } from 'react';
import { Delete } from 'lucide-react';

interface PinPadProps {
  title: string;
  titleAr: string;
  onSuccess: () => void;
  correctPin: string;
  isOpen: boolean;
}

export function PinPad({ title, titleAr, onSuccess, correctPin, isOpen }: PinPadProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');

      if (newPin.length === 4) {
        if (newPin === correctPin) {
          onSuccess();
          setPin('');
        } else {
          setError('رمز PIN غير صحيح | Incorrect PIN');
          setPin('');
          setTimeout(() => setError(''), 2000);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #1a4d6e 0%, #0f3450 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1
          style={{
            fontFamily: 'Tajawal',
            fontWeight: 700,
            fontSize: 28,
            color: 'white',
            margin: '0 0 8px 0',
          }}
        >
          {titleAr}
        </h1>
        <p
          style={{
            fontFamily: 'Inter',
            fontSize: 14,
            color: 'rgba(255,255,255,0.7)',
            margin: 0,
          }}
        >
          {title}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '40px',
          justifyContent: 'center',
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: pin.length > i ? '#16a34a' : 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.3)',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>
              {pin.length > i ? '●' : ''}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div
          style={{
            background: '#dc2626',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '30px',
            fontFamily: 'Tajawal',
            fontWeight: 700,
            fontSize: '13px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '20px',
          width: '100%',
          maxWidth: '280px',
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleDigit(String(num))}
            style={{
              padding: '20px',
              borderRadius: '12px',
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              fontFamily: 'Inter',
              fontWeight: 700,
              fontSize: '20px',
              cursor: 'pointer',
              transition: 'all 0.1s',
            }}
            onMouseDown={(e) => {
              (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)';
              (e.target as HTMLButtonElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)';
              (e.target as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => handleDigit('0')}
          style={{
            gridColumn: '2',
            padding: '20px',
            borderRadius: '12px',
            border: 'none',
            background: 'rgba(255,255,255,0.15)',
            color: 'white',
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: '20px',
            cursor: 'pointer',
            transition: 'all 0.1s',
          }}
          onMouseDown={(e) => {
            (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)';
            (e.target as HTMLButtonElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)';
            (e.target as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          0
        </button>
        <button
          onClick={handleDelete}
          style={{
            padding: '20px',
            borderRadius: '12px',
            border: 'none',
            background: 'rgba(220,38,38,0.3)',
            color: '#fca5a5',
            fontFamily: 'Inter',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.1s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseDown={(e) => {
            (e.target as HTMLButtonElement).style.background = 'rgba(220,38,38,0.5)';
            (e.target as HTMLButtonElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.target as HTMLButtonElement).style.background = 'rgba(220,38,38,0.3)';
            (e.target as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          <Delete size={20} />
        </button>
      </div>

      <p
        style={{
          fontFamily: 'Tajawal',
          fontSize: 12,
          color: 'rgba(255,255,255,0.5)',
          marginTop: '20px',
          textAlign: 'center',
        }}
      >
        أدخل رمز PIN | Enter PIN Code
      </p>
    </div>
  );
}
