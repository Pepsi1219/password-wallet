import { useState, useEffect } from 'react';
import { ShieldCheck, Unlock, LogOut } from 'lucide-react';
import { encryptData, decryptData } from './services/crypto';
import { db, auth, googleProvider } from './services/firebase';
import { collection, addDoc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, limit } from 'firebase/firestore';
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

  // PIN verifier and existing wallet records are both stored in this user's vault.
  const checkUserPinStatus = async (uid: string) => {
    try {
      const q = query(collection(db, 'vault_items'), where('userId', '==', uid), limit(1));
      const querySnapshot = await getDocs(q);
      // ถ้ามีข้อมูลอย่างน้อย 1 รายการ แปลว่าเคยตั้งค่า PIN และมี Key ผูกไว้แล้ว
      setHasPinConfigured(!querySnapshot.empty);
    } catch (error) {
      console.error('Error checking PIN status:', error);
      setHasPinConfigured(true);
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

  const handlePinCreated = async (pin: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const verifier = await encryptData(`password-wallet-pin:v1:${user.uid}`, pin);
      await setDoc(doc(db, 'vault_items', `pin-verifier_${user.uid}`), {
        userId: user.uid,
        recordType: 'pin-verifier',
        ...verifier,
        createdAt: serverTimestamp(),
      });

      setMasterPassword(pin);
      setHasPinConfigured(true);
      setIsUnlocked(true);
      fetchWallet(user.uid);
      return true;
    } catch (error) {
      console.error('Error saving PIN verifier:', error);
      return false;
    }
  };

  const handleUnlock = async (pin: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const verifierRef = doc(db, 'vault_items', `pin-verifier_${user.uid}`);
      const verifierSnapshot = await getDoc(verifierRef);
      const verifierText = `password-wallet-pin:v1:${user.uid}`;

      if (verifierSnapshot.exists()) {
        const verifier = verifierSnapshot.data();
        const decryptedVerifier = await decryptData(
          { ciphertext: verifier.ciphertext, salt: verifier.salt, iv: verifier.iv },
          pin
        );
        if (decryptedVerifier !== verifierText) return false;
      } else {
        const q = query(collection(db, 'vault_items'), where('userId', '==', user.uid), limit(1));
        const querySnapshot = await getDocs(q);
        const legacyItem = querySnapshot.docs.find((item) => item.data().recordType !== 'pin-verifier');
        if (!legacyItem) return false;

        const data = legacyItem.data();
        await decryptData(
          { ciphertext: data.ciphertext, salt: data.salt, iv: data.iv },
          pin
        );

        const verifier = await encryptData(verifierText, pin);
        await setDoc(verifierRef, {
          userId: user.uid,
          recordType: 'pin-verifier',
          ...verifier,
          createdAt: serverTimestamp(),
        });
      }

      setMasterPassword(pin);
      setIsUnlocked(true);
      fetchWallet(user.uid);
      return true;
    } catch (error) {
      console.error('Error validating Master PIN:', error);
      return false;
    }
  };

  const fetchWallet = async (uid: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, 'vault_items'), where('userId', '==', uid));
      const querySnapshot = await getDocs(q);
      const items: WalletItem[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.recordType === 'pin-verifier') return;
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
      <div className="app-backdrop">
        <div className="loading-state">
          <span className="brand-emblem"><ShieldCheck /></span>
          <p>Opening your wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-backdrop">
      <div className="app-shell">
        <header className="app-header">
          <div className="brand-lockup">
            <span className="brand-emblem"><ShieldCheck /></span>
            <span className="brand-copy">
              <strong>Wallet</strong>
              <small>PERSONAL VAULT</small>
            </span>
          </div>

          {user && (
            <div className="session-controls">
              {isUnlocked && (
                <span className="session-badge">
                  <Unlock /> <span>Unlocked</span>
                </span>
              )}
              <button
                onClick={handleLogout}
                aria-label="Sign out"
                title="Sign out"
                className="icon-button signout-button"
              >
                <LogOut />
              </button>
            </div>
          )}
        </header>

        <main className="app-content">
          {!user ? (
            <LoginScreen onGoogleLogin={handleGoogleLogin} />
          ) : !hasPinConfigured ? (
            <SetupPinScreen user={user} onPinCreated={handlePinCreated} />
          ) : !isUnlocked ? (
            <UnlockScreen user={user} onUnlock={handleUnlock} />
          ) : (
            <Dashboard
              user={user}
              items={walletItems}
              loading={loading}
              onOpenAddModal={() => setShowAddModal(true)}
              onOpenEditModal={(item) => setEditingItem(item)}
              onDelete={handleDelete}
              onDecryptItem={handleDecryptItem}
            />
          )}

          {showAddModal && user && (
            <AddPasswordModal
              userId={user.uid}
              onClose={() => setShowAddModal(false)}
              onAdd={handleAddPassword}
            />
          )}

          {editingItem && (
            <EditPasswordModal
              item={editingItem}
              onClose={() => setEditingItem(null)}
              onUpdate={handleUpdatePassword}
            />
          )}
        </main>
      </div>
    </div>
  );
}