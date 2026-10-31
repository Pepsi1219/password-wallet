import React, { useState } from 'react';
import { Key, Delete, ShieldAlert } from 'lucide-react';
import type { User } from 'firebase/auth';

interface SetupPinScreenProps {
  user: User;
  onPinCreated: (pin: string) => void;
}

export const SetupPinScreen: React.FC<SetupPinScreenProps> = ({ user, onPinCreated }) => {
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [tempPin, setTempPin] = useState('');
  const PIN_LENGTH = 6;

  const handleNumberClick = (num: string) => {
    if (pin.length < PIN_LENGTH) {
      const newPin = pin + num;
      setPin(newPin);

      if (newPin.length === PIN_LENGTH) {
        if (step === 'create') {
          // จำ PIN รอบแรกไว้ แล้วเปลี่ยนเป็นขั้นยืนยัน
          setTempPin(newPin);
          setPin('');
          setStep('confirm');
        } else {
          // กรอกยืนยันครบแล้ว เช็กว่าตรงกันไหม
          if (newPin === tempPin) {
            onPinCreated(newPin);
          } else {
            alert('PIN ไม่ตรงกัน กรุณาตั้งค่าใหม่อีกครั้ง');
            setPin('');
            setTempPin('');
            setStep('create');
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="flex-1 flex flex-col justify-between items-center text-center p-6 select-none">
      <div className="pt-2">
        <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-400 shadow-inner">
          <Key className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-bold mb-1">
          {step === 'create' ? 'Create Master PIN' : 'Confirm Master PIN'}
        </h1>
        <p className="text-xs text-slate-400 max-w-[260px] leading-relaxed mb-2">
          สวัสดีคุณ {user.displayName || user.email} <br />
          {step === 'create'
            ? `ตั้งค่า PIN ${PIN_LENGTH} หลักเพื่อใช้เข้ารหัส Password Wallet ของคุณ`
            : 'กรอก PIN อีกครั้งเพื่อยืนยันความถูกต้อง'}
        </p>

        {step === 'create' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-400 mx-auto max-w-[280px] text-left">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>โปรดจำ PIN นี้ให้ดี ระบบไม่มีฟังก์ชันกู้คืนรหัสผ่าน</span>
          </div>
        )}
      </div>

      {/* จุดแสดงสถานะ PIN */}
      <div className="flex justify-center items-center gap-3 my-4">
        {Array.from({ length: PIN_LENGTH }).map((_, index) => (
          <div
            key={index}
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              index < pin.length
                ? 'bg-indigo-500 scale-110 shadow-lg shadow-indigo-500/50'
                : 'bg-slate-800 border border-slate-700'
            }`}
          />
        ))}
      </div>

      {/* แผงปุ่มกด Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleNumberClick(num)}
            className="h-14 bg-slate-800/80 hover:bg-slate-700 active:scale-95 transition rounded-2xl text-lg font-semibold text-slate-200 flex items-center justify-center shadow-md cursor-pointer"
          >
            {num}
          </button>
        ))}

        <div />
        <button
          key="0"
          type="button"
          onClick={() => handleNumberClick('0')}
          className="h-14 bg-slate-800/80 hover:bg-slate-700 active:scale-95 transition rounded-2xl text-lg font-semibold text-slate-200 flex items-center justify-center shadow-md cursor-pointer"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="h-14 bg-slate-800/40 hover:bg-slate-800 active:scale-95 transition rounded-2xl text-slate-400 hover:text-red-400 flex items-center justify-center cursor-pointer"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};