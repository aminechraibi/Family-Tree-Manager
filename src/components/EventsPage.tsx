import React, { useState, useMemo } from 'react';
import { Calendar, Filter, MapPin, Users, Plus, Star, Heart, GraduationCap, Award, Compass, Search, Trash2 } from 'lucide-react';
import { useFamilyStore } from '../hooks/useFamilyStore';
import { Event } from '../types';
import SearchableSelect from './SearchableSelect';

export default function EventsPage() {
  const { events, people, createEvent, deleteEvent, showToast, setTab } = useFamilyStore();

  const [typeFilter, setTypeFilter] = useState<'all' | Event['type']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create state toggles
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Event['type']>('custom');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  // Active records
  const activeEvents = useMemo(() => events.filter(e => !e.isDeleted), [events]);
  const activePeople = useMemo(() => people.filter(p => !p.isDeleted), [people]);

  const personOptions = useMemo(() => {
    return activePeople.map(p => ({
      id: p.id,
      label: `${p.firstName} ${p.lastName || ''}`.trim()
    }));
  }, [activePeople]);

  // Filter and sort events chronologically
  const filteredEvents = useMemo(() => {
    return activeEvents
      .filter(ev => {
        const matchesType = typeFilter === 'all' ? true : ev.type === typeFilter;
        const matchesSearch = ev.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (ev.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (ev.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
      })
      .sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date); // Oldest historical milestone first!
      });
  }, [activeEvents, typeFilter, searchQuery]);

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Milestone title is required", "error");
      return;
    }

    try {
      const linkedPeople = selectedPersonId ? [{ personId: selectedPersonId, role: 'primary' }] : [];
      await createEvent({
        type,
        title: title.trim(),
        date: date || undefined,
        location: location || undefined,
        description: description || undefined,
        people: linkedPeople
      });
      showToast("Milestone logged successfully!");
      
      // Reset form
      setIsAddOpen(false);
      setTitle('');
      setType('custom');
      setDate('');
      setLocation('');
      setDescription('');
      setSelectedPersonId('');
    } catch (err) {
      showToast("Failed to save event", "error");
    }
  };

  const handleConfirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      await deleteEvent(eventToDelete.id);
      showToast("Milestone log deleted.");
    } catch (err) {
      showToast("Failed to delete event", "error");
    } finally {
      setEventToDelete(null);
    }
  };

  // Icon selector helper
  const getEventIcon = (type: Event['type']) => {
    switch (type) {
      case 'birth': return { icon: Star, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' };
      case 'marriage': return { icon: Heart, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' };
      case 'graduation': return { icon: GraduationCap, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' };
      case 'migration': return { icon: Compass, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' };
      case 'employment': return { icon: Award, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' };
      default: return { icon: Calendar, color: 'text-slate-500 bg-slate-50 dark:bg-slate-950/40' };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Family Chronicle & Milestones</h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">A chronological record of marriages, births, journeys, and custom family stories</p>
        </div>
        <button
          onClick={() => setIsAddOpen(!isAddOpen)}
          id="event-add-btn"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-2 transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Log Milestone</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left: Log Event wizard */}
        {isAddOpen && (
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 space-y-5 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-xs font-bold uppercase text-slate-400">Log Milestone</span>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 font-semibold text-xs">Close</button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Milestone Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Wedding of Ahmed & Sofia"
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Milestone Type</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full px-2 py-1.5 border rounded-lg text-xs bg-transparent"
                  >
                    <option value="custom">Custom Milestone</option>
                    <option value="birth">Birth</option>
                    <option value="marriage">Marriage</option>
                    <option value="graduation">Graduation</option>
                    <option value="employment">Employment</option>
                    <option value="migration">Migration</option>
                    <option value="death">Death</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Date (YYYY-MM-DD)</label>
                  <input
                    type="text"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    placeholder="e.g. 1978-06-15"
                    className="w-full px-3 py-1.5 border rounded-lg text-xs bg-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Casablanca, Morocco"
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Tag a Relative (Optional)</label>
                <SearchableSelect
                  options={personOptions}
                  value={selectedPersonId}
                  onChange={setSelectedPersonId}
                  placeholder="[ None / Tag general family ]"
                  searchPlaceholder="Search relatives..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Milestone Notes / Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Record memoirs, custom attendee lists, or background story details..."
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-transparent"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow"
              >
                Save Milestone Log
              </button>
            </form>
          </div>
        )}

        {/* Right: Visual Chronology list */}
        <div className={`${isAddOpen ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 min-h-[500px]`}>
          
          {/* Quick Filter Control bars */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search chronicle..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800/80 text-xs text-slate-500">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none text-xs"
              >
                <option value="all">All milestone types</option>
                <option value="birth">Births</option>
                <option value="marriage">Marriages</option>
                <option value="graduation">Educations</option>
                <option value="employment">Careers</option>
                <option value="migration">Migrations</option>
                <option value="death">Passing</option>
                <option value="custom">Custom Logs</option>
              </select>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Calendar className="w-12 h-12 mb-3 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold">No milestone logs found.</p>
              <p className="text-xs mt-1">Refine your search parameters or log a new event above!</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 pl-8 space-y-8 py-4">
              {filteredEvents.map(ev => {
                const { icon: Icon, color } = getEventIcon(ev.type);
                const taggedRelatives = activePeople.filter(p => ev.people?.some(rp => rp.personId === p.id));

                return (
                  <div key={ev.id} className="relative group">
                    
                    {/* Circle icon marker bullet */}
                    <span className={`absolute -left-[45px] top-1.5 p-1.5 rounded-full border-4 border-white dark:border-slate-900 ${color} shadow-sm transition-transform group-hover:scale-110`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>

                    {/* Milestone body card */}
                    <div className="space-y-2 max-w-2xl bg-slate-50/40 dark:bg-slate-950/20 p-4 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50/80 transition-all">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            {ev.date || 'Undated Period'}
                          </span>
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-0.5">{ev.title}</h4>
                        </div>
                        
                        <button
                          onClick={() => setEventToDelete(ev)}
                          className="p-1 text-slate-300 hover:text-rose-500 rounded hover:bg-slate-200/50"
                          title="Delete milestone log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {ev.location && (
                        <p className="text-xs text-slate-400 font-semibold flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{ev.location}</span>
                        </p>
                      )}

                      {ev.description && (
                        <p className="text-xs text-slate-500 leading-relaxed bg-white dark:bg-slate-950 p-2.5 rounded-lg border">
                          {ev.description}
                        </p>
                      )}

                      {/* Tagged Relatives link pills */}
                      {taggedRelatives.length > 0 && (
                        <div className="pt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Related:</span>
                          {taggedRelatives.map(p => (
                            <button
                              key={p.id}
                              onClick={() => setTab('profile', p.id)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 hover:text-emerald-600 text-[10px] font-bold rounded text-slate-600 transition-colors"
                            >
                              {p.firstName} {p.lastName || ''}
                            </button>
                          ))}
                        </div>
                      )}

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* Event Delete Confirm Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-2.5 text-rose-600">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Delete Milestone?</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal">
              Are you sure you want to delete the milestone <strong className="font-semibold text-slate-800 dark:text-slate-100">"{eventToDelete.title}"</strong>? This action will remove it from the timeline and chronicle.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="px-3.5 py-1.5 text-xs text-slate-500 border rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEvent}
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
