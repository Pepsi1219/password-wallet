import React, { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { t } from '../i18n';
import type { Language } from '../i18n';

interface RecoveryKeyScreenProps {
  recoveryKey: string;
  language: Language;
  onContinue: () => Promise<boolean>;
}

export const RecoveryKeyScreen: React.FC<RecoveryKeyScreenProps> = ({ recoveryKey, language, onContinue }) => {
  const [copied, setCopied] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const handleContinue = async () => {
    setIsContinuing(true);
    const saved = await onContinue();
    setIsContinuing(false);
    if (!saved) window.alert(t(language, 'pinSaveFailed'));
  };

  return (
    <div className="pin-screen">
      <section className="pin-heading">
        <div className="pin-icon"><KeyRound /></div>
        <p className="pin-step">{t(language, 'recoveryTitle')}</p>
        <h1>{t(language, 'recoveryTitle')}</h1>
        <p className="pin-description">{t(language, 'recoveryDescription')}</p>
      </section>

      <div className="recovery-key-value" role="group" aria-label={t(language, 'recoveryKeyLabel')}>
        <code>{recoveryKey}</code>
        <button type="button" className="row-icon-button" onClick={handleCopy} aria-label={t(language, 'recoveryCopy')}>
          {copied ? <Check /> : <Copy />}
        </button>
      </div>
      <p className="pin-description">{t(language, copied ? 'recoveryCopied' : 'recoverySavedPrompt')}</p>
      <button type="button" className="button-primary recovery-continue-button" onClick={handleContinue} disabled={isContinuing}>
        {t(language, 'continueToWallet')}
      </button>
    </div>
  );
};
