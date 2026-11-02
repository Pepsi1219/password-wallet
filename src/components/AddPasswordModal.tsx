import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { KeyRound, X } from 'lucide-react';
import { t } from '../i18n';
import type { Language } from '../i18n';

interface AddPasswordModalProps {
  userId: string; // รับ userId มาเพื่อดึงรายการที่เคยบันทึกไว้ของผู้ใช้คนนี้
  language: Language;
  onClose: () => void;
  onAdd: (title: string, username: string, pass: string, note: string) => void;
}

const DEFAULT_PRESETS = ['Google', 'GitHub', 'Microsoft'];

export const AddPasswordModal: React.FC<AddPasswordModalProps> = ({ userId, language, onClose, onAdd }) => {
  const [selectedPreset, setSelectedPreset] = useState('Google');
  const [customTitle, setCustomTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [note, setNote] = useState('');
  
  // รายการตัวเลือกทั้งหมด (Preset + ของที่เคยบันทึกไว้)
  const [availableOptions, setAvailableOptions] = useState<string[]>(DEFAULT_PRESETS);

  // ดึงรายการ Website Name ที่ผู้ใช้เคยบันทึกไว้ใน Firestore มาผูกเป็นตัวเลือกเพิ่มเติม
  useEffect(() => {
    const fetchUserHistory = async () => {
      try {
        const q = query(collection(db, 'vault_items'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const savedTitles = new Set<string>(DEFAULT_PRESETS);
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.title) savedTitles.add(data.title);
        });

        setAvailableOptions(Array.from(savedTitles));
      } catch (error) {
        console.error('Error fetching history:', error);
      }
    };

    if (userId) fetchUserHistory();
  }, [userId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = selectedPreset === 'Custom...' ? customTitle : selectedPreset;

    if (!finalTitle || !username || !password) {
      alert(t(language, 'requiredFields'));
      return;
    }
    onAdd(finalTitle, username, password, note);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="add-password-title" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-grabber" />
        <header className="modal-heading">
          <span className="modal-heading-icon"><KeyRound /></span>
          <div>
            <p>{t(language, 'newEntry')}</p>
            <h2 id="add-password-title">{t(language, 'addAccount')}</h2>
          </div>
          <button type="button" className="row-icon-button modal-close" onClick={onClose} aria-label={t(language, 'cancel')}>
            <X />
          </button>
        </header>
        <p className="modal-description">{t(language, 'addAccountDescription')}</p>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field">
            <label htmlFor="account-preset">{t(language, 'accountName')}</label>
            <select id="account-preset" value={selectedPreset} onChange={(event) => setSelectedPreset(event.target.value)} className="form-control">
              {availableOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              <option value="Custom...">{t(language, 'other')}</option>
            </select>
            {selectedPreset === 'Custom...' && (
              <input
                type="text"
                placeholder={t(language, 'websitePlaceholder')}
                value={customTitle}
                onChange={(event) => setCustomTitle(event.target.value)}
                className="form-control custom-title-input"
                autoFocus
              />
            )}
          </div>

          <div className="form-field">
            <label htmlFor="account-username">{t(language, 'usernameOrEmail')}</label>
            <input id="account-username" type="text" placeholder={t(language, 'usernamePlaceholder')} value={username} onChange={(event) => setUsername(event.target.value)} className="form-control" autoComplete="username" />
          </div>

          <div className="form-field">
            <label htmlFor="account-password">{t(language, 'passwordLabel')}</label>
            <input id="account-password" type="password" placeholder={t(language, 'passwordPlaceholder')} value={password} onChange={(event) => setPassword(event.target.value)} className="form-control" autoComplete="new-password" />
          </div>

          <div className="form-field">
            <label htmlFor="account-note">{t(language, 'noteLabel')} <span>{t(language, 'optional')}</span></label>
            <input id="account-note" type="text" placeholder={t(language, 'notePlaceholder')} value={note} onChange={(event) => setNote(event.target.value)} className="form-control" />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="button-secondary">{t(language, 'cancel')}</button>
            <button type="submit" className="button-primary">{t(language, 'saveToWallet')}</button>
          </div>
        </form>
      </section>
    </div>
  );
};