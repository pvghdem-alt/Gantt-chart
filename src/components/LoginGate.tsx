import React, { useState } from 'react';
import {
  ALLOWED_USER_EMAIL,
  loginWithEmailPassword,
  loginWithGoogleAccount,
  logoutUser,
  requestEmailVerification,
  requestPasswordReset,
  User,
} from '../lib/firebase';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Send,
  KeyRound,
} from 'lucide-react';

interface LoginGateProps {
  currentUser: User | null;
  externalError?: string | null;
  onClearExternalError?: () => void;
  onVerifiedRefresh?: () => Promise<void>;
}

function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const message = err instanceof Error ? err.message : String(err);

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return '密碼錯誤或帳號憑證無效，請重新確認密碼。';
  }
  if (code === 'auth/user-not-found') {
    return `找不到 ${ALLOWED_USER_EMAIL} 帳號，請確認 Firebase Authentication 已建立此使用者。`;
  }
  if (code === 'auth/invalid-email') {
    return '電子郵件格式不正確。';
  }
  if (code === 'auth/too-many-requests') {
    return '嘗試登入次數過多，請稍候幾分鐘後再試。';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Firebase 尚未啟用「電子郵件/密碼」登入方式，請至 Firebase Console > Authentication > 登入方式 開啟。';
  }
  if (code === 'auth/popup-closed-by-user') {
    return '已取消 Google 登入視窗。';
  }
  if (code === 'auth/popup-blocked') {
    return '瀏覽器封鎖了登入彈出視窗，請允許彈出視窗或改用電子郵件與密碼登入。';
  }
  if (code === 'auth/network-request-failed') {
    return '網路連線異常，無法連接至驗證伺服器。';
  }
  return message || '登入失敗，請稍後再試。';
}

export const LoginGate: React.FC<LoginGateProps> = ({
  currentUser,
  externalError,
  onClearExternalError,
  onVerifiedRefresh,
}) => {
  const [email, setEmail] = useState(ALLOWED_USER_EMAIL);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const activeError = errorMsg || externalError;
  const needsEmailVerification = Boolean(
    currentUser &&
      currentUser.email?.toLowerCase() === ALLOWED_USER_EMAIL &&
      !currentUser.emailVerified
  );

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    onClearExternalError?.();

    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail !== ALLOWED_USER_EMAIL) {
      setErrorMsg(`存取限制：此系統僅限授權帳號 ${ALLOWED_USER_EMAIL} 登入使用。`);
      return;
    }

    if (!password) {
      setErrorMsg('請輸入登入密碼。');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginWithEmailPassword(trimmedEmail, password);
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    onClearExternalError?.();
    setIsSubmitting(true);
    try {
      await loginWithGoogleAccount();
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendPasswordReset = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    onClearExternalError?.();
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      setInfoMsg(`已寄出密碼重設信件至 ${ALLOWED_USER_EMAIL}，請至信箱查收。`);
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendVerification = async () => {
    if (!currentUser) return;
    setErrorMsg(null);
    setInfoMsg(null);
    setIsSubmitting(true);
    try {
      await requestEmailVerification(currentUser);
      setInfoMsg(`已寄出信箱驗證信至 ${ALLOWED_USER_EMAIL}，請點擊信中驗證連結後按下「我已完成驗證」。`);
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!onVerifiedRefresh) return;
    setErrorMsg(null);
    setInfoMsg(null);
    setIsSubmitting(true);
    try {
      await onVerifiedRefresh();
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-slate-800">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Top Brand Header */}
        <div className="bg-slate-900 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
              <span className="tracking-tighter">PM</span>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">工程進度與甘特圖管制系統</h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Firebase 雲端授權存取驗證
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Authorized account notice */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-semibold">專屬授權存取：</span>
              <span className="font-mono font-bold">{ALLOWED_USER_EMAIL}</span>
            </div>
          </div>

          {/* Alerts */}
          {activeError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{activeError}</span>
            </div>
          )}

          {infoMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {needsEmailVerification ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5 leading-relaxed">
                <div className="font-bold text-sm text-amber-950">帳號尚未完成信箱驗證</div>
                <p>
                  您已登入 <span className="font-mono font-semibold">{currentUser?.email}</span>，但 Firebase 資料庫安全規則要求電子郵件必須完成驗證才能讀寫專案資料。
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleSendVerification}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>寄送驗證信至 {ALLOWED_USER_EMAIL}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCheckVerification}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>我已完成驗證，重新檢查</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  <span>改用 Google 帳號登入 (自動驗證)</span>
                </button>

                <button
                  type="button"
                  onClick={() => logoutUser()}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>登出返回登入畫面</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Email + Password Login Form */}
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    授權電子郵件帳號
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={ALLOWED_USER_EMAIL}
                      autoComplete="email"
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      登入密碼
                    </label>
                    <button
                      type="button"
                      onClick={handleSendPasswordReset}
                      disabled={isSubmitting}
                      className="text-3xs text-blue-600 hover:underline font-medium flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>忘記密碼？寄送重設信</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="請輸入 Firebase 帳號密碼"
                      autoComplete="current-password"
                      required
                      className="w-full pl-9 pr-10 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                      title={showPassword ? '隱藏密碼' : '顯示密碼'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? '驗證登入中...' : '登入工程管制系統'}</span>
                </button>
              </form>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-200" />
                <span className="shrink mx-3 text-3xs text-slate-400 font-medium">或使用</span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className="w-full py-2 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>使用 Google 登入 (限 {ALLOWED_USER_EMAIL})</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
