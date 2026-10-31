import React, { useState } from 'react';
import { Key, Delete } from 'lucide-react';
import type { User } from 'firebase/auth';

interface UnlockScreenProps {
  user: User;
  onUnlock: (password: string) => void;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({ user, onUnlock }) => {
  const [pin, setPin] = useState('');
  const PIN_LENGTH = 6; // กำหนดความยาว PIN เช่น 6 หลัก

  // กดปุ่มตัวเลข
  const handleNumberClick = (num: string) => {
    if (pin.length < PIN_LENGTH) {
      const newPin = pin + num;
      setPin(newPin);
      
      // ถ้ากรอกครบตามจำนวนหลักที่กำหนด ให้ส่งค่าไปปลดล็อกอัตโนมัติทันที
      if (newPin.length === PIN_LENGTH) {
        onUnlock(newPin);
      }
    }
  };

  // ลบตัวเลขตัวสุดท้าย
  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="flex-1 flex flex-col justify-between items-center text-center p-6 select-none">
      {/* ส่วนหัวข้อ */}
      <div className="pt-4">
        <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-400 shadow-inner">
          <Key className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-bold mb-1">Enter Master PIN</h1>
        <p className="text-xs text-slate-400 max-w-[260px] leading-relaxed">
          สวัสดีคุณ {user.displayName || user.email} <br />
          กรอก PIN {PIN_LENGTH} หลักเพื่อปลดล็อก Password Wallet
        </p>
      </div>

      {/* จุดแสดงสถานะ PIN ที่กรอก */}
      <div className="flex justify-center items-center gap-3 my-6">
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
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-4">
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

        {/* แถวสุดท้าย: ปุ่มว่าง / เลข 0 / ปุ่มลบ */}
        <div /> {/* ช่องว่างมุมซ้ายล่าง */}
        <button
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