import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, UserPlus, Upload, ChevronDown } from 'lucide-react';
import { useFamilyStore } from '../hooks/useFamilyStore';
import { Person } from '../types';
import SearchableSelect from './SearchableSelect';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newPersonId: string) => void;
}

export default function QuickAddModal({ isOpen, onClose, onSuccess }: QuickAddModalProps) {
  const { people, createPerson, createParentRelationship, showToast } = useFamilyStore();

  // Basic Info state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('unknown');
  const [birthYear, setBirthYear] = useState('');
  const [living, setLiving] = useState(true);
  const [profileImage, setProfileImage] = useState('');
  const [uploading, setUploading] = useState(false);

  // Father relationship state
  const [fatherSelectionMode, setFatherSelectionMode] = useState<'none' | 'select' | 'quick-create'>('none');
  const [selectedFatherId, setSelectedFatherId] = useState('');
  const [fatherFirstName, setFatherFirstName] = useState('');
  const [fatherLastName, setFatherLastName] = useState('');
  const [fatherLiving, setFatherLiving] = useState(true);
  const [fatherNature, setFatherNature] = useState<'biological' | 'non-biological'>('biological');
  const [fatherNonBioType, setFatherNonBioType] = useState<'adoptive' | 'foster' | 'guardian' | 'stepparent' | 'other'>('adoptive');

  // Mother relationship state
  const [motherSelectionMode, setMotherSelectionMode] = useState<'none' | 'select' | 'quick-create'>('none');
  const [selectedMotherId, setSelectedMotherId] = useState('');
  const [motherFirstName, setMotherFirstName] = useState('');
  const [motherLastName, setMotherLastName] = useState('');
  const [motherLiving, setMotherLiving] = useState(true);
  const [motherNature, setMotherNature] = useState<'biological' | 'non-biological'>('biological');
  const [motherNonBioType, setMotherNonBioType] = useState<'adoptive' | 'foster' | 'guardian' | 'stepparent' | 'other'>('adoptive');

  // Clear state on open/close
  useEffect(() => {
    if (isOpen) {
      setFirstName('');
      setLastName('');
      setGender('unknown');
      setBirthYear('');
      setLiving(true);
      setProfileImage('');
      
      setFatherSelectionMode('none');
      setSelectedFatherId('');
      setFatherFirstName('');
      setFatherLastName('');
      setFatherLiving(true);
      setFatherNature('biological');
      setFatherNonBioType('adoptive');

      setMotherSelectionMode('none');
      setSelectedMotherId('');
      setMotherFirstName('');
      setMotherLastName('');
      setMotherLiving(true);
      setMotherNature('biological');
      setMotherNonBioType('adoptive');
    }
  }, [isOpen]);

  // Filter existing candidates
  const eligibleFathers = people.filter(p => p.gender === 'male' || p.gender === 'unknown');
  const eligibleMothers = people.filter(p => p.gender === 'female' || p.gender === 'unknown');

  const fatherOptions = useMemo(() => {
    return eligibleFathers.map(f => ({
      id: f.id,
      label: `${f.firstName} ${f.lastName || ''} (${f.birthYear || 'No Birth Year'})`.trim()
    }));
  }, [eligibleFathers]);

  const motherOptions = useMemo(() => {
    return eligibleMothers.map(m => ({
      id: m.id,
      label: `${m.firstName} ${m.lastName || ''} (${m.birthYear || 'No Birth Year'})`.trim()
    }));
  }, [eligibleMothers]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setProfileImage(data.filePath);
      showToast("Profile photo uploaded successfully!");
    } catch (err) {
      showToast("Failed to upload image", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      showToast("First name is required.", "error");
      return;
    }

    try {
      // 1. If quick creating father, do it first
      let fatherId = selectedFatherId;
      if (fatherSelectionMode === 'quick-create' && fatherFirstName.trim()) {
        const f = await createPerson({
          firstName: fatherFirstName.trim(),
          lastName: fatherLastName.trim() || undefined,
          gender: 'male',
          living: fatherLiving,
        });
        fatherId = f.id;
      }

      // 2. If quick creating mother, do it first
      let motherId = selectedMotherId;
      if (motherSelectionMode === 'quick-create' && motherFirstName.trim()) {
        const m = await createPerson({
          firstName: motherFirstName.trim(),
          lastName: motherLastName.trim() || undefined,
          gender: 'female',
          living: motherLiving,
        });
        motherId = m.id;
      }

      // 3. Create the target person
      const newPerson = await createPerson({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        gender: gender || 'unknown',
        birthYear: birthYear ? parseInt(birthYear) : undefined,
        living,
        profileImage: profileImage || undefined,
      });

      // 4. Link parents if specified
      if (fatherSelectionMode !== 'none' && fatherId) {
        await createParentRelationship({
          parentId: fatherId,
          childId: newPerson.id,
          parentRole: 'father',
          relationshipNature: fatherNature,
          nonBiologicalType: fatherNature === 'non-biological' ? fatherNonBioType : undefined,
        });
      }

      if (motherSelectionMode !== 'none' && motherId) {
        await createParentRelationship({
          parentId: motherId,
          childId: newPerson.id,
          parentRole: 'mother',
          relationshipNature: motherNature,
          nonBiologicalType: motherNature === 'non-biological' ? motherNonBioType : undefined,
        });
      }

      showToast(`Successfully created ${newPerson.firstName}!`);
      onClose();
      if (onSuccess) {
        onSuccess(newPerson.id);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to create person and relationships", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Add Person</h2>
              <p className="text-xs text-slate-500">Quickly add a family member and map relationships</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: Basic Information */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Basic Information</h3>
            <div className="flex flex-col md:flex-row gap-6">
              
              {/* Profile image picker */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 transition-colors flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/40 overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-3">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                      <span className="text-[10px] text-slate-500 font-medium">Upload Image</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                </div>
                {profileImage && (
                  <button 
                    type="button" 
                    onClick={() => setProfileImage('')}
                    className="text-xs text-rose-500 font-medium hover:underline mt-2"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Basic Fields Grid */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">First Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="e.g. Sofia"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Last Name (Optional)</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="e.g. El Amrani"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Gender</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                  >
                    <option value="unknown">Unknown / Not Specified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Birth Year (Optional)</label>
                  <input
                    type="number"
                    value={birthYear}
                    onChange={e => setBirthYear(e.target.value)}
                    placeholder="e.g. 1985"
                    min="1800"
                    max="2100"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Life Status</label>
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2.5 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        checked={living === true}
                        onChange={() => setLiving(true)}
                        className="w-4.5 h-4.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Living</span>
                    </label>
                    <label className="flex items-center space-x-2.5 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        checked={living === false}
                        onChange={() => setLiving(false)}
                        className="w-4.5 h-4.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Deceased</span>
                    </label>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Section 2: Father Selection & Progressive Disclosure */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Father Relationship</h3>
              <div className="flex space-x-1.5">
                <button
                  type="button"
                  onClick={() => setFatherSelectionMode(fatherSelectionMode === 'select' ? 'none' : 'select')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${fatherSelectionMode === 'select' ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  Select Existing
                </button>
                <button
                  type="button"
                  onClick={() => setFatherSelectionMode(fatherSelectionMode === 'quick-create' ? 'none' : 'quick-create')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 ${fatherSelectionMode === 'quick-create' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Quick Create Father</span>
                </button>
              </div>
            </div>

            {/* Father options display */}
            {fatherSelectionMode === 'select' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Select Father</label>
                  <SearchableSelect
                    options={fatherOptions}
                    value={selectedFatherId}
                    onChange={setSelectedFatherId}
                    placeholder="[ Select an existing father ]"
                    searchPlaceholder="Search fathers..."
                  />
                </div>

                {/* Biological vs Non-biological selection */}
                {selectedFatherId && renderRelationshipNatureControls('father', fatherNature, setFatherNature, fatherNonBioType, setFatherNonBioType)}
              </div>
            )}

            {fatherSelectionMode === 'quick-create' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={fatherFirstName}
                      onChange={e => setFatherFirstName(e.target.value)}
                      placeholder="Father's First Name"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Last Name (Optional)</label>
                    <input
                      type="text"
                      value={fatherLastName}
                      onChange={e => setFatherLastName(e.target.value)}
                      placeholder="Last Name"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Life Status</label>
                    <div className="flex items-center space-x-4 mt-1">
                      <label className="flex items-center space-x-1 cursor-pointer text-xs font-medium">
                        <input
                          type="radio"
                          checked={fatherLiving === true}
                          onChange={() => setFatherLiving(true)}
                          className="w-3.5 h-3.5"
                        />
                        <span>Living</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer text-xs font-medium">
                        <input
                          type="radio"
                          checked={fatherLiving === false}
                          onChange={() => setFatherLiving(false)}
                          className="w-3.5 h-3.5"
                        />
                        <span>Deceased</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Relationship nature */}
                {renderRelationshipNatureControls('father', fatherNature, setFatherNature, fatherNonBioType, setFatherNonBioType)}
              </div>
            )}
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Section 3: Mother Selection & Progressive Disclosure */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mother Relationship</h3>
              <div className="flex space-x-1.5">
                <button
                  type="button"
                  onClick={() => setMotherSelectionMode(motherSelectionMode === 'select' ? 'none' : 'select')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${motherSelectionMode === 'select' ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  Select Existing
                </button>
                <button
                  type="button"
                  onClick={() => setMotherSelectionMode(motherSelectionMode === 'quick-create' ? 'none' : 'quick-create')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 ${motherSelectionMode === 'quick-create' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Quick Create Mother</span>
                </button>
              </div>
            </div>

            {/* Mother options display */}
            {motherSelectionMode === 'select' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Select Mother</label>
                  <SearchableSelect
                    options={motherOptions}
                    value={selectedMotherId}
                    onChange={setSelectedMotherId}
                    placeholder="[ Select an existing mother ]"
                    searchPlaceholder="Search mothers..."
                  />
                </div>

                {/* Biological vs Non-biological selection */}
                {selectedMotherId && renderRelationshipNatureControls('mother', motherNature, setMotherNature, motherNonBioType, setMotherNonBioType)}
              </div>
            )}

            {motherSelectionMode === 'quick-create' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={motherFirstName}
                      onChange={e => setMotherFirstName(e.target.value)}
                      placeholder="Mother's First Name"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Last Name (Optional)</label>
                    <input
                      type="text"
                      value={motherLastName}
                      onChange={e => setMotherLastName(e.target.value)}
                      placeholder="Last Name"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Life Status</label>
                    <div className="flex items-center space-x-4 mt-1">
                      <label className="flex items-center space-x-1 cursor-pointer text-xs font-medium">
                        <input
                          type="radio"
                          checked={motherLiving === true}
                          onChange={() => setMotherLiving(true)}
                          className="w-3.5 h-3.5"
                        />
                        <span>Living</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer text-xs font-medium">
                        <input
                          type="radio"
                          checked={motherLiving === false}
                          onChange={() => setMotherLiving(false)}
                          className="w-3.5 h-3.5"
                        />
                        <span>Deceased</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Relationship nature */}
                {renderRelationshipNatureControls('mother', motherNature, setMotherNature, motherNonBioType, setMotherNonBioType)}
              </div>
            )}
          </div>

        </form>

        {/* Footer actions */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            id="quick-add-save-btn"
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-lg shadow-emerald-600/15 flex items-center space-x-2"
          >
            <span>Add Person</span>
          </button>
        </div>

      </div>
    </div>
  );

  // Helper render for relationship nature with progressive disclosure
  function renderRelationshipNatureControls(
    label: 'father' | 'mother',
    nature: 'biological' | 'non-biological',
    setNature: (n: 'biological' | 'non-biological') => void,
    nonBioType: any,
    setNonBioType: (t: any) => void
  ) {
    return (
      <div className="mt-3.5 space-y-3 pt-3.5 border-t border-slate-200/60 dark:border-slate-800/80">
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Relationship</span>
          <div className="flex items-center space-x-5">
            <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                checked={nature === 'biological'}
                onChange={() => setNature('biological')}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Biological</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                checked={nature === 'non-biological'}
                onChange={() => setNature('non-biological')}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Non-biological</span>
            </label>
          </div>
        </div>

        {/* PROGRESSIVE DISCLOSURE: Show type only when Non-biological is selected */}
        {nature === 'non-biological' && (
          <div className="mt-3.5 max-w-xs animate-fade-in">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Type</label>
            <select
              value={nonBioType}
              onChange={e => setNonBioType(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
            >
              <option value="adoptive">Adoptive</option>
              <option value="foster">Foster</option>
              <option value="guardian">Guardian</option>
              <option value="stepparent">Stepparent</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}
      </div>
    );
  }
}
