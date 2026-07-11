import React, { useState, useMemo, useCallback } from 'react';
import { Search, Grid, List, Plus, ArrowUpDown, Filter, Trash2, ShieldAlert } from 'lucide-react';
import { useFamilyStore } from '../hooks/useFamilyStore';
import { Person } from '../types';
import QuickAddModal from './QuickAddModal';
import DeleteConfirmModal from './DeleteConfirmModal';

export default function PeoplePage() {
  const { people, parentRelationships, coupleRelationships, setTab, deletePerson, showToast } = useFamilyStore();
  
  const [viewStyle, setViewStyle] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'age_asc' | 'age_desc'>('name');
  const [lifeFilter, setLifeFilter] = useState<'all' | 'living' | 'deceased'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);

  // Active people and parents
  const activePeople = useMemo(() => people.filter(p => !p.isDeleted), [people]);
  const activeParents = useMemo(() => parentRelationships.filter(r => !r.isDeleted), [parentRelationships]);

  // Map parent-child relations for stats
  const { childrenOf, parentsOf } = useMemo(() => {
    const childrenMap: Record<string, string[]> = {};
    const parentsMap: Record<string, string[]> = {};
    for (const r of activeParents) {
      if (!childrenMap[r.parentId]) childrenMap[r.parentId] = [];
      childrenMap[r.parentId].push(r.childId);

      if (!parentsMap[r.childId]) parentsMap[r.childId] = [];
      parentsMap[r.childId].push(r.parentId);
    }
    return { childrenOf: childrenMap, parentsOf: parentsMap };
  }, [activeParents]);

  // Potential branch root candidates (people who have no parents registered)
  const branchRoots = useMemo(() => {
    return activePeople.filter(p => !parentsOf[p.id] || parentsOf[p.id].length === 0);
  }, [activePeople, parentsOf]);

  // Recurse descendants to verify if a person belongs to a branch
  const isDescendantOf = useCallback((personId: string, ancestorId: string): boolean => {
    if (personId === ancestorId) return true;
    const parents = parentsOf[personId] || [];
    for (const pId of parents) {
      if (isDescendantOf(pId, ancestorId)) return true;
    }
    return false;
  }, [parentsOf]);

  // Calculate grandchildren
  const getChildrenAndGrandchildrenCounts = (personId: string) => {
    const children = childrenOf[personId] || [];
    const childrenCount = children.length;
    
    let grandchildrenCount = 0;
    for (const childId of children) {
      grandchildrenCount += (childrenOf[childId] || []).length;
    }

    return { childrenCount, grandchildrenCount };
  };

  // Filter and sort people list
  const filteredPeople = useMemo(() => {
    return activePeople
      .filter(p => {
        // Search filter
        const fullName = `${p.firstName} ${p.lastName || ''}`.toLowerCase();
        const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || 
                              (p.nickname || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        // Life status filter
        const matchesLife = lifeFilter === 'all' 
          ? true 
          : lifeFilter === 'living' 
          ? p.living === true 
          : p.living === false;

        // Branch filter
        const matchesBranch = branchFilter === 'all'
          ? true
          : isDescendantOf(p.id, branchFilter);

        return matchesSearch && matchesLife && matchesBranch;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.firstName.localeCompare(b.firstName);
        }
        
        const ageA = a.birthYear ? (new Date().getFullYear() - a.birthYear) : 0;
        const ageB = b.birthYear ? (new Date().getFullYear() - b.birthYear) : 0;
        
        if (sortBy === 'age_asc') {
          return ageA - ageB;
        } else {
          return ageB - ageA;
        }
      });
  }, [activePeople, searchQuery, sortBy, lifeFilter, branchFilter, isDescendantOf]);

  const handleDelete = (person: Person) => {
    setPersonToDelete(person);
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      const name = personToDelete ? `${personToDelete.firstName} ${personToDelete.lastName || ''}`.trim() : 'family member';
      await deletePerson(id);
      showToast(`Successfully deleted ${name}`);
    } catch (err) {
      showToast("Failed to delete person", "error");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8 space-y-6">
      
      {/* Header Banner */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">People Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage and search all registered family members</p>
        </div>
        <button
          onClick={() => setIsQuickAddOpen(true)}
          id="people-add-btn"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-2 transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Person</span>
        </button>
      </div>

      {/* Toolbar filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by first name, last name, or nickname..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Sorting, Filtering, and Toggle View Panel */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Sorting */}
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800/80 text-xs text-slate-500">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
            >
              <option value="name">Sort by Name</option>
              <option value="age_asc">Sort by Age: Youngest</option>
              <option value="age_desc">Sort by Age: Oldest</option>
            </select>
          </div>

          {/* Life Status Filter */}
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800/80 text-xs text-slate-500">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={lifeFilter}
              onChange={e => setLifeFilter(e.target.value as any)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="living">Living Only</option>
              <option value="deceased">Deceased Only</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800/80 text-xs text-slate-500">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
            >
              <option value="all">All family branches</option>
              {branchRoots.map(r => (
                <option key={r.id} value={r.id}>
                  Lineage of {r.firstName} {r.lastName || ''}
                </option>
              ))}
            </select>
          </div>

          {/* Layout view toggle */}
          <div className="bg-slate-100 dark:bg-slate-950 p-1 rounded-xl flex space-x-1 border border-slate-200/60 dark:border-slate-800/80">
            <button
              onClick={() => setViewStyle('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewStyle === 'grid' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow' : 'text-slate-400 hover:text-slate-600'}`}
              title="Grid Cards"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewStyle('table')}
              className={`p-1.5 rounded-lg transition-colors ${viewStyle === 'table' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow' : 'text-slate-400 hover:text-slate-600'}`}
              title="List Table"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* Main Grid Card View */}
      {viewStyle === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredPeople.map(p => {
            const { childrenCount, grandchildrenCount } = getChildrenAndGrandchildrenCounts(p.id);
            return (
              <div
                key={p.id}
                onClick={() => setTab('profile', p.id)}
                className="group bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm hover:shadow-md border border-slate-100 dark:border-slate-800/80 hover:border-emerald-500 transition-all cursor-pointer relative"
              >
                {/* Delete button in corner */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(p);
                  }}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="Delete family member"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Profile Photo */}
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden mx-auto shadow-sm border border-slate-200/55">
                  {p.profileImage ? (
                    <img src={p.profileImage} alt={p.firstName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl bg-slate-100 dark:bg-slate-800">
                      {p.firstName[0]}
                    </div>
                  )}
                </div>

                {/* Person details */}
                <div className="text-center mt-4">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 leading-tight truncate">
                    {p.firstName} {p.lastName || ''}
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1">
                    {p.birthYear ? `Born: ${p.birthYear}` : 'Birth date not set'}
                  </p>
                  
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold inline-block mt-2 ${
                    p.living ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {p.living ? 'Living' : 'Deceased'}
                  </span>

                  <hr className="border-slate-50 dark:border-slate-850 my-3.5" />

                  {/* Summary of children and grandchildren */}
                  <div className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">
                    {childrenCount} children · {grandchildrenCount} grandchildren
                  </div>
                </div>

              </div>
            );
          })}

          {filteredPeople.length === 0 && (
            <div className="col-span-full bg-white dark:bg-slate-900 p-12 rounded-2xl text-center text-slate-400 border border-dashed border-slate-200">
              No family members match your current filters. Clear your search or add a new person!
            </div>
          )}
        </div>
      ) : (
        /* Simple Table View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-850">
                <tr>
                  <th scope="col" className="px-6 py-4">Photo</th>
                  <th scope="col" className="px-6 py-4">Name</th>
                  <th scope="col" className="px-6 py-4">Status</th>
                  <th scope="col" className="px-6 py-4">Birth Year</th>
                  <th scope="col" className="px-6 py-4">Gender</th>
                  <th scope="col" className="px-6 py-4">Direct Descendants</th>
                  <th scope="col" className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {filteredPeople.map(p => {
                  const { childrenCount, grandchildrenCount } = getChildrenAndGrandchildrenCounts(p.id);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setTab('profile', p.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/20 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-3 shrink-0">
                        <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                          {p.profileImage ? (
                            <img src={p.profileImage} alt={p.firstName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs bg-slate-100">
                              {p.firstName[0]}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">
                        {p.firstName} {p.lastName || ''}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.living ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {p.living ? 'Living' : 'Deceased'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {p.birthYear || 'N/A'}
                      </td>
                      <td className="px-6 py-3 text-xs capitalize text-slate-500">
                        {p.gender || 'Unknown'}
                      </td>
                      <td className="px-6 py-3 text-xs font-semibold text-slate-500">
                        {childrenCount} Children / {grandchildrenCount} Grandchildren
                      </td>
                      <td className="px-6 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredPeople.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No family members match your current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={(newId) => setTab('profile', newId)}
      />

      {/* Custom Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={personToDelete !== null}
        onClose={() => setPersonToDelete(null)}
        person={personToDelete}
        people={people}
        parentRelationships={parentRelationships}
        coupleRelationships={coupleRelationships}
        onConfirm={handleConfirmDelete}
      />

    </div>
  );
}
