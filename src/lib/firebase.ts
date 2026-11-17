import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass firestoreDatabaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  login_hint: 'jason2134@gmail.com',
  prompt: 'select_account',
});

export const ALLOWED_USER_EMAIL = 'jason2134@gmail.com';

export function isAllowedEmail(email?: string | null): boolean {
  return (email || '').trim().toLowerCase() === ALLOWED_USER_EMAIL;
}

export async function loginWithEmailPassword(email: string, password: string): Promise<User> {
  const normalized = email.trim().toLowerCase();
  if (!isAllowedEmail(normalized)) {
    throw new Error(`此系統僅授權 ${ALLOWED_USER_EMAIL} 登入使用，不接受其他電子郵件帳號。`);
  }

  const credential = await signInWithEmailAndPassword(auth, normalized, password);
  if (!isAllowedEmail(credential.user.email)) {
    await signOut(auth);
    throw new Error(`存取被拒絕：僅限 ${ALLOWED_USER_EMAIL} 登入使用。`);
  }
  return credential.user;
}

export async function loginWithGoogleAccount(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  if (!isAllowedEmail(credential.user.email)) {
    const attempted = credential.user.email || '未知帳號';
    await signOut(auth);
    throw new Error(`存取被拒絕：此系統僅授權 ${ALLOWED_USER_EMAIL} 登入（目前嘗試帳號：${attempted}）。`);
  }
  return credential.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function requestEmailVerification(user: User): Promise<void> {
  await sendEmailVerification(user);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!isAllowedEmail(normalized)) {
    throw new Error(`僅授權帳號 ${ALLOWED_USER_EMAIL} 可申請密碼重設。`);
  }
  await sendPasswordResetEmail(auth, normalized);
}

export { onAuthStateChanged };
export type { User };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or initializing.');
    }
    return false;
  }
}
