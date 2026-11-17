import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, isAllowedEmail, OperationType } from '../lib/firebase';
import { Project } from '../types/project';

const COLLECTION_NAME = 'projects';

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        result[k] = stripUndefined(v);
      }
    }
    return result as T;
  }
  return value;
}

function sanitizeProjectForFirestore(project: Project): Record<string, unknown> {
  const validStatuses = ['planning', 'in_progress', 'delayed', 'completed'] as const;
  const safeStatus = validStatuses.includes(project.status as (typeof validStatuses)[number])
    ? project.status
    : 'in_progress';

  const sanitized: Record<string, unknown> = {
    id: String(project.id || '').slice(0, 128),
    name: String(project.name || '未命名工程').slice(0, 200),
    code: String(project.code || 'PRJ-01').slice(0, 60),
    client: String(project.client || '').slice(0, 200),
    contractor: String(project.contractor || '').slice(0, 200),
    projectManager: String(project.projectManager || '').slice(0, 200),
    startDate: String(project.startDate || '').slice(0, 30),
    targetEndDate: String(project.targetEndDate || '').slice(0, 30),
    totalBudget: Math.max(0, Number(project.totalBudget) || 0),
    description: String(project.description || '').slice(0, 2000),
    status: safeStatus,
    phases: stripUndefined((project.phases || []).slice(0, 50)),
    tasks: stripUndefined((project.tasks || []).slice(0, 500)),
    workforceLogs: stripUndefined((project.workforceLogs || []).slice(0, 730)),
    updatedAt: new Date().toISOString().slice(0, 50),
  };

  return sanitized;
}

function ensureAuthorizedSession(): boolean {
  const user = auth.currentUser;
  return Boolean(user && isAllowedEmail(user.email) && user.emailVerified);
}

export function subscribeProjects(
  onProjectsUpdate: (projects: Project[]) => void,
  onError?: (err: unknown) => void
) {
  if (!ensureAuthorizedSession()) {
    return () => {};
  }

  try {
    const colRef = collection(db, COLLECTION_NAME);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const loaded: Project[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Project;
          loaded.push({
            ...data,
            id: docSnap.id,
          });
        });
        onProjectsUpdate(loaded);
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      }
    );
    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function saveProject(project: Project): Promise<void> {
  if (!ensureAuthorizedSession()) {
    return;
  }

  const docPath = `${COLLECTION_NAME}/${project.id}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, project.id);
    const payload = sanitizeProjectForFirestore(project);
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteProjectDoc(projectId: string): Promise<void> {
  if (!ensureAuthorizedSession()) {
    return;
  }

  const docPath = `${COLLECTION_NAME}/${projectId}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, projectId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function seedInitialProjects(projects: Project[]): Promise<void> {
  if (!ensureAuthorizedSession()) {
    return;
  }

  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      for (const proj of projects) {
        await saveProject(proj);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}
