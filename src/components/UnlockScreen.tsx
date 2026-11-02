import React, { useState } from 'react';
import { Delete, KeyRound } from 'lucide-react';
import type { User } from 'firebase/auth';
import { t } from '../i18n';
import type { Language } from '../i18n';

interface UnlockScreenProps {
  user: User;
  language: Language;
  onUnlock: (password: string) => Promise<boolean>;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({ user, language, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const PIN_LENGTH = 6; // กำหนดความยาว PIN เช่น 6 หลัก

  // กดปุ่มตัวเลข
  const handleNumberClick = async (num: string) => {
    if (isChecking || pin.length >= PIN_LENGTH) return;

    const newPin = pin + num;
    setPin(newPin);
    setPinError('');

    if (newPin.length === PIN_LENGTH) {
      setIsChecking(true);
      const unlocked = await onUnlock(newPin);
      setIsChecking(false);
      if (!unlocked) {
        setPin('');
        setPinError(t(language, 'pinIncorrect'));
      }
    }
  };

  // ลบตัวเลขตัวสุดท้าย
  const handleDelete = () => {
    if (isChecking) return;
    setPin(pin.slice(0, -1));
    setPinError('');
  };

  return (
    <div className="pin-screen">
      <section className="pin-heading">
        <div className="pin-icon"><KeyRound /></div>
        <p className="pin-step">{t(language, 'privateVault')}</p>
        <h1>{t(language, 'welcomeBack')}</h1>
        <p className="pin-account">{user.displayName || user.email}</p>
        <p className="pin-description">{t(language, 'unlockPrompt')}</p>
      </section>

      <div className="pin-indicators" aria-label={t(language, 'digitsEntered', { count: pin.length })}>
        {Array.from({ length: PIN_LENGTH }).map((_, index) => (
          <span
            key={index}
            className={`pin-indicator ${
              index < pin.length
                ? 'is-filled'
                : ''
            }`}
          />
        ))}
      </div>
      {pinError && <p role="alert" className="pin-error">{pinError}</p>}

      <div className="pin-keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleNumberClick(num)}
            disabled={isChecking}
            className="pin-key"
          >
            {num}
          </button>
        ))}

        {/* แถวสุดท้าย: ปุ่มว่าง / เลข 0 / ปุ่มลบ */}
        <div /> {/* ช่องว่างมุมซ้ายล่าง */}
        <button
          type="button"
          onClick={() => handleNumberClick('0')}
          disabled={isChecking}
          className="pin-key"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isChecking}
          aria-label={t(language, 'deleteLastDigit')}
          className="pin-key pin-key-delete"
        >
          <Delete />
        </button>
      </div>
    </div>
  );
};