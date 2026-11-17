import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Project } from '../types/project';

const COLLECTION_NAME = 'projects';

export function subscribeProjects(
  onProjectsUpdate: (projects: Project[]) => void,
  onError?: (err: any) => void
) {
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
  const docPath = `${COLLECTION_NAME}/${project.id}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, project.id);
    await setDoc(docRef, {
      ...project,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteProjectDoc(projectId: string): Promise<void> {
  const docPath = `${COLLECTION_NAME}/${projectId}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, projectId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function seedInitialProjects(projects: Project[]): Promise<void> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      for (const proj of projects) {
        await saveProject(proj);
      }
    }
  } catch (error) {
    console.warn('Auto-seed check failed or skipped:', error);
  }
}
