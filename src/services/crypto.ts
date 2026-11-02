/**
 * Zero-Knowledge Client-Side Encryption Service
 * Uses Web Crypto API (PBKDF2 + AES-GCM 256-bit)
 */

// แปลง ArrayBuffer เป็น Base64 string เพื่อให้เก็บบันทึกลง Firebase ได้ง่าย
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// แปลง Base64 string กลับเป็น ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * สร้าง Cryptographic Key จาก Master Password และ Salt โดยใช้ PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000, // จำนวนรอบสูงเพื่อความปลอดภัย
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * เข้ารหัสข้อความ (Plaintext) ด้วย Master Password
 * @returns Object ที่บรรจุ ciphertext, salt และ iv ในรูปแบบ Base64
 */
export async function encryptData(plainText: string, masterPassword: string) {
  try {
    const enc = new TextEncoder();
    
    // สร้าง Salt และ IV แบบสุ่มใหม่ทุกครั้งที่เข้ารหัส
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // AES-GCM แนะนำ IV ขนาด 12 ไบต์

    const key = await deriveKey(masterPassword, salt);
    const encodedData = enc.encode(plainText);

    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encodedData
    );

    return {
      ciphertext: bufferToBase64(encryptedContent),
      salt: bufferToBase64(salt.buffer),
      iv: bufferToBase64(iv.buffer),
    };
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("ไม่สามารถเข้ารหัสข้อมูลได้ กรุณาตรวจสอบความถูกต้อง");
  }
}

/**
 * ถอดรหัสข้อมูล (Ciphertext) ด้วย Master Password
 */
export async function decryptData(
  payload: { ciphertext: string; salt: string; iv: string },
  masterPassword: string
): Promise<string> {
  try {
    const salt = new Uint8Array(base64ToBuffer(payload.salt));
    const iv = new Uint8Array(base64ToBuffer(payload.iv));
    const ciphertext = base64ToBuffer(payload.ciphertext);

    const key = await deriveKey(masterPassword, salt);

    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedContent);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("รหัสผ่านหลัก (Master Password) ไม่ถูกต้อง หรือข้อมูลเสียหาย");
  }
}