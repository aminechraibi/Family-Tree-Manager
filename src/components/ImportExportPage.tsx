import React, { useState } from 'react';
import { Database, DownloadCloud, UploadCloud, FileText, Check, ShieldAlert, History, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { useFamilyStore } from '../hooks/useFamilyStore';

export default function ImportExportPage() {
  const { 
    backupsList, createBackupOnDisk, restoreBackupFromDisk, 
    exportBackupData, importBackupValidate, confirmImportBackup, 
    showToast, history 
  } = useFamilyStore();

  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    peopleCount: number;
    relationshipsCount: number;
    familyName: string;
    rawData?: any;
  } | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [restoringFilename, setRestoringFilename] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      
      const res = await importBackupValidate(json);
      setValidationResult({
        valid: res.valid,
        peopleCount: res.peopleCount,
        relationshipsCount: res.relationshipsCount,
        familyName: res.familyName,
        rawData: json
      });
      showToast("Backup file validated successfully! Review content below before confirming.", "info");
    } catch (err) {
      showToast("Invalid backup file. Make sure it is a valid family tree JSON export.", "error");
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult || !validationResult.rawData) return;
    
    if (confirm("WARNING: Importing this backup will overwrite ALL current family tree profiles, photos, and milestones. Do you want to proceed?")) {
      try {
        await confirmImportBackup(validationResult.rawData);
        setValidationResult(null);
      } catch (err) {
        showToast("Failed to import database", "error");
      }
    }
  };

  const handleDiskRestore = async (filename: string) => {
    if (confirm(`Are you sure you want to restore the backup "${filename}"? This will overwrite your current active database.`)) {
      setRestoringFilename(filename);
      try {
        await restoreBackupFromDisk(filename);
      } catch (err) {
        showToast("Restore failed", "error");
      } finally {
        setRestoringFilename(null);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Data Management & Backup</h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">Export raw data, restore local backups, and transfer family history files</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left: Export and JSON import drag box */}
        <div className="space-y-6">
          
          {/* Export card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b">
              <DownloadCloud className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Export Family History</h3>
            </div>
            <p className="text-xs text-slate-500 leading-normal">
              Download your complete family profiles, relationship matrices, custom notes, and milestone logs into a single JSON file. Perfect for cold storage.
            </p>
            <button
              onClick={() => exportBackupData()}
              id="export-download-btn"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-all shadow cursor-pointer"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Download Database Export</span>
            </button>
          </div>

          {/* Import JSON File drag box */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b">
              <UploadCloud className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Import Family History</h3>
            </div>

            {/* Validation Result review preview card */}
            {validationResult ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-500/20 rounded-xl space-y-4 animate-fade-in">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">Valid Backup File Detected</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300 bg-white/50 p-3 rounded-lg border">
                  <p><strong>Family Name:</strong> {validationResult.familyName}</p>
                  <p><strong>Registered Relatives:</strong> {validationResult.peopleCount}</p>
                  <p><strong>Mapped Relationships:</strong> {validationResult.relationshipsCount}</p>
                </div>

                <div className="flex space-x-2 justify-end">
                  <button
                    onClick={() => setValidationResult(null)}
                    className="px-3 py-1.5 border rounded text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    id="confirm-import-btn"
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold shadow"
                  >
                    Over-Write Database
                  </button>
                </div>
              </div>
            ) : (
              /* Drag box */
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center p-4 relative overflow-hidden transition-colors ${dragActive ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-300 dark:border-slate-700 bg-slate-50'}`}
              >
                <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-semibold block text-slate-700">Drag or drop family tree JSON file</span>
                <span className="text-[10px] text-slate-400 block mt-1">Accepts raw JSON database exports</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            )}

          </div>

        </div>

        {/* Right: Machine disk backup snapshots list (Durable server storage) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-5">
          <div className="flex justify-between items-center pb-3 border-b">
            <div className="flex items-center space-x-2.5">
              <Database className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">System Restore Points</h3>
            </div>
            
            <button
              onClick={() => createBackupOnDisk()}
              id="disk-backup-create-btn"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-500" />
              <span>Create point</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-normal">
            These database backups reside directly inside your machine's physical disk data block. You can safely trigger restore points before making large profile modifications.
          </p>

          <div className="space-y-3">
            {backupsList.map(b => (
              <div key={b.filename} className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-950/20">
                <div className="flex items-center space-x-3 min-w-0">
                  <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{b.filename}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Size: {(b.size / 1024).toFixed(1)} KB · Created: {new Date(b.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDiskRestore(b.filename)}
                  disabled={restoringFilename !== null}
                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 text-[10px] font-bold rounded-lg transition-colors border"
                >
                  {restoringFilename === b.filename ? "Restoring..." : "Restore"}
                </button>
              </div>
            ))}

            {backupsList.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No direct restore points mapped on disk. Click Create Point above!</p>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
