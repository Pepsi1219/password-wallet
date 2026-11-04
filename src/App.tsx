import { useState, useEffect } from 'react';
import { ShieldCheck, Unlock, LogOut, Moon, Sun, Languages } from 'lucide-react';
import {
  createRecoveryKey,
  createVaultKey,
  decryptData,
  decryptWithVaultKey,
  encryptWithVaultKey,
  normalizeRecoveryKey,
  unwrapVaultKey,
  wrapVaultKey,
} from './services/crypto';
import { db, auth, googleProvider } from './services/firebase';
import { collection, getDocs, getDoc, setDoc, updateDoc, doc, serverTimestamp, query, where, limit, writeBatch, increment } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';

// นำเข้า Components
import { LoginScreen } from './components/LoginScreen';
import { UnlockScreen } from './components/UnlockScreen';
import { SetupPinScreen } from './components/SetupPinScreen';
import { Dashboard } from './components/Dashboard';
import type { WalletCategory, WalletItem } from './components/Dashboard';
import { AddPasswordModal } from './components/AddPasswordModal';
import { EditPasswordModal } from './components/EditPasswordModal';
import { RecoveryKeyScreen } from './components/RecoveryKeyScreen';
import { t } from './i18n';
import type { Language } from './i18n';

type Theme = 'light' | 'dark';

function readPreference<T extends string>(key: string, values: readonly T[], fallback: T): T {
  try {
    const storedValue = localStorage.getItem(key);
    if (storedValue && values.includes(storedValue as T)) return storedValue as T;
  } catch {
    // Keep the app usable when browser storage is unavailable.
  }
  return fallback;
}

function categoryDocumentId(uid: string, title: string): string {
  return `${encodeURIComponent(uid)}_${encodeURIComponent(title)}`;
}

export default function App() {
  const [language, setLanguage] = useState<Language>(() => readPreference('wallet-language', ['en', 'th'], 'en'));
  const [theme, setTheme] = useState<Theme>(() => readPreference('wallet-theme', ['light', 'dark'], 'light'));
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // สถานะตรวจสอบว่าผู้ใช้เคยตั้ง PIN หรือยัง
  const [hasPinConfigured, setHasPinConfigured] = useState<boolean | null>(null);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [recoveryKeyPending, setRecoveryKeyPending] = useState<string | null>(null);
  const [pendingSetup, setPendingSetup] = useState<{
    userId: string;
    pinKeyWrap: Awaited<ReturnType<typeof wrapVaultKey>>;
    recoveryKeyWrap: Awaited<ReturnType<typeof wrapVaultKey>>;
  } | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [walletCategories, setWalletCategories] = useState<WalletCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [walletItems, setWalletItems] = useState<WalletItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0e1410' : '#155c45');
    document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute('content', theme === 'dark' ? 'black' : 'default');
    try {
      localStorage.setItem('wallet-language', language);
      localStorage.setItem('wallet-theme', theme);
    } catch {
      // Preferences remain active for this session if storage is unavailable.
    }
  }, [language, theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        await checkUserPinStatus(currentUser.uid);
      } else {
        setHasPinConfigured(null);
        setIsUnlocked(false);
        setVaultKey(null);
        setRecoveryKeyPending(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Keep the legacy vault-item check for users whose verifier has not been moved yet.
  const checkUserPinStatus = async (uid: string) => {
    try {
      const settingsSnapshot = await getDoc(doc(db, 'user_settings', uid));
      if (settingsSnapshot.exists()) {
        setHasPinConfigured(true);
        return;
      }

      const q = query(collection(db, 'vault_items'), where('userId', '==', uid), limit(1));
      const querySnapshot = await getDocs(q);
      // ถ้ามีข้อมูลอย่างน้อย 1 รายการ แปลว่าเคยตั้งค่า PIN และมี Key ผูกไว้แล้ว
      setHasPinConfigured(!querySnapshot.empty);
    } catch (error) {
      console.error('Error checking PIN status:', error);
      setHasPinConfigured(true);
    }
  };

  const fetchCategories = async (uid: string) => {
    setLoading(true);
    try {
      const categoriesQuery = query(collection(db, 'vault_categories'), where('userId', '==', uid));
      const categoriesSnapshot = await getDocs(categoriesQuery);
      if (!categoriesSnapshot.empty) {
        setWalletCategories(categoriesSnapshot.docs.map((categoryDoc) => ({
          id: categoryDoc.id,
          title: categoryDoc.data().title,
          itemCount: categoryDoc.data().itemCount || 0,
        })));
        return;
      }

      const vaultSnapshot = await getDocs(query(collection(db, 'vault_items'), where('userId', '==', uid)));
      const groupedItems = new Map<string, { title: string; itemCount: number }>();
      vaultSnapshot.docs.forEach((itemDoc) => {
        const data = itemDoc.data();
        if (data.recordType === 'pin-verifier' || typeof data.title !== 'string' || !data.title) return;
        const current = groupedItems.get(data.title);
        if (current) current.itemCount += 1;
        else groupedItems.set(data.title, { title: data.title, itemCount: 1 });
      });

      const categories = Array.from(groupedItems, ([title, value]) => ({
        id: categoryDocumentId(uid, title),
        ...value,
      }));
      for (let offset = 0; offset < categories.length; offset += 500) {
        const batch = writeBatch(db);
        categories.slice(offset, offset + 500).forEach((category) => {
          batch.set(doc(db, 'vault_categories', category.id), {
            userId: uid,
            title: category.title,
            itemCount: category.itemCount,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
      setWalletCategories(categories);
    } catch (error) {
      console.error('Error fetching wallet categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryItems = async (uid: string, title: string) => {
    setSelectedCategory(title);
    setLoading(true);
    try {
      const q = query(
        collection(db, 'vault_items'),
        where('userId', '==', uid),
        where('title', '==', title)
      );
      const querySnapshot = await getDocs(q);
      const items: WalletItem[] = querySnapshot.docs
        .filter((itemDoc) => itemDoc.data().recordType !== 'pin-verifier')
        .map((itemDoc) => {
          const data = itemDoc.data();
          return {
            id: itemDoc.id,
            title: data.title,
            username: data.username,
            ciphertext: data.ciphertext,
            salt: data.salt || '',
            iv: data.iv,
            note: data.note || '',
            cryptoVersion: data.cryptoVersion,
          };
        });
      setWalletItems(items);
    } catch (error) {
      console.error('Error fetching category items:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCategoryCountInState = (title: string, change: number) => {
    if (!user) return;
    const categoryId = categoryDocumentId(user.uid, title);
    setWalletCategories((current) => {
      const existing = current.find((category) => category.id === categoryId);
      if (existing && existing.itemCount + change <= 0) {
        return current.filter((category) => category.id !== categoryId);
      }
      if (existing) {
        return current.map((category) => category.id === categoryId
          ? { ...category, itemCount: category.itemCount + change }
          : category);
      }
      return change > 0 ? [...current, { id: categoryId, title, itemCount: change }] : current;
    });
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      alert(t(language, 'signInFailed'));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsUnlocked(false);
      setVaultKey(null);
      setRecoveryKeyPending(null);
      setWalletCategories([]);
      setSelectedCategory(null);
      setWalletItems([]);
      setPendingSetup(null);
      setHasPinConfigured(null);
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  const handlePinCreated = async (pin: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const newVaultKey = await createVaultKey();
      const recoveryKey = createRecoveryKey();
      const [pinKeyWrap, recoveryKeyWrap] = await Promise.all([
        wrapVaultKey(newVaultKey, pin),
        wrapVaultKey(newVaultKey, recoveryKey),
      ]);

      setVaultKey(newVaultKey);
      setPendingSetup({ userId: user.uid, pinKeyWrap, recoveryKeyWrap });
      return recoveryKey;
    } catch (error) {
      console.error('Error saving vault keys:', error);
      return null;
    }
  };

  const handleRecoveryAcknowledged = async (): Promise<boolean> => {
    if (!user || !vaultKey) return false;
    try {
      if (pendingSetup) {
        await setDoc(doc(db, 'user_settings', pendingSetup.userId), {
          userId: pendingSetup.userId,
          schemaVersion: 2,
          pinKeyWrap: pendingSetup.pinKeyWrap,
          recoveryKeyWrap: pendingSetup.recoveryKeyWrap,
          recoveryKeyConfirmed: true,
          createdAt: serverTimestamp(),
        });
        setHasPinConfigured(true);
        setPendingSetup(null);
      } else {
        await updateDoc(doc(db, 'user_settings', user.uid), {
          recoveryKeyConfirmed: true,
          updatedAt: serverTimestamp(),
        });
        setRecoveryKeyPending(null);
      }

      setIsUnlocked(true);
      setSelectedCategory(null);
      setWalletItems([]);
      fetchCategories(user.uid);
      return true;
    } catch (error) {
      console.error('Could not confirm recovery key:', error);
      return false;
    }
  };

  const migrateLegacyVault = async (uid: string, pin: string, settingsData?: Record<string, any>) => {
    const vaultSnapshot = await getDocs(query(collection(db, 'vault_items'), where('userId', '==', uid)));
    const legacyItems = vaultSnapshot.docs.filter((item) => item.data().recordType !== 'pin-verifier');
    const legacyVerifier = vaultSnapshot.docs.find((item) => item.id === `pin-verifier_${uid}`);
    if (legacyItems.length + (legacyVerifier ? 1 : 0) + 1 > 500) {
      throw new Error('Vault has too many items for a single safe migration batch.');
    }

    const newVaultKey = await createVaultKey();
    const recoveryKey = createRecoveryKey();
    const [pinKeyWrap, recoveryKeyWrap] = await Promise.all([
      wrapVaultKey(newVaultKey, pin),
      wrapVaultKey(newVaultKey, recoveryKey),
    ]);

    const encryptedItems = await Promise.all(legacyItems.map(async (item) => {
      const data = item.data();
      const password = await decryptData(
        { ciphertext: data.ciphertext, salt: data.salt, iv: data.iv },
        pin
      );
      return { ref: item.ref, encrypted: await encryptWithVaultKey(password, newVaultKey) };
    }));

    const batch = writeBatch(db);
    batch.set(doc(db, 'user_settings', uid), {
      userId: uid,
      schemaVersion: 2,
      pinKeyWrap,
      recoveryKeyWrap,
      recoveryKeyConfirmed: false,
      createdAt: settingsData?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    encryptedItems.forEach(({ ref, encrypted }) => batch.update(ref, encrypted));

    if (legacyVerifier) batch.delete(legacyVerifier.ref);
    await batch.commit();

    return { vaultKey: newVaultKey, recoveryKey };
  };

  const handleUnlock = async (pin: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const verifierRef = doc(db, 'user_settings', user.uid);
      const verifierSnapshot = await getDoc(verifierRef);
      const verifierText = `password-wallet-pin:v1:${user.uid}`;

      if (verifierSnapshot.exists() && verifierSnapshot.data().schemaVersion === 2) {
        const settings = verifierSnapshot.data();
        const unlockedVaultKey = await unwrapVaultKey(settings.pinKeyWrap, pin);
        setVaultKey(unlockedVaultKey);
        if (settings.recoveryKeyConfirmed === false) {
          const recoveryKey = createRecoveryKey();
          const recoveryKeyWrap = await wrapVaultKey(unlockedVaultKey, recoveryKey);
          await updateDoc(verifierRef, { recoveryKeyWrap, updatedAt: serverTimestamp() });
          setRecoveryKeyPending(recoveryKey);
          return true;
        }
        setIsUnlocked(true);
        setSelectedCategory(null);
        setWalletItems([]);
        fetchCategories(user.uid);
        return true;
      }

      let legacySettings = verifierSnapshot.exists() ? verifierSnapshot.data() : undefined;
      let pinIsValid = false;
      if (legacySettings?.ciphertext && legacySettings?.salt && legacySettings?.iv) {
        pinIsValid = await decryptData(
          { ciphertext: legacySettings.ciphertext, salt: legacySettings.salt, iv: legacySettings.iv },
          pin
        ) === verifierText;
      } else {
        const legacyVerifierSnapshot = await getDoc(doc(db, 'vault_items', `pin-verifier_${user.uid}`));
        if (legacyVerifierSnapshot.exists()) {
          const legacyVerifier = legacyVerifierSnapshot.data();
          pinIsValid = await decryptData(
            { ciphertext: legacyVerifier.ciphertext, salt: legacyVerifier.salt, iv: legacyVerifier.iv },
            pin
          ) === verifierText;
        } else {
          const q = query(collection(db, 'vault_items'), where('userId', '==', user.uid), limit(1));
          const querySnapshot = await getDocs(q);
          const legacyItem = querySnapshot.docs.find((item) => item.data().recordType !== 'pin-verifier');
          if (legacyItem) {
            await decryptData(
              { ciphertext: legacyItem.data().ciphertext, salt: legacyItem.data().salt, iv: legacyItem.data().iv },
              pin
            );
            pinIsValid = true;
          }
        }
      }

      if (!pinIsValid) return false;

      const migrated = await migrateLegacyVault(user.uid, pin, legacySettings);
      setVaultKey(migrated.vaultKey);
      setRecoveryKeyPending(migrated.recoveryKey);
      return true;
    } catch (error) {
      console.error('Error validating Master PIN:', error);
      return false;
    }
  };

  const handleRecover = async (recoveryKey: string, newPin: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const settingsRef = doc(db, 'user_settings', user.uid);
      const settingsSnapshot = await getDoc(settingsRef);
      if (!settingsSnapshot.exists() || settingsSnapshot.data().schemaVersion !== 2) return false;

      const settings = settingsSnapshot.data();
      const recoveredVaultKey = await unwrapVaultKey(
        settings.recoveryKeyWrap,
        normalizeRecoveryKey(recoveryKey)
      );
      const pinKeyWrap = await wrapVaultKey(recoveredVaultKey, newPin);
      await updateDoc(settingsRef, { pinKeyWrap, updatedAt: serverTimestamp() });

      setVaultKey(recoveredVaultKey);
      setIsUnlocked(true);
      setSelectedCategory(null);
      setWalletItems([]);
      fetchCategories(user.uid);
      return true;
    } catch (error) {
      console.error('Vault recovery failed:', error);
      return false;
    }
  };

  const handleAddPassword = async (title: string, username: string, pass: string, note: string) => {
    if (!user || !vaultKey) return;
    try {
      const encrypted = await encryptWithVaultKey(pass, vaultKey);
      const itemRef = doc(collection(db, 'vault_items'));
      const batch = writeBatch(db);
      batch.set(itemRef, {
        userId: user.uid,
        title,
        username,
        ...encrypted,
        note,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'vault_categories', categoryDocumentId(user.uid, title)), {
        userId: user.uid,
        title,
        itemCount: increment(1),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await batch.commit();

      setHasPinConfigured(true);
      setShowAddModal(false);
      updateCategoryCountInState(title, 1);
      if (selectedCategory === title) {
        setWalletItems((current) => [...current, {
          id: itemRef.id,
          title,
          username,
          ciphertext: encrypted.ciphertext,
          salt: '',
          iv: encrypted.iv,
          cryptoVersion: encrypted.cryptoVersion,
          note,
        }]);
      }
    } catch (error) {
      console.error('Error adding password:', error);
      alert(t(language, 'savePasswordFailed'));
    }
  };

  const handleDecryptItem = async (item: WalletItem): Promise<string | null> => {
    try {
      if (!vaultKey) return null;
      if (item.cryptoVersion !== 'vault-key-v1') throw new Error('Legacy item was not migrated.');
      const decrypted = await decryptWithVaultKey(
        { ciphertext: item.ciphertext, iv: item.iv },
        vaultKey
      );
      return decrypted;
    } catch (error) {
      alert(t(language, 'decryptFailed'));
      return null;
    }
  };

  const [editingItem, setEditingItem] = useState<WalletItem | null>(null);

  const handleUpdatePassword = async (id: string, title: string, username: string, newPassword: string | null, note: string) => {
    if (!user || !vaultKey) return;
    try {
      const currentItem = walletItems.find((item) => item.id === id);
      const previousTitle = currentItem?.title;
      const updateData: Record<string, unknown> = { title, username, note };
      if (newPassword) Object.assign(updateData, await encryptWithVaultKey(newPassword, vaultKey));

      const batch = writeBatch(db);
      batch.update(doc(db, 'vault_items', id), updateData);
      if (previousTitle && previousTitle !== title) {
        const previousCategory = walletCategories.find((category) => category.title === previousTitle);
        const previousCategoryRef = doc(db, 'vault_categories', categoryDocumentId(user.uid, previousTitle));
        if (previousCategory?.itemCount === 1) batch.delete(previousCategoryRef);
        else if (previousCategory) batch.set(previousCategoryRef, { itemCount: increment(-1), updatedAt: serverTimestamp() }, { merge: true });
        batch.set(doc(db, 'vault_categories', categoryDocumentId(user.uid, title)), {
          userId: user.uid,
          title,
          itemCount: increment(1),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      await batch.commit();

      if (previousTitle && previousTitle !== title) {
        updateCategoryCountInState(previousTitle, -1);
        updateCategoryCountInState(title, 1);
        if (selectedCategory === previousTitle && walletCategories.find((category) => category.title === previousTitle)?.itemCount === 1) {
          setSelectedCategory(null);
        }
      }
      setWalletItems((current) => current
        .filter((item) => selectedCategory !== previousTitle || title === previousTitle || item.id !== id)
        .map((item) => item.id === id ? { ...item, title, username, note, ...((updateData.cryptoVersion) ? { cryptoVersion: String(updateData.cryptoVersion) } : {}) } : item));
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating password:', error);
      alert(t(language, 'updateFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t(language, 'deleteConfirm')) && user) {
      try {
        const item = walletItems.find((walletItem) => walletItem.id === id);
        const batch = writeBatch(db);
        batch.delete(doc(db, 'vault_items', id));
        if (item) {
          const category = walletCategories.find((entry) => entry.title === item.title);
          const categoryRef = doc(db, 'vault_categories', categoryDocumentId(user.uid, item.title));
          if (category?.itemCount === 1) batch.delete(categoryRef);
          else if (category) batch.set(categoryRef, { itemCount: increment(-1), updatedAt: serverTimestamp() }, { merge: true });
        }
        await batch.commit();
        if (item) {
          updateCategoryCountInState(item.title, -1);
          setWalletItems((current) => current.filter((walletItem) => walletItem.id !== id));
          if (selectedCategory === item.title && walletCategories.find((category) => category.title === item.title)?.itemCount === 1) {
            setSelectedCategory(null);
          }
        }
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  if (authLoading || (user && hasPinConfigured === null)) {
    return (
      <div className="app-backdrop" data-theme={theme}>
        <div className="loading-state">
          <span className="brand-emblem"><ShieldCheck /></span>
          <p>{t(language, 'openingWallet')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-backdrop" data-theme={theme}>
      <div className="app-shell">
        <header className="app-header">
          <div className="brand-lockup">
            <span className="brand-emblem"><ShieldCheck /></span>
            <span className="brand-copy">
              <strong>Wallet</strong>
              <small>{t(language, 'personalVault')}</small>
            </span>
          </div>

          <div className="header-tools">
            <div className="preference-controls">
              <button
                type="button"
                className="preference-button theme-button"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                aria-label={t(language, theme === 'light' ? 'switchToDark' : 'switchToLight')}
                title={t(language, theme === 'light' ? 'switchToDark' : 'switchToLight')}
              >
                {theme === 'light' ? <Moon /> : <Sun />}
                <span>{t(language, theme === 'light' ? 'darkMode' : 'lightMode')}</span>
              </button>
              <button
                type="button"
                className="preference-button language-button"
                onClick={() => setLanguage(language === 'en' ? 'th' : 'en')}
                aria-label={t(language, 'changeLanguage')}
                title={t(language, 'changeLanguage')}
              >
                <Languages />
                <span>{language === 'en' ? 'ไทย' : 'EN'}</span>
              </button>
            </div>

            {user && (
            <div className="session-controls">
              {isUnlocked && (
                <span className="session-badge">
                  <Unlock /> <span>{t(language, 'unlocked')}</span>
                </span>
              )}
              <button
                onClick={handleLogout}
                aria-label={t(language, 'signOut')}
                title={t(language, 'signOut')}
                className="icon-button signout-button"
              >
                <LogOut />
              </button>
            </div>
          )}
          </div>
        </header>

        <main className="app-content">
          {!user ? (
            <LoginScreen language={language} onGoogleLogin={handleGoogleLogin} />
          ) : recoveryKeyPending ? (
            <RecoveryKeyScreen
              recoveryKey={recoveryKeyPending}
              language={language}
              onContinue={handleRecoveryAcknowledged}
            />
          ) : !hasPinConfigured ? (
            <SetupPinScreen
              user={user}
              language={language}
              onPinCreated={handlePinCreated}
              onRecoverySaved={handleRecoveryAcknowledged}
            />
          ) : !isUnlocked ? (
            <UnlockScreen user={user} language={language} onUnlock={handleUnlock} onRecover={handleRecover} />
          ) : (
            <Dashboard
              user={user}
              language={language}
              categories={walletCategories}
              selectedCategory={selectedCategory}
              items={walletItems}
              loading={loading}
              onSelectCategory={(title) => fetchCategoryItems(user.uid, title)}
              onBackToCategories={() => {
                setSelectedCategory(null);
                setWalletItems([]);
              }}
              onOpenAddModal={() => setShowAddModal(true)}
              onOpenEditModal={(item) => setEditingItem(item)}
              onDelete={handleDelete}
              onDecryptItem={handleDecryptItem}
            />
          )}

          {showAddModal && user && (
            <AddPasswordModal
              categories={walletCategories.map((category) => category.title)}
              language={language}
              onClose={() => setShowAddModal(false)}
              onAdd={handleAddPassword}
            />
          )}

          {editingItem && (
            <EditPasswordModal
              item={editingItem}
              language={language}
              onClose={() => setEditingItem(null)}
              onUpdate={handleUpdatePassword}
            />
          )}
        </main>
      </div>
    </div>
  );
}