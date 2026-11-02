import React, { useState } from 'react';
import { Delete, KeyRound, ShieldAlert } from 'lucide-react';
import type { User } from 'firebase/auth';

interface SetupPinScreenProps {
  user: User;
  onPinCreated: (pin: string) => Promise<boolean>;
}

export const SetupPinScreen: React.FC<SetupPinScreenProps> = ({ user, onPinCreated }) => {
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [tempPin, setTempPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const PIN_LENGTH = 6;

  const handleNumberClick = async (num: string) => {
    if (isSaving || pin.length >= PIN_LENGTH) return;

    const newPin = pin + num;
    setPin(newPin);
    setPinError('');

    if (newPin.length !== PIN_LENGTH) return;

    if (step === 'create') {
      setTempPin(newPin);
      setPin('');
      setStep('confirm');
      return;
    }

    if (newPin !== tempPin) {
      setPin('');
      setTempPin('');
      setStep('create');
      setPinError('PIN ไม่ตรงกัน กรุณาตั้งค่าใหม่อีกครั้ง');
      return;
    }

    setIsSaving(true);
    const saved = await onPinCreated(newPin);
    setIsSaving(false);
    if (!saved) {
      setPin('');
      setPinError('บันทึก PIN ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง');
    }
  };

  const handleDelete = () => {
    if (isSaving) return;
    setPin(pin.slice(0, -1));
    setPinError('');
  };

  return (
    <div className="pin-screen">
      <section className="pin-heading">
        <div className="pin-icon"><KeyRound /></div>
        <p className="pin-step">STEP {step === 'create' ? '01' : '02'} / 02</p>
        <h1>{step === 'create' ? 'Create your PIN' : 'Confirm your PIN'}</h1>
        <p className="pin-account">{user.displayName || user.email}</p>
        <p className="pin-description">
          {step === 'create'
            ? `ตั้ง PIN 6 หลักเพื่อปกป้อง Password Wallet ของคุณ`
            : 'กรอก PIN ชุดเดิมอีกครั้งเพื่อยืนยัน'}
        </p>

        {step === 'create' && (
          <div className="pin-warning">
            <ShieldAlert />
            <span>จำ PIN นี้ไว้ให้ดี หากลืมจะไม่สามารถกู้คืนได้</span>
          </div>
        )}
      </section>

      {pinError && <p role="alert" className="pin-error">{pinError}</p>}

      <div className="pin-indicators" aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}>
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

      <div className="pin-keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleNumberClick(num)}
            disabled={isSaving}
            className="pin-key"
          >
            {num}
          </button>
        ))}

        <div />
        <button
          key="0"
          type="button"
          onClick={() => handleNumberClick('0')}
          disabled={isSaving}
          className="pin-key"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isSaving}
          aria-label="Delete last digit"
          className="pin-key pin-key-delete"
        >
          {isSaving ? <span className="pin-saving">Saving</span> : <Delete />}
        </button>
      </div>
    </div>
  );
};