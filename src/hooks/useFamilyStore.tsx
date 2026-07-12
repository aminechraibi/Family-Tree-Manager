import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { Person, ParentRelationship, CoupleRelationship, Event, Photo, Settings, HistoryItem } from '../types';

interface FamilyStore {
  people: Person[];
  parentRelationships: ParentRelationship[];
  coupleRelationships: CoupleRelationship[];
  events: Event[];
  photos: Photo[];
  settings: Settings;
  history: HistoryItem[];
  backupsList: Array<{ filename: string; createdAt: string; size: number }>;
  
  // UI Navigation state
  activeTab: 'home' | 'tree' | 'people' | 'photos' | 'events' | 'import' | 'settings' | 'profile';
  activePersonId: string | null;
  isLoading: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;

  // Actions
  setTab: (tab: 'home' | 'tree' | 'people' | 'photos' | 'events' | 'import' | 'settings' | 'profile', personId?: string | null) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  fetchData: () => Promise<void>;
  
  // Person CRUD
  createPerson: (p: Omit<Person, 'id'> & { id?: string }) => Promise<Person>;
  updatePerson: (id: string, updates: Partial<Person>) => Promise<Person>;
  deletePerson: (id: string) => Promise<void>;

  // Relationships
  createParentRelationship: (rel: Omit<ParentRelationship, 'id'>) => Promise<ParentRelationship>;
  deleteParentRelationship: (id: string) => Promise<void>;
  createCoupleRelationship: (rel: Omit<CoupleRelationship, 'id'>) => Promise<CoupleRelationship>;
  deleteCoupleRelationship: (id: string) => Promise<void>;

  // Events
  createEvent: (ev: Omit<Event, 'id' | 'createdAt'> & { people?: Array<{ personId: string; role?: string }> }) => Promise<Event>;
  deleteEvent: (id: string) => Promise<void>;

  // Photos
  createPhoto: (photo: Omit<Photo, 'id' | 'createdAt'> & { people?: string[] }) => Promise<Photo>;
  updatePhoto: (id: string, updates: Partial<Photo> & { people?: string[] }) => Promise<Photo>;
  deletePhoto: (id: string) => Promise<void>;
  generateImageSummary: (photoId: string) => Promise<Photo>;

  // Settings
  updateSettings: (sets: Partial<Settings>) => Promise<Settings>;

  // Undo/History
  undoLastAction: () => Promise<boolean>;

  // Backups
  createBackupOnDisk: () => Promise<void>;
  restoreBackupFromDisk: (filename: string) => Promise<void>;
  exportBackupData: () => Promise<void>;
  importBackupValidate: (data: any) => Promise<{ valid: boolean; peopleCount: number; relationshipsCount: number; familyName: string }>;
  confirmImportBackup: (data: any) => Promise<void>;
  clearDatabase: () => Promise<void>;
}

const FamilyStoreContext = createContext<FamilyStore | undefined>(undefined);

export function FamilyStoreProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [parentRelationships, setParentRelationships] = useState<ParentRelationship[]>([]);
  const [coupleRelationships, setCoupleRelationships] = useState<CoupleRelationship[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [settings, setSettings] = useState<Settings>({
    familyName: 'My Family',
    language: 'en',
    dateFormat: 'YYYY-MM-DD',
    theme: 'light',
    treeLayout: 'TB',
    treeGenerations: 3,
    showPhotosInTree: true,
    showBirthYearsInTree: true,
    imageSummariesEnabled: false,
    apiProvider: 'disabled',
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    apiModel: 'gpt-4o-mini',
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [backupsList, setBackupsList] = useState<Array<{ filename: string; createdAt: string; size: number }>>([]);
  
  const [activeTab, setActiveTab] = useState<'home' | 'tree' | 'people' | 'photos' | 'events' | 'import' | 'settings' | 'profile'>('home');
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(current => current?.message === message ? null : current);
    }, 4000);
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  const setTab = useCallback((tab: typeof activeTab, personId: string | null = null) => {
    setActiveTab(tab);
    if (personId) {
      setActivePersonId(personId);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resPeople, resParents, resCouples, resEvents, resPhotos, resSettings, resHistory, resBackups] = await Promise.all([
        fetch('/api/people').then(r => r.json()),
        fetch('/api/parent-relationships').then(r => r.json()),
        fetch('/api/couple-relationships').then(r => r.json()),
        fetch('/api/events').then(r => r.json()),
        fetch('/api/photos').then(r => r.json()),
        fetch('/api/settings').then(r => r.json()),
        fetch('/api/history').then(r => r.json()),
        fetch('/api/backup/list').then(r => r.json())
      ]);

      setPeople(resPeople);
      setParentRelationships(resParents);
      setCoupleRelationships(resCouples);
      setEvents(resEvents);
      setPhotos(resPhotos);
      setSettings(resSettings);
      setHistory(resHistory);
      setBackupsList(resBackups);
    } catch (err) {
      console.error("Failed to fetch store data", err);
      showToast("Could not sync with local server database", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createPerson = async (p: Omit<Person, 'id'> & { id?: string }) => {
    const res = await fetch('/api/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create person");
    }
    const created = await res.json();
    setPeople(prev => [...prev, created]);
    fetchData(); // reload history
    return created;
  };

  const updatePerson = async (id: string, updates: Partial<Person>) => {
    const res = await fetch(`/api/people/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update person");
    }
    const updated = await res.json();
    setPeople(prev => prev.map(p => p.id === id ? updated : p));
    fetchData(); // reload history
    return updated;
  };

  const deletePerson = async (id: string) => {
    const res = await fetch(`/api/people/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete person");
    }
    setPeople(prev => prev.filter(p => p.id !== id));
    fetchData(); // reload relationships & history
  };

  const createParentRelationship = async (rel: Omit<ParentRelationship, 'id'>) => {
    const res = await fetch('/api/parent-relationships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rel)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to add parent relationship");
    }
    const created = await res.json();
    setParentRelationships(prev => [...prev, created]);
    fetchData();
    return created;
  };

  const deleteParentRelationship = async (id: string) => {
    const res = await fetch(`/api/parent-relationships/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete parent relationship");
    }
    setParentRelationships(prev => prev.filter(r => r.id !== id));
    fetchData();
  };

  const createCoupleRelationship = async (rel: Omit<CoupleRelationship, 'id'>) => {
    const res = await fetch('/api/couple-relationships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rel)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to add couple relationship");
    }
    const created = await res.json();
    setCoupleRelationships(prev => [...prev, created]);
    fetchData();
    return created;
  };

  const deleteCoupleRelationship = async (id: string) => {
    const res = await fetch(`/api/couple-relationships/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete couple relationship");
    }
    setCoupleRelationships(prev => prev.filter(c => c.id !== id));
    fetchData();
  };

  const createEvent = async (ev: Omit<Event, 'id' | 'createdAt'> & { people?: Array<{ personId: string; role?: string }> }) => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ev)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create event");
    }
    const created = await res.json();
    setEvents(prev => [...prev, created]);
    fetchData();
    return created;
  };

  const deleteEvent = async (id: string) => {
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete event");
    }
    setEvents(prev => prev.filter(e => e.id !== id));
    fetchData();
  };

  const createPhoto = async (photo: Omit<Photo, 'id' | 'createdAt'> & { people?: string[] }) => {
    const res = await fetch('/api/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(photo)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save photo metadata");
    }
    const created = await res.json();
    setPhotos(prev => [...prev, created]);
    fetchData();
    return created;
  };

  const updatePhoto = async (id: string, updates: Partial<Photo> & { people?: string[] }) => {
    const res = await fetch(`/api/photos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update photo details");
    }
    const updated = await res.json();
    setPhotos(prev => prev.map(p => p.id === id ? updated : p));
    fetchData();
    return updated;
  };

  const deletePhoto = async (id: string) => {
    const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete photo");
    }
    setPhotos(prev => prev.filter(p => p.id !== id));
    fetchData();
  };

  const generateImageSummary = async (photoId: string) => {
    const res = await fetch(`/api/photos/${photoId}/generate-summary`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to generate image summary via server AI");
    }
    const updated = await res.json();
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, generatedSummary: updated.generatedSummary } : p));
    fetchData();
    return updated;
  };

  const updateSettings = async (sets: Partial<Settings>) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sets)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update settings");
    }
    const updated = await res.json();
    setSettings(updated);
    showToast("Settings saved successfully", "success");
    return updated;
  };

  const undoLastAction = async () => {
    const res = await fetch('/api/history/undo', { method: 'POST' });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.success) {
      fetchData();
      showToast("Last action undone!", "success");
      return true;
    }
    showToast("Nothing to undo", "info");
    return false;
  };

  const createBackupOnDisk = async () => {
    const res = await fetch('/api/backup/create', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create local backup");
    }
    showToast("Local backup created on machine disk!", "success");
    fetchData();
  };

  const restoreBackupFromDisk = async (filename: string) => {
    const res = await fetch('/api/backup/restore-disk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to restore backup");
    }
    showToast("System backup successfully restored!", "success");
    fetchData();
  };

  const exportBackupData = async () => {
    window.open('/api/backup/export', '_blank');
  };

  const importBackupValidate = async (data: any) => {
    const res = await fetch('/api/backup/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Invalid backup data");
    }
    return await res.json();
  };

  const confirmImportBackup = async (data: any) => {
    const res = await fetch('/api/backup/import/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to confirm backup restore");
    }
    showToast("Full family database successfully imported!", "success");
    fetchData();
  };

  const clearDatabase = async () => {
    const res = await fetch('/api/database/empty', {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to clear database");
    }
    showToast("All family data successfully cleared!", "success");
    fetchData();
  };

  return (
    <FamilyStoreContext.Provider value={{
      people,
      parentRelationships,
      coupleRelationships,
      events,
      photos,
      settings,
      history,
      backupsList,
      activeTab,
      activePersonId,
      isLoading,
      toast,
      setTab,
      showToast,
      hideToast,
      fetchData,
      createPerson,
      updatePerson,
      deletePerson,
      createParentRelationship,
      deleteParentRelationship,
      createCoupleRelationship,
      deleteCoupleRelationship,
      createEvent,
      deleteEvent,
      createPhoto,
      updatePhoto,
      deletePhoto,
      generateImageSummary,
      updateSettings,
      undoLastAction,
      createBackupOnDisk,
      restoreBackupFromDisk,
      exportBackupData,
      importBackupValidate,
      confirmImportBackup,
      clearDatabase
    }}>
      {children}
    </FamilyStoreContext.Provider>
  );
}

export function useFamilyStore() {
  const context = useContext(FamilyStoreContext);
  if (!context) {
    throw new Error("useFamilyStore must be used within a FamilyStoreProvider");
  }
  return context;
}
