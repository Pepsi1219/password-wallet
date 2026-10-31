import React, { useState } from 'react';
import { Plus, Key, Copy, Trash2, Edit3, FileText, X } from 'lucide-react';
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

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto relative">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-300">Password Wallet</h2>
          <p className="text-[10px] text-slate-500">{user.email}</p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 transition rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading wallet...</div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center">
          <Key className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">ยังไม่มีรหัสผ่านใน Wallet</p>
          <p className="text-xs text-slate-600 mt-1">กดปุ่ม Add New ด้านบนเพื่อเริ่มบันทึก</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.note) setActiveNote(item.note);
              }}
              className={`p-4 bg-slate-800/60 border border-slate-800 rounded-2xl flex flex-col gap-2 transition ${
                item.note ? 'cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/80' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    {item.note && (
                      <span className="flex items-center gap-1 text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded-md">
                        <FileText className="w-3 h-3" /> Note
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{item.username}</p>
                </div>
                
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onOpenEditModal(item)}
                    className="text-slate-500 hover:text-indigo-400 transition p-1.5 cursor-pointer"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="text-slate-500 hover:text-red-400 transition p-1.5 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs font-mono text-indigo-300">
                  {decryptedPasswords[item.id] ? decryptedPasswords[item.id] : '••••••••••••'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => handleToggleDecrypt(item, e)}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-xs rounded-lg transition cursor-pointer"
                  >
                    {decryptedPasswords[item.id] ? 'Hide' : 'Reveal'}
                  </button>
                  {decryptedPasswords[item.id] && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(decryptedPasswords[item.id]);
                        alert('คัดลอกรหัสผ่านแล้ว!');
                      }}
                      className="p-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 rounded-lg transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Modal สไตล์แผ่นกระดาษโพสต์อิทสีเหลืองอ่อน */}
      {activeNote && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fadeIn">
          <div className="w-full max-w-xs bg-amber-100 text-slate-900 rounded-2xl p-6 shadow-2xl relative rotate-1 transform transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-4 bg-amber-300/60 rounded-sm"></div>
            <div className="flex justify-between items-center mb-3 border-b border-amber-300 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Secure Note
              </span>
              <button
                onClick={() => setActiveNote(null)}
                className="text-amber-900 hover:text-red-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed min-h-[80px]">
              {activeNote}
            </p>
            <div className="mt-4 text-right">
              <button
                onClick={() => setActiveNote(null)}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-xl shadow transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};