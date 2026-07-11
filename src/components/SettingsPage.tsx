import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Sparkles, Sliders, Globe } from 'lucide-react';
import { useFamilyStore } from '../hooks/useFamilyStore';

export default function SettingsPage() {
  const { settings, updateSettings, showToast } = useFamilyStore();

  const [familyName, setFamilyName] = useState('');
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

    </div>
  );
}
