import React, { useMemo, useState } from 'react';
import { Plus, KeyRound, Copy, Trash2, Pencil, FileText, X, Search, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import type { User } from 'firebase/auth';

export interface WalletItem {
  id: string;
  title: string;
  username: string;
  ciphertext: string;
  salt: string;
  iv: string;
  note?: string;
}

interface DashboardProps {
  user: User;
  items: WalletItem[];
  loading: boolean;
  onOpenAddModal: () => void;
  onOpenEditModal: (item: WalletItem) => void;
  onDelete: (id: string) => void;
  onDecryptItem: (item: WalletItem) => Promise<string | null>;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  items,
  loading,
  onOpenAddModal,
  onOpenEditModal,
  onDelete,
  onDecryptItem,
}) => {
  const [decryptedPasswords, setDecryptedPasswords] = useState<{ [key: string]: string }>({});
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.title, item.username, item.note].some((value) => value?.toLowerCase().includes(query))
    );
  }, [items, searchQuery]);

  const handleToggleDecrypt = async (item: WalletItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (decryptedPasswords[item.id]) {
      const copy = { ...decryptedPasswords };
      delete copy[item.id];
      setDecryptedPasswords(copy);
      return;
    }

    const decrypted = await onDecryptItem(item);
    if (decrypted) {
      setDecryptedPasswords({ ...decryptedPasswords, [item.id]: decrypted });
    }
  };

  const getMarkColor = (title: string) => {
    const colors = ['mint', 'peach', 'sky', 'lemon'];
    const colorIndex = Array.from(title).reduce((sum, character) => sum + character.charCodeAt(0), 0) % colors.length;
    return colors[colorIndex];
  };

  return (
    <section className="dashboard-screen">
      <div className="dashboard-scroll">
        <div className="dashboard-heading">
          <div>
            <p className="dashboard-eyebrow">YOUR PRIVATE COLLECTION</p>
            <h1>Passwords</h1>
            <p className="dashboard-subtitle">Everything you need, right where you left it.</p>
          </div>
          <button onClick={onOpenAddModal} className="add-entry-button" aria-label="Add password" title="Add password">
            <Plus />
          </button>
        </div>

        <div className="vault-summary">
          <div className="vault-summary-icon"><ShieldCheck /></div>
          <div className="vault-summary-copy">
            <strong>{items.length} {items.length === 1 ? 'account' : 'accounts'} saved</strong>
            <span>Secured for {user.displayName || 'your account'} with your Master PIN</span>
          </div>
          <span className="vault-summary-status">SECURE</span>
        </div>

        <label className="wallet-search">
          <Search />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search accounts"
            aria-label="Search accounts"
          />
          {searchQuery && (
            <button type="button" className="search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
              <X />
            </button>
          )}
        </label>

        <div className="list-heading">
          <h2>All accounts</h2>
          <span>{filteredItems.length}</span>
        </div>

        {loading ? (
          <div className="wallet-empty-state">
            <span className="empty-mark"><KeyRound /></span>
            <p>Loading your accounts...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="wallet-empty-state">
            <span className="empty-mark"><KeyRound /></span>
            <h3>{items.length === 0 ? 'Your wallet is ready' : 'No matches found'}</h3>
            <p>{items.length === 0 ? 'Add your first account to keep it close.' : 'Try a different name or email.'}</p>
            {items.length === 0 && (
              <button onClick={onOpenAddModal} className="text-action-button">
                <Plus /> Add an account
              </button>
            )}
          </div>
        ) : (
          <div className="credential-list">
            {filteredItems.map((item) => {
              const isRevealed = Boolean(decryptedPasswords[item.id]);
              return (
                <article key={item.id} className="credential-row">
                  <div className={`service-mark ${getMarkColor(item.title)}`} aria-hidden="true">
                    {item.title.trim().charAt(0).toUpperCase() || <KeyRound />}
                  </div>
                  <div className="credential-main">
                    <div className="credential-topline">
                      <div className="credential-identity">
                        <h3>{item.title}</h3>
                        <p>{item.username}</p>
                      </div>
                      <div className="credential-actions">
                        <button onClick={() => onOpenEditModal(item)} className="row-icon-button" aria-label={`Edit ${item.title}`} title="Edit">
                          <Pencil />
                        </button>
                        <button onClick={() => onDelete(item.id)} className="row-icon-button delete-action" aria-label={`Delete ${item.title}`} title="Delete">
                          <Trash2 />
                        </button>
                      </div>
                    </div>
                    <div className="credential-bottomline">
                      <span className={`credential-secret ${isRevealed ? 'revealed' : ''}`}>
                        {isRevealed ? decryptedPasswords[item.id] : '••••••••••••'}
                      </span>
                      <div className="secret-actions">
                        <button onClick={(event) => handleToggleDecrypt(item, event)} className="text-icon-button" aria-label={isRevealed ? 'Hide password' : 'Reveal password'}>
                          {isRevealed ? <EyeOff /> : <Eye />}
                          <span>{isRevealed ? 'Hide' : 'Reveal'}</span>
                        </button>
                        {isRevealed && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(decryptedPasswords[item.id]);
                              alert('คัดลอกรหัสผ่านแล้ว!');
                            }}
                            className="row-icon-button copy-action"
                            aria-label="Copy password"
                            title="Copy password"
                          >
                            <Copy />
                          </button>
                        )}
                        {item.note && (
                          <button onClick={() => setActiveNote(item.note || '')} className="note-indicator" aria-label="Open secure note" title="Secure note">
                            <FileText />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {activeNote && (
        <div className="note-overlay" onClick={() => setActiveNote(null)}>
          <section className="note-sheet" role="dialog" aria-modal="true" aria-label="Secure note" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-grabber" />
            <div className="note-sheet-heading">
              <span className="note-sheet-icon"><FileText /></span>
              <div><p>PRIVATE NOTE</p><h2>Secure note</h2></div>
              <button onClick={() => setActiveNote(null)} className="row-icon-button" aria-label="Close note"><X /></button>
            </div>
            <p className="note-sheet-content">{activeNote}</p>
          </section>
        </div>
      )}
    </section>
  );
};