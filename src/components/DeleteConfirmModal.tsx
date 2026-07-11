import React, { useMemo } from 'react';
import { X, AlertTriangle, Trash2, Heart, User, ShieldAlert } from 'lucide-react';
import { Person, ParentRelationship, CoupleRelationship } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person | null;
  people: Person[];
  parentRelationships: ParentRelationship[];
  coupleRelationships: CoupleRelationship[];
  onConfirm: (id: string) => Promise<void>;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  person,
  people,
  parentRelationships,
  coupleRelationships,
  onConfirm
}: DeleteConfirmModalProps) {
  if (!isOpen || !person) return null;

  // Active records
  const activePeople = useMemo(() => people.filter(p => !p.isDeleted), [people]);
  const activeParents = useMemo(() => parentRelationships.filter(r => !r.isDeleted), [parentRelationships]);
  const activeCouples = useMemo(() => coupleRelationships.filter(c => !c.isDeleted), [coupleRelationships]);

  // 1-Level relations calculation
  const relations = useMemo(() => {
    if (!person) return { parents: [], spouses: [], children: [] };

    const pId = person.id;

    // 1. Parents (where person is the child)
    const parentsList = activeParents
      .filter(r => r.childId === pId)
      .map(r => {
        const parent = activePeople.find(p => p.id === r.parentId);
        if (!parent) return null;
        let displayRole = 'Parent';
        if (r.parentRole === 'father' || parent.gender === 'male') {
          displayRole = 'Father';
        } else if (r.parentRole === 'mother' || parent.gender === 'female') {
          displayRole = 'Mother';
        }
        return {
          id: parent.id,
          name: `${parent.firstName} ${parent.lastName || ''}`.trim(),
          role: displayRole,
          living: parent.living
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; role: string; living: boolean }>;

    // 2. Spouses/Partners
    const spousesList = activeCouples
      .filter(c => c.personId1 === pId || c.personId2 === pId)
      .map(c => {
        const spouseId = c.personId1 === pId ? c.personId2 : c.personId1;
        const spouse = activePeople.find(p => p.id === spouseId);
        if (!spouse) return null;
        let displayRole = c.relationshipType === 'spouse' ? 'Spouse' : 'Partner';
        if (c.relationshipType === 'spouse') {
          if (spouse.gender === 'male') displayRole = 'Husband';
          else if (spouse.gender === 'female') displayRole = 'Wife';
        }
        return {
          id: spouse.id,
          name: `${spouse.firstName} ${spouse.lastName || ''}`.trim(),
          role: displayRole,
          living: spouse.living
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; role: string; living: boolean }>;

    // 3. Children (where person is the parent)
    const childrenList = activeParents
      .filter(r => r.parentId === pId)
      .map(r => {
        const child = activePeople.find(p => p.id === r.childId);
        if (!child) return null;
        let displayRole = 'Child';
        if (child.gender === 'male') {
          displayRole = 'Son';
        } else if (child.gender === 'female') {
          displayRole = 'Daughter';
        }
        return {
          id: child.id,
          name: `${child.firstName} ${child.lastName || ''}`.trim(),
          role: displayRole,
          living: child.living
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; role: string; living: boolean }>;

    return {
      parents: parentsList,
      spouses: spousesList,
      children: childrenList
    };
  }, [person, activePeople, activeParents, activeCouples]);

  const hasRelations = relations.parents.length > 0 || relations.spouses.length > 0 || relations.children.length > 0;

  const handleConfirmDelete = async () => {
    try {
      await onConfirm(person.id);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header bar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span className="font-bold text-sm tracking-wide uppercase">Delete Family Member</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-rose-100/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 flex-1 space-y-4">
          
          <div className="text-center sm:text-left">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <strong className="text-slate-950 dark:text-white font-semibold">{person.firstName} {person.lastName || ''}</strong>?
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Deleting this person will soft-delete their profile and permanently unlink any associated relations.
            </p>
          </div>

          {/* Profile card preview */}
          <div className="flex items-center space-x-3.5 p-3.5 bg-slate-50 dark:bg-slate-950/40 border rounded-xl border-slate-200/60">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border">
              {person.profileImage ? (
                <img src={person.profileImage} alt={person.firstName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg bg-slate-100 dark:bg-slate-800">
                  {person.firstName[0]}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{person.firstName} {person.lastName || ''}</h4>
              <p className="text-[10px] text-slate-400 font-semibold">
                {person.birthYear ? `Birth Year: ${person.birthYear}` : 'No birth year registered'} · {person.living ? 'Living' : 'Deceased'}
              </p>
            </div>
          </div>

          {/* 1-Level relations warning section */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <span>Impacted 1-Level Relations</span>
              <span className="text-[9px] lowercase bg-slate-100 dark:bg-slate-850 px-1.5 py-0.5 rounded font-medium text-slate-500">
                to be unlinked
              </span>
            </div>

            {hasRelations ? (
              <div className="border border-slate-200/80 dark:border-slate-800/80 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 max-h-48 overflow-y-auto bg-white dark:bg-slate-950/20">
                {/* Parents */}
                {relations.parents.length > 0 && (
                  <div className="p-3 space-y-1.5">
                    <span className="block text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Parents</span>
                    <div className="space-y-1">
                      {relations.parents.map(p => (
                        <div key={p.id} className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{p.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{p.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spouses */}
                {relations.spouses.length > 0 && (
                  <div className="p-3 space-y-1.5">
                    <span className="block text-[9px] font-black text-rose-500 uppercase tracking-widest">Spouses & Partners</span>
                    <div className="space-y-1">
                      {relations.spouses.map(s => (
                        <div key={s.id} className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{s.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{s.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Children */}
                {relations.children.length > 0 && (
                  <div className="p-3 space-y-1.5">
                    <span className="block text-[9px] font-black text-blue-500 uppercase tracking-widest">Sons & Daughters (Children)</span>
                    <div className="space-y-1">
                      {relations.children.map(c => (
                        <div key={c.id} className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{c.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{c.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 border border-dashed rounded-xl text-center text-xs text-slate-400 italic">
                This person has no direct parents, spouses, partners, or children. Deleting will not impact other family branches.
              </div>
            )}
          </div>

          {/* Undo note */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 flex items-start space-x-2.5">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10.5px] text-amber-700 dark:text-amber-400 leading-normal">
              <strong>Safe Deletion</strong>: You can fully restore this person and all their relationships at any time using the <strong>Undo Last Action</strong> button in the Backups or History panel.
            </p>
          </div>

        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-end space-x-3.5 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Confirm Delete</span>
          </button>
        </div>

      </div>
    </div>
  );
}
