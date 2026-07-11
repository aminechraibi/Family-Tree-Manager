import React, { useState, useMemo } from 'react';
import { Camera, Upload, Trash2, Tag, Calendar, MapPin, Eye, Sparkles, X, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useFamilyStore } from '../hooks/useFamilyStore';
import { Photo, Person } from '../types';

export default function PhotosPage() {
  const { photos, people, createPhoto, updatePhoto, deletePhoto, generateImageSummary, showToast } = useFamilyStore();

  const [uploading, setUploading] = useState(false);
  const [photoPath, setPhotoPath] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  
  // Lightbox index & view toggle
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<string | null>(null);

  // Active records
  const activePhotos = useMemo(() => photos.filter(p => !p.isDeleted).reverse(), [photos]);
  const activePeople = useMemo(() => people.filter(p => !p.isDeleted), [people]);

  const filteredTagPeople = useMemo(() => {
    return activePeople.filter(p =>
      `${p.firstName} ${p.lastName || ''}`.toLowerCase().includes(tagSearchQuery.toLowerCase())
    );
  }, [activePeople, tagSearchQuery]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload/photo', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setPhotoPath(data.filePath);
      showToast("Photo uploaded to disk successfully! Add details below to save.");
    } catch (err) {
      showToast("Failed to upload photo", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPath || !title.trim()) {
      showToast("Upload an image and enter a title first.", "error");
      return;
    }

    try {
      await createPhoto({
        filePath: photoPath,
        title: title.trim(),
        date: date || undefined,
        location: location || undefined,
        description: description || undefined,
        people: selectedPeopleIds
      });
      showToast("Photo saved to family gallery!");
      
      // Clear form
      setPhotoPath('');
      setTitle('');
      setDate('');
      setLocation('');
      setDescription('');
      setSelectedPeopleIds([]);
    } catch (err) {
      showToast("Failed to save photo metadata", "error");
    }
  };

  const [photoToDelete, setPhotoToDelete] = useState<{ id: string; title: string } | null>(null);

  const handleConfirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    try {
      await deletePhoto(photoToDelete.id);
      showToast("Photo removed from gallery.");
    } catch (err) {
      showToast("Failed to delete photo", "error");
    } finally {
      setPhotoToDelete(null);
    }
  };

  const handleTogglePersonTag = (personId: string) => {
    setSelectedPeopleIds(prev => {
      if (prev.includes(personId)) {
        return prev.filter(id => id !== personId);
      } else {
        return [...prev, personId];
      }
    });
  };

  const handleGenerateSummary = async (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGeneratingSummary(photoId);
    try {
      await generateImageSummary(photoId);
      showToast("Gemini AI successfully summarized photo!");
    } catch (err: any) {
      showToast(err.message || "Could not generate AI summary", "error");
    } finally {
      setIsGeneratingSummary(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Family Photo Gallery</h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Catalog memory snapshots, tag family members, and generate AI insights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Upload snapshot card */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b">
            <Camera className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Upload New Memory</h3>
          </div>

          <form onSubmit={handleSavePhoto} className="space-y-4">
            
            {/* Box drag-drop selector */}
            <div className="w-full h-44 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 transition-colors flex flex-col items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950/40">
              {photoPath ? (
                <img src={photoPath} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4 select-none">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <span className="text-xs font-semibold text-slate-600 block">Click or Drag Image File</span>
                  <span className="text-[10px] text-slate-400 block mt-1">JPEG, PNG, HEIC up to 10MB</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            {uploading && <p className="text-xs text-center text-slate-400 font-semibold animate-pulse">Uploading file to local app memory...</p>}

            {/* Inputs */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Grandma's 80th Birthday Celebration"
                className="w-full px-3 py-2 border rounded-lg text-xs bg-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Approx Date</label>
                <input
                  type="text"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  placeholder="e.g. 1994-08"
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Rabat, Morocco"
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Caption / Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Share a short summary or custom background story..."
                className="w-full px-3 py-2 border rounded-lg text-xs bg-transparent"
              />
            </div>

            {/* Person Tags Select list */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-500">Tag Family Members</label>
                {activePeople.length > 5 && (
                  <input
                    type="text"
                    value={tagSearchQuery}
                    onChange={e => setTagSearchQuery(e.target.value)}
                    placeholder="Search people..."
                    className="px-2 py-0.5 border rounded text-[10px] bg-transparent w-28 focus:outline-none focus:border-emerald-500"
                  />
                )}
              </div>
              <div className="max-h-32 overflow-y-auto border rounded-lg p-2.5 space-y-1.5 bg-slate-50 dark:bg-slate-950/40">
                {filteredTagPeople.map(p => {
                  const isTagged = selectedPeopleIds.includes(p.id);
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => handleTogglePersonTag(p.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium flex items-center justify-between transition-colors ${isTagged ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' : 'hover:bg-slate-200/50'}`}
                    >
                      <span>{p.firstName} {p.lastName || ''}</span>
                      {isTagged && <span className="text-[10px] font-bold">TAGGED</span>}
                    </button>
                  );
                })}
                {filteredTagPeople.length === 0 && (
                  <p className="text-[10px] text-slate-400 text-center py-2">
                    {activePeople.length === 0 ? "Add family members to tag them!" : "No matching family members found."}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              id="photo-save-btn"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow transition-colors"
            >
              Save Memory Snapshot
            </button>

          </form>
        </div>

        {/* Right Column: Grid gallery of active memories */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 min-h-[500px]">
            
            {activePhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                <Camera className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-sm font-semibold">Gallery is currently empty.</p>
                <p className="text-xs mt-1">Select an image on the left panel to begin uploading.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {activePhotos.map((photo, idx) => {
                  const taggedPeople = activePeople.filter(p => photo.people?.includes(p.id));
                  return (
                    <div
                      key={photo.id}
                      onClick={() => setLightboxIndex(idx)}
                      className="group bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col"
                    >
                      
                      {/* Thumbnail frame */}
                      <div className="h-44 relative overflow-hidden bg-slate-900">
                        <img
                          src={photo.filePath}
                          alt={photo.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        
                        {/* Eye icon overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <div className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white">
                            <Eye className="w-5 h-5" />
                          </div>
                        </div>

                        {/* Top corner actions */}
                        <div className="absolute top-3 right-3 flex space-x-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setPhotoToDelete({ id: photo.id, title: photo.title })}
                            className="p-1.5 bg-black/60 rounded-lg text-rose-400 hover:text-rose-500 hover:bg-black/80 transition-colors"
                            title="Delete photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{photo.title}</h4>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center space-x-2">
                            {photo.date && <span>📅 {photo.date}</span>}
                            {photo.location && <span>📍 {photo.location}</span>}
                          </p>
                          {photo.description && (
                            <p className="text-xs text-slate-500 mt-2 line-clamp-2">{photo.description}</p>
                          )}
                          
                          {/* AI Summary note banner if exists */}
                          {photo.generatedSummary && (
                            <div className="mt-2.5 p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-lg text-[10px] text-emerald-800 dark:text-emerald-400 leading-normal">
                              <strong>AI Description:</strong> {photo.generatedSummary}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t flex flex-wrap justify-between items-center gap-2" onClick={e => e.stopPropagation()}>
                          {/* Tagged people count */}
                          <div className="flex items-center space-x-1 text-slate-400">
                            <Tag className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-500">
                              {photo.people?.length || 0} tagged
                            </span>
                          </div>

                          {/* Trigger Gemini Summary Button */}
                          <button
                            onClick={(e) => handleGenerateSummary(photo.id, e)}
                            disabled={isGeneratingSummary === photo.id}
                            className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[9px] uppercase tracking-wide rounded flex items-center space-x-1 disabled:opacity-50 transition-all cursor-pointer shadow-sm shadow-emerald-600/10"
                          >
                            <Sparkles className="w-3 h-3 text-emerald-300 animate-pulse" />
                            <span>{isGeneratingSummary === photo.id ? "Analyzing..." : "AI Describe"}</span>
                          </button>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* --- PHOTO LIGHTBOX OVERLAY PREVIEW --- */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-6 select-none animate-fade-in text-white">
          
          {/* Header row */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold">{activePhotos[lightboxIndex].title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {activePhotos[lightboxIndex].date && `📅 ${activePhotos[lightboxIndex].date}`}
                {activePhotos[lightboxIndex].location && ` · 📍 ${activePhotos[lightboxIndex].location}`}
              </p>
            </div>
            <button
              onClick={() => setLightboxIndex(null)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Core Image Slide Frame */}
          <div className="flex-1 flex items-center justify-center p-4 relative">
            
            {/* Left selector */}
            {lightboxIndex > 0 && (
              <button
                onClick={() => setLightboxIndex(lightboxIndex - 1)}
                className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Target Image rendering */}
            <img
              src={activePhotos[lightboxIndex].filePath}
              alt={activePhotos[lightboxIndex].title}
              className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
            />

            {/* Right selector */}
            {lightboxIndex < activePhotos.length - 1 && (
              <button
                onClick={() => setLightboxIndex(lightboxIndex + 1)}
                className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

          </div>

          {/* Footer Metadata */}
          <div className="max-w-3xl mx-auto text-center space-y-4 pb-6">
            {activePhotos[lightboxIndex].description && (
              <p className="text-sm text-slate-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                {activePhotos[lightboxIndex].description}
              </p>
            )}

            {activePhotos[lightboxIndex].generatedSummary && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 leading-relaxed">
                <strong>AI Descriptive Summary:</strong> {activePhotos[lightboxIndex].generatedSummary}
              </div>
            )}

            {/* Tagged people lists */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Tagged in photo:</span>
              {activePeople.filter(p => activePhotos[lightboxIndex].people?.includes(p.id)).map(p => (
                <span key={p.id} className="px-2.5 py-1 bg-white/10 rounded-full font-bold text-slate-200">
                  {p.firstName} {p.lastName || ''}
                </span>
              ))}
              {(!activePhotos[lightboxIndex].people || activePhotos[lightboxIndex].people?.length === 0) && (
                <span className="text-slate-500 italic">No tagged relatives</span>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Photo Delete Confirm Modal */}
      {photoToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-2.5 text-rose-600">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Delete Photo Memory?</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal">
              Are you sure you want to delete the photo <strong className="font-semibold text-slate-800 dark:text-slate-100">"{photoToDelete.title}"</strong>? This will remove it from the family album and un-tag any relatives.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="px-3.5 py-1.5 text-xs text-slate-500 border rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePhoto}
                className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
