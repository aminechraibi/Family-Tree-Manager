import React, { useState, useMemo } from 'react';
import { User, Heart, Image as ImageIcon, Calendar, FileText, Plus, Upload, Trash2, Check, ChevronDown, ChevronUp, Clock, AlertTriangle, GitMerge } from 'lucide-react';
import { useFamilyStore } from '../hooks/useFamilyStore';
import { Person, ParentRelationship, CoupleRelationship, Event, Photo } from '../types';
import { calculateRelationships } from '../utils/relationshipCalculator';
import SearchableSelect from './SearchableSelect';
import DeleteConfirmModal from './DeleteConfirmModal';

export default function PersonProfile() {
  const { 
    people, parentRelationships, coupleRelationships, events, photos, 
    updatePerson, createParentRelationship, deleteParentRelationship, 
    createCoupleRelationship, deleteCoupleRelationship, createEvent, 
    createPhoto, deletePhoto, showToast, setTab, fetchData, deletePerson 
  } = useFamilyStore();

  const { activePersonId } = useFamilyStore();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'family' | 'timeline' | 'photos' | 'notes'>('overview');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Collapsible edit sections state
  const [isEditBasicOpen, setIsEditBasicOpen] = useState(true); // Basic open by default!
  const [isEditCareerOpen, setIsEditCareerOpen] = useState(false);
  const [isEditCustomOpen, setIsEditCustomOpen] = useState(false);

  // --- Relatives Mapping and Add State Toggles ---
  const [isAddSpouseOpen, setIsAddSpouseOpen] = useState(false);
  const [spouseId, setSpouseId] = useState('');
  const [coupleType, setCoupleType] = useState<'spouse' | 'partner'>('spouse');

  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [childId, setChildId] = useState('');
  const [childRole, setChildRole] = useState<'father' | 'mother'>('father');
  const [childNature, setChildNature] = useState<'biological' | 'non-biological'>('biological');
  const [childNonBioType, setChildNonBioType] = useState<'adoptive' | 'foster' | 'guardian' | 'stepparent' | 'other'>('adoptive');

  const [isAddParentOpen, setIsAddParentOpen] = useState(false);
  const [parentId, setParentId] = useState('');
  const [parentRole, setParentRole] = useState<'father' | 'mother'>('father');
  const [parentNature, setParentNature] = useState<'biological' | 'non-biological'>('biological');
  const [parentNonBioType, setParentNonBioType] = useState<'adoptive' | 'foster' | 'guardian' | 'stepparent' | 'other'>('adoptive');

  // --- Add Event State ---
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<Event['type']>('custom');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDesc, setEventDesc] = useState('');

  // --- Add Photo State ---
  const [isAddPhotoOpen, setIsAddPhotoOpen] = useState(false);
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoDate, setPhotoDate] = useState('');
  const [photoLocation, setPhotoLocation] = useState('');
  const [photoDesc, setPhotoDesc] = useState('');
  const [photoPath, setPhotoPath] = useState('');
  const [uploading, setUploading] = useState(false);

  // Fetch target profile person
  const person = useMemo(() => {
    return people.find(p => p.id === activePersonId && !p.isDeleted) || null;
  }, [people, activePersonId]);

  // Edit details local input bindings
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editBirthYear, setEditBirthYear] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editBirthPlace, setEditBirthPlace] = useState('');
  const [editLiving, setEditLiving] = useState(true);
  const [editDeathDate, setEditDeathDate] = useState('');
  const [editDeathPlace, setEditDeathPlace] = useState('');
  const [editBurialPlace, setEditBurialPlace] = useState('');
  const [editOccupation, setEditOccupation] = useState('');
  const [editCurrentLocation, setEditCurrentLocation] = useState('');
  const [editBio, setEditBio] = useState('');

  // Synchronize input fields when person loads
  useMemo(() => {
    if (person) {
      setEditFirstName(person.firstName || '');
      setEditLastName(person.lastName || '');
      setEditNickname(person.nickname || '');
      setEditGender(person.gender || 'unknown');
      setEditBirthYear(person.birthYear ? String(person.birthYear) : '');
      setEditBirthDate(person.birthDate || '');
      setEditBirthPlace(person.birthPlace || '');
      setEditLiving(person.living !== false);
      setEditDeathDate(person.deathDate || '');
      setEditDeathPlace(person.deathPlace || '');
      setEditBurialPlace(person.burialPlace || '');
      setEditOccupation(person.occupation || '');
      setEditCurrentLocation(person.currentLocation || '');
      setEditBio(person.bio || '');
    }
  }, [person]);

  if (!person) {
    return (
      <div className="flex-1 p-12 text-center text-slate-400">
        Person profile not found or has been deleted.
      </div>
    );
  }

  // Calculated relatives list
  const relatives = calculateRelationships(person.id, people, parentRelationships, coupleRelationships);

  const immediateFamily = {
    parents: relatives.filter(r => r.relation.startsWith('Father') || r.relation.startsWith('Mother') || r.relation.startsWith('Parent')),
    siblings: relatives.filter(r => r.relation.includes('Brother') || r.relation.includes('Sister') || r.relation.includes('Sibling')),
    spouses: relatives.filter(r => r.relation.includes('Spouse') || r.relation.includes('Partner') || r.relation.includes('Husband') || r.relation.includes('Wife')),
    children: relatives.filter(r => r.relation.includes('Son') || r.relation.includes('Daughter') || r.relation.includes('Child')),
  };

  // Chronicled Events filtered to this person
  const personEvents = events
    .filter(ev => !ev.isDeleted && ev.people?.some(p => p.personId === person.id))
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });

  // Photos tagged with this person
  const personPhotos = photos.filter(p => !p.isDeleted && p.people?.includes(person.id));

  // --- ACTION HANDLERS ---
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePerson(person.id, {
        firstName: editFirstName,
        lastName: editLastName || undefined,
        nickname: editNickname || undefined,
        gender: editGender as any,
        birthYear: editBirthYear ? parseInt(editBirthYear) : undefined,
        birthDate: editBirthDate || undefined,
        birthPlace: editBirthPlace || undefined,
        living: editLiving,
        deathDate: editLiving ? undefined : (editDeathDate || undefined),
        deathPlace: editLiving ? undefined : (editDeathPlace || undefined),
        burialPlace: editLiving ? undefined : (editBurialPlace || undefined),
        occupation: editOccupation || undefined,
        currentLocation: editCurrentLocation || undefined,
        bio: editBio || undefined,
      });
      showToast("Profile updated successfully!");
    } catch (err: any) {
      showToast(err.message || "Failed to update profile", "error");
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      await updatePerson(person.id, { profileImage: data.filePath });
      showToast("Profile image updated!");
    } catch (err) {
      showToast("Image upload failed", "error");
    }
  };

  const handleAddSpouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spouseId) return;

    try {
      await createCoupleRelationship({
        personId1: person.id,
        personId2: spouseId,
        relationshipType: coupleType,
      });
      showToast("Spouse/Partner linked successfully!");
      setIsAddSpouseOpen(false);
      setSpouseId('');
    } catch (err: any) {
      showToast(err.message || "Failed to link couple", "error");
    }
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childId) return;

    try {
      // Create child parent-relationship link
      await createParentRelationship({
        parentId: person.id,
        childId: childId,
        parentRole: childRole,
        relationshipNature: childNature,
        nonBiologicalType: childNature === 'non-biological' ? childNonBioType : undefined,
      });
      showToast("Child linked successfully!");
      setIsAddChildOpen(false);
      setChildId('');
    } catch (err: any) {
      showToast(err.message || "Failed to link child", "error");
    }
  };

  const handleAddParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentId) return;

    try {
      await createParentRelationship({
        parentId: parentId,
        childId: person.id,
        parentRole: parentRole,
        relationshipNature: parentNature,
        nonBiologicalType: parentNature === 'non-biological' ? parentNonBioType : undefined,
      });
      showToast("Parent linked successfully!");
      setIsAddParentOpen(false);
      setParentId('');
    } catch (err: any) {
      showToast(err.message || "Failed to link parent", "error");
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    try {
      await createEvent({
        type: eventType,
        title: eventTitle.trim(),
        date: eventDate || undefined,
        location: eventLocation || undefined,
        description: eventDesc || undefined,
        people: [{ personId: person.id, role: 'primary' }]
      });
      showToast("Milestone added to timeline!");
      setIsAddEventOpen(false);
      setEventTitle('');
      setEventDate('');
      setEventLocation('');
      setEventDesc('');
    } catch (err) {
      showToast("Failed to create event", "error");
    }
  };

  const handleConfirmDeleteProfile = async (id: string) => {
    try {
      const name = `${person.firstName} ${person.lastName || ''}`.trim();
      await deletePerson(id);
      showToast(`Successfully deleted ${name}`);
      setTab('people');
    } catch (err) {
      showToast("Failed to delete profile", "error");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      showToast("Photo uploaded successfully! Now complete metadata and save.");
    } catch (err) {
      showToast("Photo upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPath || !photoTitle.trim()) return;

    try {
      await createPhoto({
        filePath: photoPath,
        title: photoTitle.trim(),
        date: photoDate || undefined,
        location: photoLocation || undefined,
        description: photoDesc || undefined,
        people: [person.id]
      });
      showToast("Photo saved to gallery and tagged!");
      setIsAddPhotoOpen(false);
      setPhotoTitle('');
      setPhotoDate('');
      setPhotoLocation('');
      setPhotoDesc('');
      setPhotoPath('');
    } catch (err) {
      showToast("Failed to save photo", "error");
    }
  };

  // Candidates for relative drops (avoiding self-linkages)
  const relativeCandidates = people.filter(p => p.id !== person.id && !p.isDeleted);

  const candidateOptions = useMemo(() => {
    return relativeCandidates.map(c => ({
      id: c.id,
      label: `${c.firstName} ${c.lastName || ''} (${c.birthYear || 'No Birth Year'})`.trim()
    }));
  }, [relativeCandidates]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8 space-y-6">
      
      {/* Profile Cover/Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col md:flex-row items-center gap-6">
        
        {/* Profile Image with upload overlay */}
        <div className="relative group w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200">
          {person.profileImage ? (
            <img src={person.profileImage} alt={person.firstName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-3xl">
              {person.firstName[0]}
            </div>
          )}
          <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer flex flex-col items-center justify-center text-white transition-opacity text-[10px] font-bold">
            <Upload className="w-4 h-4 mb-1" />
            <span>Upload Photo</span>
            <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" />
          </label>
        </div>

        {/* Profile Info Details */}
        <div className="text-center md:text-left flex-1 min-w-0">
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {person.firstName} {person.lastName || ''}
            </h2>
            {person.nickname && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-800 text-xs rounded-md font-semibold">
                "{person.nickname}"
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {person.birthYear ? `Born: ${person.birthYear}` : 'Birth date not set'} · {person.living ? 'Living' : 'Deceased'}
          </p>
          
          {/* Quick link button to set focus in family tree */}
          <button
            onClick={() => setTab('tree')}
            className="mt-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1.5 mx-auto md:mx-0"
          >
            <GitMerge className="w-4 h-4" />
            <span>View parent branch in Family Tree</span>
          </button>
        </div>

        {/* Delete Profile button */}
        <div className="shrink-0 w-full md:w-auto flex justify-center md:justify-end md:self-start">
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer border border-rose-100 dark:border-rose-900/40 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Profile</span>
          </button>
        </div>

      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 rounded-t-2xl shadow-sm">
        {(['overview', 'family', 'timeline', 'photos', 'notes'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-5 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeSubTab === tab 
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-white dark:bg-slate-900 rounded-b-2xl border-x border-b border-slate-100 dark:border-slate-800 p-6 min-h-[400px]">
        
        {/* TAB 1: OVERVIEW & EDIT DETAILS */}
        {activeSubTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Summary cards */}
            <div className="lg:col-span-1 space-y-5">
              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Life Milestones</span>
                <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                  <p><strong>Birth Date:</strong> {person.birthDate || 'N/A'}</p>
                  <p><strong>Birth Place:</strong> {person.birthPlace || 'N/A'}</p>
                  {!person.living && (
                    <>
                      <p><strong>Death Date:</strong> {person.deathDate || 'N/A'}</p>
                      <p><strong>Death Place:</strong> {person.deathPlace || 'N/A'}</p>
                      <p><strong>Burial Place:</strong> {person.burialPlace || 'N/A'}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Career & Residency</span>
                <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                  <p><strong>Occupation:</strong> {person.occupation || 'N/A'}</p>
                  <p><strong>Location:</strong> {person.currentLocation || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Right: Collapsible Details Editor */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Edit Personal Details</h3>
              
              <form onSubmit={handleSaveDetails} className="space-y-4">
                
                {/* 1. Basic Collapsible section (OPEN BY DEFAULT) */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsEditBasicOpen(!isEditBasicOpen)}
                    className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider"
                  >
                    <span>1. Basic Biographical Info</span>
                    {isEditBasicOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isEditBasicOpen && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-slate-900">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">First Name</label>
                        <input
                          type="text"
                          required
                          value={editFirstName}
                          onChange={e => setEditFirstName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Last Name</label>
                        <input
                          type="text"
                          value={editLastName}
                          onChange={e => setEditLastName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Nickname</label>
                        <input
                          type="text"
                          value={editNickname}
                          onChange={e => setEditNickname(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Gender</label>
                        <select
                          value={editGender}
                          onChange={e => setEditGender(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 bg-transparent"
                        >
                          <option value="unknown">Unknown</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Birth Year</label>
                        <input
                          type="number"
                          value={editBirthYear}
                          onChange={e => setEditBirthYear(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Birth Date (YYYY-MM-DD)</label>
                        <input
                          type="text"
                          value={editBirthDate}
                          onChange={e => setEditBirthDate(e.target.value)}
                          placeholder="e.g. 1954-07-23"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 bg-transparent"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Birth Place</label>
                        <input
                          type="text"
                          value={editBirthPlace}
                          onChange={e => setEditBirthPlace(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 bg-transparent"
                        />
                      </div>

                      <div className="sm:col-span-2 py-2 border-t border-slate-100 dark:border-slate-800/80">
                        <label className="block text-xs font-semibold text-slate-500 mb-2">Living Status</label>
                        <div className="flex items-center space-x-6">
                          <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                            <input type="radio" checked={editLiving === true} onChange={() => setEditLiving(true)} className="w-4 h-4" />
                            <span>Living</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                            <input type="radio" checked={editLiving === false} onChange={() => setEditLiving(false)} className="w-4 h-4" />
                            <span>Deceased</span>
                          </label>
                        </div>
                      </div>

                      {!editLiving && (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Death Date</label>
                            <input
                              type="text"
                              value={editDeathDate}
                              onChange={e => setEditDeathDate(e.target.value)}
                              placeholder="YYYY-MM-DD"
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Death Place</label>
                            <input
                              type="text"
                              value={editDeathPlace}
                              onChange={e => setEditDeathPlace(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 bg-transparent"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Burial Place / Cemetery</label>
                            <input
                              type="text"
                              value={editBurialPlace}
                              onChange={e => setEditBurialPlace(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 bg-transparent"
                            />
                          </div>
                        </>
                      )}

                    </div>
                  )}
                </div>

                {/* 2. Career Collapsible Section */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsEditCareerOpen(!isEditCareerOpen)}
                    className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider"
                  >
                    <span>2. Career & Current Location</span>
                    {isEditCareerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isEditCareerOpen && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-slate-900">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Occupation</label>
                        <input
                          type="text"
                          value={editOccupation}
                          onChange={e => setEditOccupation(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Current Residence / Location</label>
                        <input
                          type="text"
                          value={editCurrentLocation}
                          onChange={e => setEditCurrentLocation(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Custom Bio collapsible section */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsEditCustomOpen(!isEditCustomOpen)}
                    className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider"
                  >
                    <span>3. Custom Biography / Description</span>
                    {isEditCustomOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isEditCustomOpen && (
                    <div className="p-4 bg-white dark:bg-slate-900">
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Biography Notes</label>
                      <textarea
                        rows={4}
                        value={editBio}
                        onChange={e => setEditBio(e.target.value)}
                        placeholder="Write a brief freeform life story or add custom details..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-transparent"
                      />
                    </div>
                  )}
                </div>

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-md transition-colors"
                  >
                    Save Changes
                  </button>
                </div>

              </form>

            </div>

          </div>
        )}

        {/* TAB 2: IMMEDIATE FAMILY LINKS */}
        {activeSubTab === 'family' && (
          <div className="space-y-8 animate-fade-in">
            
            <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 dark:border-slate-850 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Immediate Relations</h3>
                <p className="text-xs text-slate-500 mt-0.5">Map spouses, parents, and children with accurate biological or custom natures</p>
              </div>
              <div className="flex flex-wrap gap-2">
                
                {/* Spouse button */}
                <button
                  onClick={() => setIsAddSpouseOpen(!isAddSpouseOpen)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center space-x-1 transition-colors"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>+ Link Spouse/Partner</span>
                </button>

                {/* Child button */}
                <button
                  onClick={() => setIsAddChildOpen(!isAddChildOpen)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center space-x-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-500" />
                  <span>+ Link Child</span>
                </button>

                {/* Parent button */}
                <button
                  onClick={() => setIsAddParentOpen(!isAddParentOpen)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center space-x-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-500" />
                  <span>+ Link Parent</span>
                </button>

              </div>
            </div>

            {/* --- INLINE LINK FORMS --- */}
            {isAddSpouseOpen && (
              <form onSubmit={handleAddSpouse} className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 max-w-lg">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Link Spouse or Partner</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Select Candidate</label>
                    <SearchableSelect
                      options={candidateOptions}
                      value={spouseId}
                      onChange={setSpouseId}
                      placeholder="[ Choose spouse/partner ]"
                      searchPlaceholder="Search spouses..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Relationship Type</label>
                    <select value={coupleType} onChange={e => setCoupleType(e.target.value as any)} className="w-full px-2.5 py-1.5 bg-white text-xs border rounded">
                      <option value="spouse">Spouse (Married)</option>
                      <option value="partner">Partner (Registered/Unmarried)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-2 border-t">
                  <button type="button" onClick={() => setIsAddSpouseOpen(false)} className="px-3 py-1.5 text-xs text-slate-500">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded font-bold">Link Spouse</button>
                </div>
              </form>
            )}

            {isAddChildOpen && (
              <form onSubmit={handleAddChild} className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 max-w-lg">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Link Child</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Select Candidate Child</label>
                    <SearchableSelect
                      options={candidateOptions}
                      value={childId}
                      onChange={setChildId}
                      placeholder="[ Choose child ]"
                      searchPlaceholder="Search children..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">My Role to Child</label>
                    <select value={childRole} onChange={e => setChildRole(e.target.value as any)} className="w-full px-2.5 py-1.5 bg-white text-xs border rounded">
                      <option value="father">I am the Father</option>
                      <option value="mother">I am the Mother</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Relationship Nature</label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-1 text-xs font-semibold cursor-pointer">
                      <input type="radio" checked={childNature === 'biological'} onChange={() => setChildNature('biological')} />
                      <span>Biological</span>
                    </label>
                    <label className="flex items-center space-x-1 text-xs font-semibold cursor-pointer">
                      <input type="radio" checked={childNature === 'non-biological'} onChange={() => setChildNature('non-biological')} />
                      <span>Non-biological</span>
                    </label>
                  </div>
                </div>

                {/* PROGRESSIVE DISCLOSURE */}
                {childNature === 'non-biological' && (
                  <div className="max-w-xs">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Non-Biological Type</label>
                    <select value={childNonBioType} onChange={e => setChildNonBioType(e.target.value as any)} className="w-full px-2.5 py-1.5 bg-white text-xs border rounded">
                      <option value="adoptive">Adoptive</option>
                      <option value="foster">Foster</option>
                      <option value="guardian">Guardian</option>
                      <option value="stepparent">Stepparent</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2 border-t">
                  <button type="button" onClick={() => setIsAddChildOpen(false)} className="px-3 py-1.5 text-xs text-slate-500">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">Link Child</button>
                </div>
              </form>
            )}

            {isAddParentOpen && (
              <form onSubmit={handleAddParent} className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 max-w-lg">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Link Parent</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Select Candidate Parent</label>
                    <SearchableSelect
                      options={candidateOptions}
                      value={parentId}
                      onChange={setParentId}
                      placeholder="[ Choose parent ]"
                      searchPlaceholder="Search parents..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Parent's Role</label>
                    <select value={parentRole} onChange={e => setParentRole(e.target.value as any)} className="w-full px-2.5 py-1.5 bg-white text-xs border rounded">
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Relationship Nature</label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-1 text-xs font-semibold cursor-pointer">
                      <input type="radio" checked={parentNature === 'biological'} onChange={() => setParentNature('biological')} />
                      <span>Biological</span>
                    </label>
                    <label className="flex items-center space-x-1 text-xs font-semibold cursor-pointer">
                      <input type="radio" checked={parentNature === 'non-biological'} onChange={() => setParentNature('non-biological')} />
                      <span>Non-biological</span>
                    </label>
                  </div>
                </div>

                {/* PROGRESSIVE DISCLOSURE */}
                {parentNature === 'non-biological' && (
                  <div className="max-w-xs">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Non-Biological Type</label>
                    <select value={parentNonBioType} onChange={e => setParentNonBioType(e.target.value as any)} className="w-full px-2.5 py-1.5 bg-white text-xs border rounded">
                      <option value="adoptive">Adoptive</option>
                      <option value="foster">Foster</option>
                      <option value="guardian">Guardian</option>
                      <option value="stepparent">Stepparent</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2 border-t">
                  <button type="button" onClick={() => setIsAddParentOpen(false)} className="px-3 py-1.5 text-xs text-slate-500">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold">Link Parent</button>
                </div>
              </form>
            )}

            {/* --- FAMILY SECTIONS DISPLAY --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Spouses */}
              <div className="p-4 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">Spouses & Partners</span>
                <div className="space-y-3">
                  {immediateFamily.spouses.map(({ person: sp }) => (
                    <div key={sp.id} className="flex items-center justify-between bg-white dark:bg-slate-950 p-2.5 rounded-lg border">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded overflow-hidden text-xs bg-slate-100 flex items-center justify-center font-bold">
                          {sp.profileImage ? <img src={sp.profileImage} className="w-full h-full object-cover" /> : sp.firstName[0]}
                        </div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{sp.firstName} {sp.lastName || ''}</span>
                      </div>
                      <button onClick={() => setTab('profile', sp.id)} className="text-[10px] font-bold text-emerald-600 hover:underline">View Profile →</button>
                    </div>
                  ))}
                  {immediateFamily.spouses.length === 0 && (
                    <p className="text-xs text-slate-400">No partner mapped. Click Link Spouse above.</p>
                  )}
                </div>
              </div>

              {/* Parents */}
              <div className="p-4 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">Parents</span>
                <div className="space-y-3">
                  {immediateFamily.parents.map(({ person: pa, relation }) => (
                    <div key={pa.id} className="flex items-center justify-between bg-white dark:bg-slate-950 p-2.5 rounded-lg border">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded overflow-hidden text-xs bg-slate-100 flex items-center justify-center font-bold">
                          {pa.profileImage ? <img src={pa.profileImage} className="w-full h-full object-cover" /> : pa.firstName[0]}
                        </div>
                        <div>
                          <span className="text-xs font-semibold block text-slate-800 dark:text-slate-200">{pa.firstName} {pa.lastName || ''}</span>
                          <span className="text-[9px] font-bold text-emerald-600 uppercase">{relation}</span>
                        </div>
                      </div>
                      <button onClick={() => setTab('profile', pa.id)} className="text-[10px] font-bold text-emerald-600 hover:underline">View Profile</button>
                    </div>
                  ))}
                  {immediateFamily.parents.length === 0 && (
                    <p className="text-xs text-slate-400">No parents mapped yet.</p>
                  )}
                </div>
              </div>

              {/* Siblings */}
              <div className="p-4 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">Siblings</span>
                <div className="space-y-3">
                  {immediateFamily.siblings.map(({ person: sib, relation }) => (
                    <div key={sib.id} className="flex items-center justify-between bg-white dark:bg-slate-950 p-2.5 rounded-lg border">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded overflow-hidden text-xs bg-slate-100 flex items-center justify-center font-bold">
                          {sib.profileImage ? <img src={sib.profileImage} className="w-full h-full object-cover" /> : sib.firstName[0]}
                        </div>
                        <div>
                          <span className="text-xs font-semibold block text-slate-800 dark:text-slate-200">{sib.firstName} {sib.lastName || ''}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{relation}</span>
                        </div>
                      </div>
                      <button onClick={() => setTab('profile', sib.id)} className="text-[10px] font-bold text-emerald-600 hover:underline">View Profile</button>
                    </div>
                  ))}
                  {immediateFamily.siblings.length === 0 && (
                    <p className="text-xs text-slate-400">No siblings registered through parent matching.</p>
                  )}
                </div>
              </div>

              {/* Children */}
              <div className="p-4 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">Children</span>
                <div className="space-y-3">
                  {immediateFamily.children.map(({ person: ch, relation }) => (
                    <div key={ch.id} className="flex items-center justify-between bg-white dark:bg-slate-950 p-2.5 rounded-lg border">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded overflow-hidden text-xs bg-slate-100 flex items-center justify-center font-bold">
                          {ch.profileImage ? <img src={ch.profileImage} className="w-full h-full object-cover" /> : ch.firstName[0]}
                        </div>
                        <div>
                          <span className="text-xs font-semibold block text-slate-800 dark:text-slate-200">{ch.firstName} {ch.lastName || ''}</span>
                          <span className="text-[9px] font-bold text-blue-600 uppercase">{relation}</span>
                        </div>
                      </div>
                      <button onClick={() => setTab('profile', ch.id)} className="text-[10px] font-bold text-emerald-600 hover:underline">View Profile</button>
                    </div>
                  ))}
                  {immediateFamily.children.length === 0 && (
                    <p className="text-xs text-slate-400">No children mapped. Click Link Child above.</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: CHRONICLED TIMELINE */}
        {activeSubTab === 'timeline' && (
          <div className="space-y-6 animate-fade-in">
            
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Biographical Milestones</h3>
                <p className="text-xs text-slate-500">A chronicled timeline of major family event logs and achievements</p>
              </div>
              <button
                onClick={() => setIsEditBasicOpen(true) || setIsAddEventOpen(!isAddEventOpen)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Milestone</span>
              </button>
            </div>

            {/* Event Form */}
            {isAddEventOpen && (
              <form onSubmit={handleAddEvent} className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 max-w-lg">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Add Milestone Log</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Title *</label>
                    <input type="text" required value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="e.g. Completed High School" className="w-full px-2.5 py-1.5 bg-white text-xs border rounded" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Milestone Type</label>
                    <select value={eventType} onChange={e => setEventType(e.target.value as any)} className="w-full px-2.5 py-1.5 bg-white text-xs border rounded">
                      <option value="birth">Birth</option>
                      <option value="graduation">Graduation</option>
                      <option value="employment">Employment</option>
                      <option value="marriage">Marriage</option>
                      <option value="migration">Migration</option>
                      <option value="death">Death</option>
                      <option value="custom">Custom Milestone</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Date (YYYY-MM-DD)</label>
                    <input type="text" value={eventDate} onChange={e => setEventDate(e.target.value)} placeholder="e.g. 1982-04-12" className="w-full px-2.5 py-1.5 bg-white text-xs border rounded" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Location</label>
                    <input type="text" value={eventLocation} onChange={e => setEventLocation(e.target.value)} placeholder="e.g. Rabat, Morocco" className="w-full px-2.5 py-1.5 bg-white text-xs border rounded" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Description</label>
                  <textarea rows={2} value={eventDesc} onChange={e => setEventDesc(e.target.value)} className="w-full px-2.5 py-1.5 bg-white text-xs border rounded" />
                </div>
                <div className="flex justify-end space-x-2 pt-2 border-t">
                  <button type="button" onClick={() => setIsAddEventOpen(false)} className="px-3 py-1.5 text-xs text-slate-500">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold">Add Event</button>
                </div>
              </form>
            )}

            {/* Timeline Tree list */}
            {personEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No custom milestones logged for {person.firstName} yet. Click Add Milestone!
              </div>
            ) : (
              <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-6">
                {personEvents.map(ev => (
                  <div key={ev.id} className="relative">
                    {/* Circle bullet indicator */}
                    <span className="absolute -left-[31px] top-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block tracking-wide">{ev.date || 'Undated Date'}</span>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{ev.title}</h4>
                      {ev.location && (
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">📍 {ev.location}</p>
                      )}
                      {ev.description && (
                        <p className="text-xs text-slate-500 mt-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border max-w-xl">{ev.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* TAB 4: PHOTOS GALLERY */}
        {activeSubTab === 'photos' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Tagged Photos</h3>
                <p className="text-xs text-slate-500">Photos representing {person.firstName} in the family gallery</p>
              </div>
              <button
                onClick={() => setIsAddPhotoOpen(!isAddPhotoOpen)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Tagged Photo</span>
              </button>
            </div>

            {/* Add Photo Form */}
            {isAddPhotoOpen && (
              <form onSubmit={handleSavePhoto} className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 max-w-lg">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Upload Photo to Gallery</span>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative">
                    {photoPath ? (
                      <img src={photoPath} className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-6 h-6 text-slate-400" />
                    )}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploading} />
                  </div>
                  <div className="text-xs text-slate-500">
                    {uploading ? "Uploading, please wait..." : photoPath ? "Uploaded! Fill in details below to finalize." : "Click box to select file"}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Title *</label>
                    <input type="text" required value={photoTitle} onChange={e => setPhotoTitle(e.target.value)} placeholder="e.g. Wedding Photo" className="w-full px-2.5 py-1.5 bg-white text-xs border rounded" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Date</label>
                    <input type="text" value={photoDate} onChange={e => setPhotoDate(e.target.value)} placeholder="e.g. 1982-10" className="w-full px-2.5 py-1.5 bg-white text-xs border rounded" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Location</label>
                    <input type="text" value={photoLocation} onChange={e => setPhotoLocation(e.target.value)} placeholder="e.g. Paris" className="w-full px-2.5 py-1.5 bg-white text-xs border rounded" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Description</label>
                  <textarea rows={2} value={photoDesc} onChange={e => setPhotoDesc(e.target.value)} className="w-full px-2.5 py-1.5 bg-white text-xs border rounded" />
                </div>
                <div className="flex justify-end space-x-2 pt-2 border-t">
                  <button type="button" onClick={() => setIsAddPhotoOpen(false)} className="px-3 py-1.5 text-xs text-slate-500">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold">Save Photo</button>
                </div>
              </form>
            )}

            {/* Gallery list */}
            {personPhotos.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No photos registered for {person.firstName} yet. Upload or tag photos in the Photos tab!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {personPhotos.map(photo => (
                  <div key={photo.id} className="border dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-slate-50 dark:bg-slate-950/20 group relative h-48 cursor-pointer" onClick={() => setTab('photos')}>
                    <img src={photo.filePath} alt={photo.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 p-3 text-white">
                      <span className="block text-xs font-bold truncate">{photo.title}</span>
                      <span className="text-[10px] text-slate-300 block mt-0.5">{photo.date || 'Undated'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: FREEFORM NOTES */}
        {activeSubTab === 'notes' && (
          <div className="space-y-4 animate-fade-in">
            <div className="border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Biography Notes</h3>
              <p className="text-xs text-slate-500 mt-0.5">Add, draft, or record detailed biographical entries about this family member.</p>
            </div>
            
            <textarea
              rows={12}
              value={editBio}
              onChange={e => setEditBio(e.target.value)}
              placeholder="Start drafting life memoirs, family recipes, interviews, or custom data maps..."
              className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-sm focus:outline-none"
            />
            
            <div className="flex justify-end">
              <button
                onClick={handleSaveDetails}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                Save Biography Notes
              </button>
            </div>
          </div>
        )}

      </div>

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        person={person}
        people={people}
        parentRelationships={parentRelationships}
        coupleRelationships={coupleRelationships}
        onConfirm={handleConfirmDeleteProfile}
      />

    </div>
  );
}
