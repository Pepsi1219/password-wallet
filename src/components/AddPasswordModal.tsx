import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface AddPasswordModalProps {
  userId: string; // รับ userId มาเพื่อดึงรายการที่เคยบันทึกไว้ของผู้ใช้คนนี้
  onClose: () => void;
  onAdd: (title: string, username: string, pass: string, note: string) => void;
}

const DEFAULT_PRESETS = ['Google', 'GitHub', 'Microsoft'];

export const AddPasswordModal: React.FC<AddPasswordModalProps> = ({ userId, onClose, onAdd }) => {
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
      alert('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน');
      return;
    }
    onAdd(finalTitle, username, password, note);
  };

  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <h3 className="text-lg font-bold mb-4">Add Password</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Account / Website Name</label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 mb-2"
            >
              {availableOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              <option value="Custom...">อื่น ๆ (ระบุเอง)...</option>
            </select>

            {selectedPreset === 'Custom...' && (
              <input
                type="text"
                placeholder="ระบุชื่อเว็บไซต์หรือแอป..."
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Username / Email</label>
            <input
              type="text"
              placeholder="user@example.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Password</label>
            <input
              type="password"
              placeholder="Secret password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Note (หมายเหตุเพิ่มเติม)</label>
            <input
              type="text"
              placeholder="เช่น PIN สำรอง, คำถามกันลืม"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-medium rounded-xl transition cursor-pointer"
            >
              Save & Encrypt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};