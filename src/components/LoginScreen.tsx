import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onGoogleLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onGoogleLogin }) => {
  return (
    <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
      <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-4 text-indigo-400">
        <ShieldCheck className="w-8 h-8" />
      </div>
      <h1 className="text-xl font-bold mb-1">Personal Password Wallet</h1>
      <p className="text-xs text-slate-400 mb-8 max-w-[260px]">
        ระบบจัดการรหัสผ่านความปลอดภัยสูงแบบ Zero-Knowledge ปกป้องข้อมูลของคุณด้วย Google Authentication
      </p>
      <button
        onClick={onGoogleLogin}
        className="w-full py-3.5 bg-white hover:bg-slate-100 text-slate-900 transition rounded-xl font-medium text-sm shadow-lg flex items-center justify-center gap-3 cursor-pointer"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.19v3.15C3.17 21.36 7.24 24 12 24z" />
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.19C.43 8.12 0 9.87 0 12s.43 3.88 1.19 5.42l4.09-3.15z" />
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.24 0 3.17 2.64 1.19 6.58l4.09 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
        </svg>
        Sign in with Google
      </button>
    </div>
  );
};