import React, { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import type { WalletItem } from './Dashboard';

interface EditPasswordModalProps {
  item: WalletItem;
  onClose: () => void;
  onUpdate: (id: string, title: string, username: string, newPassword: string | null, note: string) => void;
}

export const EditPasswordModal: React.FC<EditPasswordModalProps> = ({ item, onClose, onUpdate }) => {
  const [title, setTitle] = useState(item.title);
  const [username, setUsername] = useState(item.username);
  const [password, setPassword] = useState(''); // ถ้าเว้นว่างไว้ จะแปลว่าไม่เปลี่ยนรหัสผ่านเดิม
  const [note, setNote] = useState(item.note || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !username) {
      alert('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน');
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
            <p>ACCOUNT DETAILS</p>
            <h2 id="edit-password-title">Edit account</h2>
          </div>
          <button type="button" className="row-icon-button modal-close" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </header>
        <p className="modal-description">Changes are saved to your private wallet.</p>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field">
            <label htmlFor="edit-account-title">Account name</label>
            <input id="edit-account-title" type="text" value={title} onChange={(event) => setTitle(event.target.value)} className="form-control" />
          </div>

          <div className="form-field">
            <label htmlFor="edit-account-username">Username or email</label>
            <input id="edit-account-username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} className="form-control" autoComplete="username" />
          </div>

          <div className="form-field">
            <label htmlFor="edit-account-password">New password <span>Leave blank to keep current</span></label>
            <input id="edit-account-password" type="password" placeholder="Enter a new password" value={password} onChange={(event) => setPassword(event.target.value)} className="form-control" autoComplete="new-password" />
          </div>

          <div className="form-field">
            <label htmlFor="edit-account-note">Note <span>Optional</span></label>
            <input id="edit-account-note" type="text" value={note} onChange={(event) => setNote(event.target.value)} className="form-control" />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="button-secondary">Cancel</button>
            <button type="submit" className="button-primary">Save changes</button>
          </div>
        </form>
      </section>
    </div>
  );
};