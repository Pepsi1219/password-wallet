import React, { useState } from 'react';
import { Delete, KeyRound, ShieldAlert } from 'lucide-react';
import type { User } from 'firebase/auth';
import { RecoveryKeyScreen } from './RecoveryKeyScreen';
import { t } from '../i18n';
import type { Language } from '../i18n';

interface SetupPinScreenProps {
  user: User;
  language: Language;
  onPinCreated: (pin: string) => Promise<string | null>;
  onRecoverySaved: () => Promise<boolean>;
}

export const SetupPinScreen: React.FC<SetupPinScreenProps> = ({ user, language, onPinCreated, onRecoverySaved }) => {
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [tempPin, setTempPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
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
      setPinError(t(language, 'pinMismatch'));
      return;
    }

    setIsSaving(true);
    const newRecoveryKey = await onPinCreated(newPin);
    setIsSaving(false);
    if (!newRecoveryKey) {
      setPin('');
      setPinError(t(language, 'pinSaveFailed'));
      return;
    }
    setRecoveryKey(newRecoveryKey);
  };

  const handleDelete = () => {
    if (isSaving) return;
    setPin(pin.slice(0, -1));
    setPinError('');
  };

  if (recoveryKey) {
    return (
      <RecoveryKeyScreen
        recoveryKey={recoveryKey}
        language={language}
        onContinue={onRecoverySaved}
      />
    );
  }

  return (
    <div className="pin-screen">
      <section className="pin-heading">
        <div className="pin-icon"><KeyRound /></div>
        <p className="pin-step">{t(language, step === 'create' ? 'stepOne' : 'stepTwo')}</p>
        <h1>{t(language, step === 'create' ? 'createPinTitle' : 'confirmPinTitle')}</h1>
        <p className="pin-account">{user.displayName || user.email}</p>
        <p className="pin-description">
          {t(language, step === 'create' ? 'createPinDescription' : 'confirmPinDescription')}
        </p>
        {step === 'create' && (
          <div className="pin-warning">
            <ShieldAlert />
            <span>{t(language, 'pinWarning')}</span>
          </div>
        )}
      </section>

      {pinError && <p role="alert" className="pin-error">{pinError}</p>}
      <div className="pin-indicators" aria-label={t(language, 'digitsEntered', { count: pin.length })}>
        {Array.from({ length: PIN_LENGTH }).map((_, index) => (
          <span key={index} className={`pin-indicator ${index < pin.length ? 'is-filled' : ''}`} />
        ))}
      </div>

      <div className="pin-keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button key={num} type="button" onClick={() => handleNumberClick(num)} disabled={isSaving} className="pin-key">
            {num}
          </button>
        ))}
        <div />
        <button type="button" onClick={() => handleNumberClick('0')} disabled={isSaving} className="pin-key">0</button>
        <button type="button" onClick={handleDelete} disabled={isSaving} aria-label={t(language, 'deleteLastDigit')} className="pin-key pin-key-delete">
          {isSaving ? <span className="pin-saving">{t(language, 'saving')}</span> : <Delete />}
        </button>
      </div>
    </div>
  );
};
