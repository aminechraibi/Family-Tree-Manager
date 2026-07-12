import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Sparkles, Sliders, Globe, Trash2, AlertTriangle } from 'lucide-react';
import { useFamilyStore } from '../hooks/useFamilyStore';

export default function SettingsPage() {
  const { settings, updateSettings, clearDatabase, showToast } = useFamilyStore();

  const [familyName, setFamilyName] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [language, setLanguage] = useState('en');
  const [imageSummariesEnabled, setImageSummariesEnabled] = useState(false);

  // Sync state with settings
  useEffect(() => {
    if (settings) {
      setFamilyName(settings.familyName || 'My Family');
      setDateFormat(settings.dateFormat || 'YYYY-MM-DD');
      setLanguage(settings.language || 'en');
      setImageSummariesEnabled(settings.imageSummariesEnabled !== false);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        familyName: familyName.trim() || 'My Family',
        dateFormat,
        language,
        imageSummariesEnabled
      });
    } catch (err) {
      showToast("Failed to update settings", "error");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center space-x-3.5">
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Application Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Configure offline visual displays, date formats, and localized Gemini AI rules</p>
        </div>
      </div>

      <div className="max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Section 1: General Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-2.5 border-b">
              <Sliders className="w-4.5 h-4.5 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">General Display</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Family Tree Title</label>
                <input
                  type="text"
                  required
                  value={familyName}
                  onChange={e => setFamilyName(e.target.value)}
                  placeholder="e.g. El Amrani Family tree"
                  className="w-full px-3.5 py-2 text-sm bg-transparent border rounded-lg"
                />
                <p className="text-[10px] text-slate-400 mt-1">This title is shown prominently in the sidebar header.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date Format Preference</label>
                <select
                  value={dateFormat}
                  onChange={e => setDateFormat(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-transparent border rounded-lg"
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD (Default)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Interface Language</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-transparent border rounded-lg"
                >
                  <option value="en">English (US)</option>
                  <option value="fr">Français</option>
                  <option value="ar">العربية (Arabic)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: AI Summaries */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-2.5 border-b">
              <Sparkles className="w-4.5 h-4.5 text-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Gemini 1.5 Flash AI Assistant</h3>
            </div>

            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl flex items-start space-x-3.5">
              <input
                type="checkbox"
                id="ai-summary-check"
                checked={imageSummariesEnabled}
                onChange={e => setImageSummariesEnabled(e.target.checked)}
                className="mt-1 w-4.5 h-4.5 text-emerald-600 focus:ring-emerald-500 rounded cursor-pointer"
              />
              <div className="space-y-1">
                <label htmlFor="ai-summary-check" className="text-xs font-bold text-emerald-800 dark:text-emerald-400 block cursor-pointer select-none">
                  Enable Server-Side AI Photo Descriptions
                </label>
                <p className="text-[10px] text-emerald-700/80 leading-normal">
                  When checked, the photo gallery will enable the "AI Describe" button. This invokes Google Gemini 1.5 Flash on the Express server to look at your uploaded family photographs and generate custom descriptive notes automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2 border-t">
            <button
              type="submit"
              id="settings-save-btn"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-md transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>

        </form>
      </div>

      {/* Danger Zone: Empty Database */}
      <div className="max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-rose-200 dark:border-rose-950/40 p-6 space-y-4">
        <div className="flex items-center space-x-2.5 pb-2.5 border-b border-rose-100 dark:border-rose-950/30">
          <Trash2 className="w-5 h-5 text-rose-500 shrink-0" />
          <h3 className="font-bold text-sm text-rose-900 dark:text-rose-400 uppercase tracking-wider">Danger Zone</h3>
        </div>
        
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Emptying the database will permanently delete all family tree profiles, parent-child links, spouse partnerships, photo memories, and historical milestones. This action is irreversible.
          </p>

          {!showConfirm ? (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-100 dark:border-rose-950/40 shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer animate-in fade-in"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Empty Database from Sample Data</span>
            </button>
          ) : (
            <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold">Are you absolutely sure you want to proceed?</span>
              </div>
              <p className="text-[10px] text-rose-600 dark:text-rose-500/90 leading-normal">
                This will wipe the entire SQLite database file clean. All custom relatives and media records you created, alongside the default Moroccan-themed sample tree, will be lost forever.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await clearDatabase();
                      setShowConfirm(false);
                    } catch (err) {
                      showToast("Failed to empty database", "error");
                    }
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Yes, Empty Database
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
