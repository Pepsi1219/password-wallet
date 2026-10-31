import { useState, useEffect } from 'react';
import { ShieldCheck, Unlock, LogOut } from 'lucide-react';
import { encryptData, decryptData } from './services/crypto';
import { db, auth, googleProvider } from './services/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, where, limit } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';

// นำเข้า Components
import { LoginScreen } from './components/LoginScreen';
import { UnlockScreen } from './components/UnlockScreen';
import { SetupPinScreen } from './components/SetupPinScreen';
import { Dashboard } from './components/Dashboard';
import type { WalletItem } from './components/Dashboard';
import { AddPasswordModal } from './components/AddPasswordModal';
import { EditPasswordModal } from './components/EditPasswordModal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // สถานะตรวจสอบว่าผู้ใช้เคยตั้ง PIN หรือยัง
  const [hasPinConfigured, setHasPinConfigured] = useState<boolean | null>(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [walletItems, setWalletItems] = useState<WalletItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        await checkUserPinStatus(currentUser.uid);
      } else {
        setHasPinConfigured(null);
        setIsUnlocked(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ตรวจสอบว่าผู้ใช้คนนี้เคยบันทึกข้อมูล (หมายถึงเคยตั้ง PIN แล้ว) ใน Firestore หรือยัง
  const checkUserPinStatus = async (uid: string) => {
    try {
      const q = query(collection(db, 'vault_items'), where('userId', '==', uid), limit(1));
      const querySnapshot = await getDocs(q);
      // ถ้ามีข้อมูลอย่างน้อย 1 รายการ แปลว่าเคยตั้งค่า PIN และมี Key ผูกไว้แล้ว
      setHasPinConfigured(!querySnapshot.empty);
    } catch (error) {
      console.error('Error checking PIN status:', error);
      setHasPinConfigured(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      alert('ไม่สามารถเข้าสู่ระบบด้วย Google ได้');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsUnlocked(false);
      setMasterPassword('');
      setHasPinConfigured(null);
      setWalletItems([]);
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  // เมื่อผู้ใช้ใหม่สร้าง PIN สำเร็จ (สร้างรายการจำลองชั่วคราวเพื่อบันทึก Salt/Key ล็อกระบบ หรือพร้อมใช้งาน)
  const handlePinCreated = async (pin: string) => {
    setMasterPassword(pin);
    setHasPinConfigured(true);
    setIsUnlocked(true);
    if (user) fetchWallet(user.uid);
  };

  const handleUnlock = (pin: string) => {
    setMasterPassword(pin);
    setIsUnlocked(true);
    if (user) fetchWallet(user.uid);
  };

  const fetchWallet = async (uid: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, 'vault_items'), where('userId', '==', uid));
      const querySnapshot = await getDocs(q);
      const items: WalletItem[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          title: data.title,
          username: data.username,
          ciphertext: data.ciphertext,
          salt: data.salt,
          iv: data.iv,
          note: data.note || '',
        });
      });
      setWalletItems(items);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPassword = async (title: string, username: string, pass: string) => {
    if (!user) return;
    try {
      const encrypted = await encryptData(pass, masterPassword);

      await addDoc(collection(db, 'vault_items'), {
        userId: user.uid,
        title,
        username,
        ciphertext: encrypted.ciphertext,
        salt: encrypted.salt,
        iv: encrypted.iv,
        note: '', // เพิ่มฟิลด์ note เป็นค่าว่างเริ่มต้น
        createdAt: serverTimestamp(),
      });

      // หลังจากเพิ่มไอเท็มแรกสำเร็จ ถือว่าคอนฟิก PIN สมบูรณ์แล้ว
      setHasPinConfigured(true);
      setShowAddModal(false);
      fetchWallet(user.uid);
    } catch (error) {
      console.error('Error adding password:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleDecryptItem = async (item: WalletItem): Promise<string | null> => {
    try {
      const decrypted = await decryptData(
        {
          ciphertext: item.ciphertext,
          salt: item.salt,
          iv: item.iv,
        },
        masterPassword
      );
      return decrypted;
    } catch (error) {
      alert('Master PIN ไม่ถูกต้อง ไม่สามารถถอดรหัสได้');
      return null;
    }
  };

  const [editingItem, setEditingItem] = useState<WalletItem | null>(null);

  const handleUpdatePassword = async (id: string, title: string, username: string, newPassword: string | null, note: string) => {
  if (!user) return;
  try {
    const updateData: any = {
      title,
      username,
      note,
    };

    // ถ้ารหัสผ่านใหม่ถูกกรอก ให้ทำการเข้ารหัสใหม่ทับของเดิม
    if (newPassword) {
      const encrypted = await encryptData(newPassword, masterPassword);
      updateData.ciphertext = encrypted.ciphertext;
      updateData.salt = encrypted.salt;
      updateData.iv = encrypted.iv;
    }

    await updateDoc(doc(db, 'vault_items', id), updateData);

    setEditingItem(null);
    fetchWallet(user.uid);
  } catch (error) {
    console.error('Error updating password:', error);
    alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
  }
};

  const handleDelete = async (id: string) => {
    if (confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?') && user) {
      try {
        await deleteDoc(doc(db, 'vault_items', id));
        fetchWallet(user.uid);
        // เช็กสถานะ PIN ใหม่หลังลบ
        checkUserPinStatus(user.uid);
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  if (authLoading || (user && hasPinConfigured === null)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading Personal Password Wallet...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      {/* Container มือถือ iOS Style */}
      <div className="w-full max-w-md h-[844px] bg-slate-900 border border-slate-800 rounded-[40px] shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span className="font-bold text-base tracking-tight">Password Wallet</span>
          </div>
          
          {user && (
            <div className="flex items-center gap-2">
              {isUnlocked && (
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-medium flex items-center gap-1">
                  <Unlock className="w-3 h-3" /> Unlocked
                </span>
              )}
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-red-400 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Screens Flow */}
        {!user ? (
          <LoginScreen onGoogleLogin={handleGoogleLogin} />
        ) : !hasPinConfigured ? (
          /* กรณีผู้ใช้ใหม่ยังไม่เคยตั้ง PIN ให้บังคับสร้างก่อน */
          <SetupPinScreen user={user} onPinCreated={handlePinCreated} />
        ) : !isUnlocked ? (
          /* กรณีเคยตั้งแล้ว แต่ยังไม่ปลดล็อก แสดงหน้าใส่ PIN ปกติ */
          <UnlockScreen user={user} onUnlock={handleUnlock} />
        ) : (
          /* ปลดล็อกสำเร็จแสดง Dashboard */
          <Dashboard
            user={user}
            items={walletItems}
            loading={loading}
            onOpenAddModal={() => setShowAddModal(true)}
            onOpenEditModal={(item) => setEditingItem(item)} // <-- เติมบรรทัดนี้เพิ่มเข้าไปครับ
            onDelete={handleDelete}
            onDecryptItem={handleDecryptItem}
          />
        )}

        {/* Modal เพิ่มรหัสผ่าน */}
        {showAddModal && user && (
          <AddPasswordModal
            userId={user.uid}
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddPassword}
          />
        )}

        {/* Modal แก้ไขรหัสผ่าน */}
        {editingItem && (
          <EditPasswordModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onUpdate={handleUpdatePassword}
          />
        )}

      </div>
    </div>
  );
}