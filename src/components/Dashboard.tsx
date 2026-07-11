import { useState } from 'react';
import { Users, Network, Heart, Cake, Clock, Image as ImageIcon, Plus, Network as TreeIcon, Camera } from 'lucide-react';
import { useFamilyStore } from '../hooks/useFamilyStore';
import { Person } from '../types';
import QuickAddModal from './QuickAddModal';

export default function Dashboard() {
  const { people, parentRelationships, coupleRelationships, photos, setTab, showToast } = useFamilyStore();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // --- Dynamic Stats ---
  const activePeople = people.filter(p => !p.isDeleted);
  const totalPeople = activePeople.length;
  const totalFamilies = coupleRelationships.filter(c => !c.isDeleted).length;

  // Dynamically calculate the maximum generation depth
  const generationDepth = ((): number => {
    if (activePeople.length === 0) return 0;
    
    const parentsOf: Record<string, string[]> = {};
    for (const r of parentRelationships) {
      if (!r.isDeleted) {
        if (!parentsOf[r.childId]) parentsOf[r.childId] = [];
        parentsOf[r.childId].push(r.parentId);
      }
    }

    const memo: Record<string, number> = {};
    
    function getDepth(id: string): number {
      if (id in memo) return memo[id];
      const parents = parentsOf[id] || [];
      if (parents.length === 0) {
        return 1;
      }
      const maxParentDepth = Math.max(...parents.map(p => getDepth(p)));
      memo[id] = 1 + maxParentDepth;
      return memo[id];
    }

    let maxDepth = 0;
    for (const p of activePeople) {
      maxDepth = Math.max(maxDepth, getDepth(p.id));
    }
    return maxDepth;
  })();

  // --- Upcoming Birthdays ---
  const upcomingBirthdays = ((): Array<{ person: Person; daysLeft: number; age: number; birthdayStr: string }> => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const list: Array<{ person: Person; daysLeft: number; age: number; birthdayStr: string }> = [];

    for (const p of activePeople) {
      if (!p.birthDate || p.living === false) continue;
      
      const parts = p.birthDate.split('-');
      if (parts.length < 2) continue; // Needs at least month and day, e.g. YYYY-MM-DD
      
      const birthMonth = parseInt(parts[1]) - 1;
      const birthDay = parseInt(parts[2]);
      
      if (isNaN(birthMonth) || isNaN(birthDay)) continue;

      // Calculate this year's birthday date
      let bday = new Date(currentYear, birthMonth, birthDay);
      if (bday < today) {
        // If birthday already passed this year, look at next year's
        bday = new Date(currentYear + 1, birthMonth, birthDay);
      }

      // Difference in days
      const diffTime = bday.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Calculate upcoming age
      const birthYear = parseInt(parts[0]);
      const upcomingAge = !isNaN(birthYear) ? (bday.getFullYear() - birthYear) : 0;

      // Formatted date string, e.g., "July 23"
      const monthStr = bday.toLocaleString('default', { month: 'short' });
      const bdayStr = `${monthStr} ${birthDay}`;

      list.push({
        person: p,
        daysLeft: diffDays,
        age: upcomingAge,
        birthdayStr: bdayStr
      });
    }

    // Sort by days left (closest first) and take top 4
    return list.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 4);
  })();

  // --- Recently Added People ---
  // Take last 4 elements in the people list that are active (assuming end of list is newest)
  const recentlyAdded = [...activePeople].slice(-4).reverse();

  // --- Recent Photos ---
  const recentPhotos = photos.filter(p => !p.isDeleted).slice(-3).reverse();

  const handleQuickAddSuccess = (newId: string) => {
    setTab('profile', newId);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8 space-y-8">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome to your Family History</h2>
          <p className="text-slate-500 mt-1.5 text-sm max-w-xl">
            Explore generations, store profile photos, catalog family galleries, and keep timelines secure on your local device.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsQuickAddOpen(true)}
            id="dash-add-person-btn"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/15 flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Person</span>
          </button>
          <button
            onClick={() => setTab('tree')}
            id="dash-open-tree-btn"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition-colors flex items-center space-x-2"
          >
            <TreeIcon className="w-4 h-4 text-emerald-500" />
            <span>Open Family Tree</span>
          </button>
        </div>
      </div>

      {/* Grid: 3 Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Stat: Total People */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center space-x-5">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total People</span>
            <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">{totalPeople}</h3>
          </div>
        </div>

        {/* Stat: Generations */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center space-x-5">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Network className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Generations Depth</span>
            <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">{generationDepth}</h3>
          </div>
        </div>

        {/* Stat: Families */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center space-x-5">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
            <Heart className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Registered Couples</span>
            <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">{totalFamilies}</h3>
          </div>
        </div>

      </div>

      {/* Grid: Birthdays, Recent additions, Photos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Birthdays & Recent People */}
        <div className="space-y-8">
          
          {/* Upcoming Birthdays */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2.5 mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Cake className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Upcoming Birthdays</h3>
            </div>

            {upcomingBirthdays.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-400">
                No upcoming birthdays registered. Add dates in edit profiles!
              </div>
            ) : (
              <div className="space-y-3.5">
                {upcomingBirthdays.map(({ person, daysLeft, age, birthdayStr }) => (
                  <div
                    key={person.id}
                    onClick={() => setTab('profile', person.id)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                        {person.profileImage ? (
                          <img src={person.profileImage} alt={person.firstName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 bg-slate-100 dark:bg-slate-800">
                            {person.firstName[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                          {person.firstName} {person.lastName || ''}
                        </h4>
                        <p className="text-xs text-slate-500">Turning {age} on {birthdayStr}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        daysLeft === 0 
                          ? 'bg-rose-100 text-rose-700 animate-pulse' 
                          : daysLeft <= 7 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      }`}>
                        {daysLeft === 0 ? "Today!" : daysLeft === 1 ? "Tomorrow" : `In ${daysLeft} days`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recently Added People */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2.5 mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Clock className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Recently Added</h3>
            </div>

            {recentlyAdded.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-400">
                No people added yet.
              </div>
            ) : (
              <div className="space-y-3.5">
                {recentlyAdded.map(person => (
                  <div
                    key={person.id}
                    onClick={() => setTab('profile', person.id)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                        {person.profileImage ? (
                          <img src={person.profileImage} alt={person.firstName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 bg-slate-100 dark:bg-slate-800">
                            {person.firstName[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                          {person.firstName} {person.lastName || ''}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {person.birthYear ? `Born ${person.birthYear}` : 'Birth date not set'} · {person.living ? 'Living' : 'Deceased'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-emerald-500 hover:underline">View Profile →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Recent Family Photos */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-full">
          <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <ImageIcon className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Recent Family Photos</h3>
            </div>
            <button
              onClick={() => setTab('photos')}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Add Photo
            </button>
          </div>

          {recentPhotos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Camera className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-700" />
              <p className="text-sm">No photos uploaded to gallery yet.</p>
              <button
                onClick={() => setTab('photos')}
                className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
              >
                Upload first photo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              {recentPhotos.map(photo => (
                <div
                  key={photo.id}
                  onClick={() => setTab('photos')}
                  className="group relative rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 h-40 cursor-pointer bg-slate-50 dark:bg-slate-950"
                >
                  <img
                    src={photo.filePath}
                    alt={photo.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white">
                    <p className="text-xs font-bold truncate">{photo.title}</p>
                    <p className="text-[10px] text-slate-300 mt-0.5 truncate">{photo.date || 'Undated'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={handleQuickAddSuccess}
      />

    </div>
  );
}
