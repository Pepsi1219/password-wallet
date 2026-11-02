import React, { useMemo, useState } from 'react';
import { Plus, KeyRound, Copy, Trash2, Pencil, FileText, X, Search, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import type { User } from 'firebase/auth';
import { t } from '../i18n';
import type { Language } from '../i18n';

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
  language: Language;
  items: WalletItem[];
  loading: boolean;
  onOpenAddModal: () => void;
  onOpenEditModal: (item: WalletItem) => void;
  onDelete: (id: string) => void;
  onDecryptItem: (item: WalletItem) => Promise<string | null>;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  language,
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
            <p className="dashboard-eyebrow">{t(language, 'privateCollection')}</p>
            <h1>{t(language, 'passwords')}</h1>
            <p className="dashboard-subtitle">{t(language, 'dashboardSubtitle')}</p>
          </div>
          <button onClick={onOpenAddModal} className="add-entry-button" aria-label={t(language, 'addPassword')} title={t(language, 'addPassword')}>
            <Plus />
          </button>
        </div>

        <div className="vault-summary">
          <div className="vault-summary-icon"><ShieldCheck /></div>
          <div className="vault-summary-copy">
            <strong>{items.length === 1 ? t(language, 'accountSaved', { count: items.length }) : t(language, 'accountsSaved', { count: items.length })}</strong>
            <span>{t(language, 'securedFor', { name: user.displayName || (language === 'th' ? 'บัญชีของคุณ' : 'your account') })}</span>
          </div>
          <span className="vault-summary-status">{t(language, 'secure')}</span>
        </div>

        <label className="wallet-search">
          <Search />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t(language, 'searchAccounts')}
            aria-label={t(language, 'searchAccounts')}
          />
          {searchQuery && (
            <button type="button" className="search-clear" onClick={() => setSearchQuery('')} aria-label={t(language, 'clearSearch')}>
              <X />
            </button>
          )}
        </label>

        <div className="list-heading">
          <h2>{t(language, 'allAccounts')}</h2>
          <span>{filteredItems.length}</span>
        </div>

        {loading ? (
          <div className="wallet-empty-state">
            <span className="empty-mark"><KeyRound /></span>
            <p>{t(language, 'loadingAccounts')}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="wallet-empty-state">
            <span className="empty-mark"><KeyRound /></span>
            <h3>{items.length === 0 ? t(language, 'walletReady') : t(language, 'noMatches')}</h3>
            <p>{items.length === 0 ? t(language, 'firstAccountHint') : t(language, 'searchHint')}</p>
            {items.length === 0 && (
              <button onClick={onOpenAddModal} className="text-action-button">
                <Plus /> {t(language, 'addAccount')}
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
                        <button onClick={() => onOpenEditModal(item)} className="row-icon-button" aria-label={t(language, 'editNamedAccount', { name: item.title })} title={t(language, 'editAccount')}>
                          <Pencil />
                        </button>
                        <button onClick={() => onDelete(item.id)} className="row-icon-button delete-action" aria-label={t(language, 'deleteAccount', { name: item.title })} title={t(language, 'deleteAccount', { name: item.title })}>
                          <Trash2 />
                        </button>
                      </div>
                    </div>
                    <div className="credential-bottomline">
                      <span className={`credential-secret ${isRevealed ? 'revealed' : ''}`}>
                        {isRevealed ? decryptedPasswords[item.id] : '••••••••••••'}
                      </span>
                      <div className="secret-actions">
                        <button onClick={(event) => handleToggleDecrypt(item, event)} className="text-icon-button" aria-label={t(language, isRevealed ? 'hidePassword' : 'revealPassword')}>
                          {isRevealed ? <EyeOff /> : <Eye />}
                          <span>{t(language, isRevealed ? 'hidePassword' : 'revealPassword')}</span>
                        </button>
                        {isRevealed && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(decryptedPasswords[item.id]);
                              alert(t(language, 'copiedPassword'));
                            }}
                            className="row-icon-button copy-action"
                            aria-label={t(language, 'copyPassword')}
                            title={t(language, 'copyPassword')}
                          >
                            <Copy />
                          </button>
                        )}
                        {item.note && (
                          <button onClick={() => setActiveNote(item.note || '')} className="note-indicator" aria-label={t(language, 'openNote')} title={t(language, 'secureNote')}>
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
          <section className="note-sheet" role="dialog" aria-modal="true" aria-label={t(language, 'secureNote')} onClick={(event) => event.stopPropagation()}>
            <div className="sheet-grabber" />
            <div className="note-sheet-heading">
              <span className="note-sheet-icon"><FileText /></span>
              <div><p>{t(language, 'privateNote')}</p><h2>{t(language, 'secureNote')}</h2></div>
              <button onClick={() => setActiveNote(null)} className="row-icon-button" aria-label={t(language, 'closeNote')}><X /></button>
            </div>
            <p className="note-sheet-content">{activeNote}</p>
          </section>
        </div>
      )}
    </section>
  );
};