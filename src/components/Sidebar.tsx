import { Home, Users, Network, Image, Calendar, Database, Settings, Undo, Check, RotateCcw } from 'lucide-react';
import { useFamilyStore } from '../hooks/useFamilyStore';

export default function Sidebar() {
  const { activeTab, setTab, settings, undoLastAction, history } = useFamilyStore();

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'tree', label: 'Family Tree', icon: Network },
    { id: 'people', label: 'People', icon: Users },
    { id: 'photos', label: 'Photos', icon: Image },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'import', label: 'Import & Export', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <aside id="sidebar-container" className="w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
          {settings.familyName || "Family Tree"}
        </h1>
        <p className="text-xs text-slate-400 mt-1">Local Manager</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (item.id === 'people' && activeTab === 'profile');
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Undo action panel in sidebar */}
      {history.length > 0 && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={() => undoLastAction()}
            id="sidebar-undo-btn"
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-semibold text-slate-200 rounded-lg transition-colors border border-slate-700/50"
            title={`Undo: ${history[0].details}`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Undo Recent Action</span>
          </button>
          <p className="text-[10px] text-slate-500 text-center mt-1.5 truncate max-w-[200px]">
            Last: {history[0].details}
          </p>
        </div>
      )}

      {/* Footer Branding */}
      <div className="p-4 border-t border-slate-800 text-center text-xs text-slate-500">
        <span>Offline Mode</span>
        <div className="flex items-center justify-center space-x-1.5 mt-1 text-[10px] text-emerald-500">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span>Database Localized</span>
        </div>
      </div>
    </aside>
  );
}
