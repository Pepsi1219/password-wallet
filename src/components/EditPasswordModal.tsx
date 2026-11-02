import React, { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import type { WalletItem } from './Dashboard';
import { t } from '../i18n';
import type { Language } from '../i18n';

interface EditPasswordModalProps {
  item: WalletItem;
  language: Language;
  onClose: () => void;
  onUpdate: (id: string, title: string, username: string, newPassword: string | null, note: string) => void;
}

export const EditPasswordModal: React.FC<EditPasswordModalProps> = ({ item, language, onClose, onUpdate }) => {
  const [title, setTitle] = useState(item.title);
  const [username, setUsername] = useState(item.username);
  const [password, setPassword] = useState(''); // ถ้าเว้นว่างไว้ จะแปลว่าไม่เปลี่ยนรหัสผ่านเดิม
  const [note, setNote] = useState(item.note || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !username) {
      alert(t(language, 'accountNameRequired'));
      return;
    }
    onUpdate(item.id, title, username, password ? password : null, note);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="edit-password-title" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-grabber" />
        <header className="modal-heading">
          <span className="modal-heading-icon"><Pencil /></span>
          <div>
            <p>{t(language, 'accountDetails')}</p>
            <h2 id="edit-password-title">{t(language, 'editAccount')}</h2>
          </div>
          <button type="button" className="row-icon-button modal-close" onClick={onClose} aria-label={t(language, 'cancel')}>
            <X />
          </button>
        </header>
        <p className="modal-description">{t(language, 'editDescription')}</p>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field">
            <label htmlFor="edit-account-title">{t(language, 'accountName')}</label>
            <input id="edit-account-title" type="text" value={title} onChange={(event) => setTitle(event.target.value)} className="form-control" />
          </div>

          <div className="form-field">
            <label htmlFor="edit-account-username">{t(language, 'usernameOrEmail')}</label>
            <input id="edit-account-username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} className="form-control" autoComplete="username" />
          </div>

          <div className="form-field">
            <label htmlFor="edit-account-password">{t(language, 'newPassword')} <span>{t(language, 'leaveBlankToKeep')}</span></label>
            <input id="edit-account-password" type="password" placeholder={t(language, 'newPasswordPlaceholder')} value={password} onChange={(event) => setPassword(event.target.value)} className="form-control" autoComplete="new-password" />
          </div>

          <div className="form-field">
            <label htmlFor="edit-account-note">{t(language, 'noteLabel')} <span>{t(language, 'optional')}</span></label>
            <input id="edit-account-note" type="text" value={note} onChange={(event) => setNote(event.target.value)} className="form-control" />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="button-secondary">{t(language, 'cancel')}</button>
            <button type="submit" className="button-primary">{t(language, 'saveChanges')}</button>
          </div>
        </form>
      </section>
    </div>
  );
};