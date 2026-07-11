import { FamilyStoreProvider, useFamilyStore } from './hooks/useFamilyStore';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FamilyTree from './components/FamilyTree';
import PeoplePage from './components/PeoplePage';
import PersonProfile from './components/PersonProfile';
import PhotosPage from './components/PhotosPage';
import EventsPage from './components/EventsPage';
import ImportExportPage from './components/ImportExportPage';
import SettingsPage from './components/SettingsPage';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

function AppContent() {
  const { activeTab, toast, hideToast, isLoading } = useFamilyStore();

  const renderActivePage = () => {
    switch (activeTab) {
      case 'home':
        return <Dashboard />;
      case 'tree':
        return <FamilyTree />;
      case 'people':
        return <PeoplePage />;
      case 'profile':
        return <PersonProfile />;
      case 'photos':
        return <PhotosPage />;
      case 'events':
        return <EventsPage />;
      case 'import':
        return <ImportExportPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-800 dark:text-slate-100">
      
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-50/70 dark:bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-slate-500">Syncing Local Database...</p>
            </div>
          </div>
        )}
        
        {renderActivePage()}
      </main>

      {/* Reactive Sliding Toast Banner */}
      {toast && (
        <div 
          id="global-toast-banner"
          className="fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center space-x-3.5 max-w-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 animate-slide-up"
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-blue-500 shrink-0" />
          )}
          
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1">{toast.message}</span>
          
          <button 
            onClick={hideToast}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <FamilyStoreProvider>
      <AppContent />
    </FamilyStoreProvider>
  );
}
