import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize, Search, ArrowRightLeft, Layers, User, Calendar, Edit, Plus, Heart, GitMerge, ChevronRight } from 'lucide-react';
import { useFamilyStore } from '../hooks/useFamilyStore';
import { Person, ParentRelationship, CoupleRelationship } from '../types';
import { calculateRelationships } from '../utils/relationshipCalculator';
import QuickAddModal from './QuickAddModal';

export default function FamilyTree() {
  const { people, parentRelationships, coupleRelationships, setTab, settings } = useFamilyStore();
  
  // Tree configuration state
  const [rootPersonId, setRootPersonId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'complete' | 'ancestors' | 'descendants'>('complete');
  const [orientation, setOrientation] = useState<'TB' | 'LR'>('TB'); // TB = Top-to-Bottom, LR = Left-to-Right
  const [generationsCount, setGenerationsCount] = useState<number>(3);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());

  // Interactive viewport state
  const [transform, setTransform] = useState({ x: 50, y: 50, scale: 0.95 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);

  // Selected person for detail drawer
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Quick Add modal toggle
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Sync default root person when people load
  useEffect(() => {
    const active = people.filter(p => !p.isDeleted);
    if (active.length > 0 && !rootPersonId) {
      // Find a reasonable starting node (e.g. Yassine from our sample, or first person)
      const starter = active.find(p => p.id === 'p-yassine') || active[0];
      setRootPersonId(starter.id);
    }
  }, [people, rootPersonId]);

  // Handle tree zoom and pan mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node-card-interactive') || (e.target as HTMLElement).closest('.btn-interactive')) {
      return; // click card instead
    }
    setIsDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = 1.05;
    const nextScale = e.deltaY < 0 
      ? Math.min(transform.scale * scaleFactor, 3) 
      : Math.max(transform.scale / scaleFactor, 0.2);
    
    setTransform(prev => ({ ...prev, scale: nextScale }));
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setTransform(prev => ({
      ...prev,
      scale: direction === 'in' ? Math.min(prev.scale * 1.2, 3) : Math.max(prev.scale / 1.2, 0.2)
    }));
  };

  const handleResetViewport = () => {
    setTransform({ x: 50, y: 50, scale: 0.95 });
  };

  // Toggle Collapse on a Node
  const toggleCollapseNode = (id: string) => {
    setCollapsedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Active records
  const activePeople = useMemo(() => people.filter(p => !p.isDeleted), [people]);
  const activeParents = useMemo(() => parentRelationships.filter(r => !r.isDeleted), [parentRelationships]);
  const activeCouples = useMemo(() => coupleRelationships.filter(c => !c.isDeleted), [coupleRelationships]);

  // Selected person record details
  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null;
    return activePeople.find(p => p.id === selectedPersonId) || null;
  }, [selectedPersonId, activePeople]);

  // Selected person calculated relatives list
  const selectedRelatives = useMemo(() => {
    if (!selectedPersonId) return [];
    return calculateRelationships(selectedPersonId, people, parentRelationships, coupleRelationships);
  }, [selectedPersonId, people, parentRelationships, coupleRelationships]);

  // Maps for efficient parsing
  const parentsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const r of activeParents) {
      if (!map[r.childId]) map[r.childId] = [];
      map[r.childId].push(r.parentId);
    }
    return map;
  }, [activeParents]);

  const childrenMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const r of activeParents) {
      if (!map[r.parentId]) map[r.parentId] = [];
      map[r.parentId].push(r.childId);
    }
    return map;
  }, [activeParents]);

  // --- TREE BUILDING ALGORITHM ---
  const treeLayout = useMemo(() => {
    if (!rootPersonId || activePeople.length === 0) return { nodes: [], lines: [] };

    const visibleNodeIds = new Set<string>();
    const layers: Record<number, string[]> = {}; // generation_level -> personIds

    // Determine layers recursively based on ViewMode
    const visited = new Set<string>();

    function traverseAncestors(id: string, currentGen: number, maxGen: number) {
      if (Math.abs(currentGen) >= maxGen || visited.has(`${id}-${currentGen}`)) return;
      visited.add(`${id}-${currentGen}`);
      
      visibleNodeIds.add(id);
      if (!layers[currentGen]) layers[currentGen] = [];
      if (!layers[currentGen].includes(id)) layers[currentGen].push(id);

      if (collapsedNodeIds.has(id)) return; // Collapse branch

      const parentIds = parentsMap[id] || [];
      for (const pId of parentIds) {
        traverseAncestors(pId, currentGen - 1, maxGen);
      }
    }

    function traverseDescendants(id: string, currentGen: number, maxGen: number) {
      if (currentGen >= maxGen || visited.has(`${id}-${currentGen}`)) return;
      visited.add(`${id}-${currentGen}`);

      visibleNodeIds.add(id);
      if (!layers[currentGen]) layers[currentGen] = [];
      if (!layers[currentGen].includes(id)) layers[currentGen].push(id);

      if (collapsedNodeIds.has(id)) return; // Collapse branch

      const childIds = childrenMap[id] || [];
      for (const cId of childIds) {
        traverseDescendants(cId, currentGen + 1, maxGen);
      }
    }

    if (viewMode === 'ancestors') {
      traverseAncestors(rootPersonId, 0, generationsCount);
    } else if (viewMode === 'descendants') {
      traverseDescendants(rootPersonId, 0, generationsCount);
    } else {
      // 'complete' view: traverse BOTH up and down up to generationsCount
      traverseAncestors(rootPersonId, 0, generationsCount);
      visited.clear(); // reset visited for descendant path
      traverseDescendants(rootPersonId, 0, generationsCount);
      
      // Add spouses of visible people
      const visibleArray = Array.from(visibleNodeIds);
      for (const vId of visibleArray) {
        const couples = activeCouples.filter(c => c.personId1 === vId || c.personId2 === vId);
        for (const c of couples) {
          const spouseId = c.personId1 === vId ? c.personId2 : c.personId1;
          const spouse = activePeople.find(p => p.id === spouseId);
          if (spouse) {
            visibleNodeIds.add(spouseId);
            // Place spouse in same layer as person
            const personLayer = Object.keys(layers).find(k => layers[Number(k)].includes(vId));
            if (personLayer !== undefined) {
              const layerNum = Number(personLayer);
              if (!layers[layerNum].includes(spouseId)) {
                layers[layerNum].push(spouseId);
              }
            }
          }
        }
      }
    }

    // Node Dimensions and Spacing
    const cardWidth = 200;
    const cardHeight = 85;
    const horizontalSpacing = 260;
    const verticalSpacing = 160;

    // Convert layers to node coordinates
    const nodes: Array<{ person: Person; x: number; y: number; isRoot: boolean; isHighlighted: boolean; collapsed: boolean }> = [];
    const layerIndices = Object.keys(layers).map(Number).sort((a, b) => a - b);

    layerIndices.forEach((layerKey, lIdx) => {
      const ids = layers[layerKey];
      const layerCount = ids.length;
      const totalWidth = (layerCount - 1) * horizontalSpacing;

      ids.forEach((id, idx) => {
        const person = activePeople.find(p => p.id === id);
        if (!person) return;

        // Center layer nodes around X=0
        let x = idx * horizontalSpacing - totalWidth / 2;
        let y = lIdx * verticalSpacing;

        // Adjust coordinates if orientation is Left to Right
        if (orientation === 'LR') {
          // Swap roles of X and Y
          x = lIdx * horizontalSpacing - totalWidth / 2; // Generation level controls X
          y = idx * verticalSpacing;                      // Sibling index controls Y
        }

        const isRoot = id === rootPersonId;
        const isHighlighted = searchQuery.trim() !== '' && (
          person.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (person.lastName || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

        nodes.push({
          person,
          x,
          y,
          isRoot,
          isHighlighted,
          collapsed: collapsedNodeIds.has(id)
        });
      });
    });

    // Generate relationship lines
    const lines: Array<{
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      nature: 'biological' | 'non-biological';
      label: string;
    }> = [];

    activeParents.forEach(rel => {
      // Only draw lines if both parent and child are displayed in the layout
      const parentNode = nodes.find(n => n.person.id === rel.parentId);
      const childNode = nodes.find(n => n.person.id === rel.childId);

      if (parentNode && childNode) {
        let x1 = parentNode.x + cardWidth / 2;
        let y1 = parentNode.y + cardHeight;
        let x2 = childNode.x + cardWidth / 2;
        let y2 = childNode.y;

        if (orientation === 'LR') {
          x1 = parentNode.x + cardWidth;
          y1 = parentNode.y + cardHeight / 2;
          x2 = childNode.x;
          y2 = childNode.y + cardHeight / 2;
        }

        const label = rel.relationshipNature === 'non-biological' 
          ? `Adoptive (${rel.nonBiologicalType || 'foster'})` 
          : 'Biological';

        lines.push({
          id: rel.id,
          x1,
          y1,
          x2,
          y2,
          nature: rel.relationshipNature,
          label
        });
      }
    });

    // Also draw couple link lines
    activeCouples.forEach(rel => {
      const p1Node = nodes.find(n => n.person.id === rel.personId1);
      const p2Node = nodes.find(n => n.person.id === rel.personId2);

      if (p1Node && p2Node) {
        let x1, y1, x2, y2;
        if (orientation === 'TB') {
          x1 = p1Node.x + cardWidth;
          y1 = p1Node.y + cardHeight / 2;
          x2 = p2Node.x;
          y2 = p2Node.y + cardHeight / 2;
        } else {
          x1 = p1Node.x + cardWidth / 2;
          y1 = p1Node.y + cardHeight;
          x2 = p2Node.x + cardWidth / 2;
          y2 = p2Node.y;
        }

        lines.push({
          id: rel.id,
          x1,
          y1,
          x2,
          y2,
          nature: 'biological', // use solid line for spouses
          label: rel.relationshipType === 'spouse' ? 'Married' : 'Partner'
        });
      }
    });

    return { nodes, lines };
  }, [rootPersonId, activePeople, activeParents, activeCouples, viewMode, orientation, generationsCount, searchQuery, collapsedNodeIds, parentsMap, childrenMap]);

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-100 dark:bg-slate-950 relative h-screen">
      
      {/* Dynamic Family Tree Header / Toolbar Controls */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap gap-3 items-center justify-between p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/50 dark:border-slate-800/80">
        
        {/* Left: Focus Person Selector */}
        <div className="flex items-center space-x-3 shrink-0">
          <span className="text-xs font-semibold text-slate-500">Tree Root:</span>
          <select
            value={rootPersonId}
            onChange={e => setRootPersonId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none"
          >
            {activePeople.map(p => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName || ''} ({p.birthYear || 'No Birth Year'})
              </option>
            ))}
          </select>
        </div>

        {/* Center: Controls Filter */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Complete, Ancestors, Descendants select */}
          <div className="bg-slate-100 dark:bg-slate-950 p-1 rounded-lg flex space-x-1 border border-slate-200/60 dark:border-slate-800/80">
            {(['complete', 'ancestors', 'descendants'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${viewMode === mode ? 'bg-white dark:bg-slate-800 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Orientation Toggle */}
          <button
            onClick={() => setOrientation(prev => prev === 'TB' ? 'LR' : 'TB')}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors"
            title="Toggle orientation"
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
            <span>{orientation === 'TB' ? 'Top-Down' : 'Left-Right'}</span>
          </button>

          {/* Generations select limit */}
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
            <Layers className="w-4 h-4 text-slate-400" />
            <select
              value={generationsCount}
              onChange={e => setGenerationsCount(Number(e.target.value))}
              className="bg-transparent text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-none"
            >
              <option value={2}>2 Generations</option>
              <option value={3}>3 Generations</option>
              <option value={4}>4 Generations</option>
              <option value={5}>5 Generations</option>
            </select>
          </div>

          {/* Quick Filter Query Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tree members..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-48 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

        </div>

      </div>

      {/* Floating Canvas Zoom/Pan Utilities */}
      <div className="absolute bottom-6 left-6 z-10 bg-white/95 dark:bg-slate-900/95 p-2 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-800/80 flex items-center space-x-1">
        <button onClick={() => handleZoom('in')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-200 transition-colors" title="Zoom In">
          <ZoomIn className="w-4.5 h-4.5" />
        </button>
        <button onClick={() => handleZoom('out')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-200 transition-colors" title="Zoom Out">
          <ZoomOut className="w-4.5 h-4.5" />
        </button>
        <button onClick={handleResetViewport} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-200 transition-colors" title="Fit to Screen">
          <Maximize className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Canvas Area */}
      <div
        ref={svgContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`flex-1 h-full outline-none overflow-hidden select-none cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
      >
        <svg
          className="w-full h-full"
          style={{ transformOrigin: '0 0' }}
        >
          {/* Zoom and Pan Layer */}
          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
            
            {/* Draw Relationship Lines */}
            {treeLayout.lines.map(line => {
              const isDashed = line.nature === 'non-biological';
              return (
                <g key={line.id}>
                  {/* Outer line for hovering shadow */}
                  <line
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke="transparent"
                    strokeWidth="8"
                    className="hover:stroke-slate-300/30 transition-colors cursor-pointer"
                  />
                  {/* Real relation line */}
                  <line
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={isDashed ? '#3b82f6' : '#10b981'}
                    strokeWidth="2.5"
                    strokeDasharray={isDashed ? '5,5' : '0'}
                    className="transition-all"
                  />
                  {/* Little centered label indicator circle helper */}
                  <circle
                    cx={(line.x1 + line.x2) / 2}
                    cy={(line.y1 + line.y2) / 2}
                    r="4.5"
                    fill={isDashed ? '#2563eb' : '#059669'}
                  />
                </g>
              );
            })}

            {/* Draw Node Cards */}
            {treeLayout.nodes.map(node => {
              const p = node.person;
              const cardWidth = 200;
              const cardHeight = 85;
              const hasCollapseControl = (childrenMap[p.id]?.length || 0) > 0 || (parentsMap[p.id]?.length || 0) > 0;

              return (
                <g key={p.id} transform={`translate(${node.x}, ${node.y})`}>
                  
                  {/* Interactive Card Container */}
                  <foreignObject
                    width={cardWidth}
                    height={cardHeight}
                    onClick={() => setSelectedPersonId(p.id)}
                    className="node-card-interactive cursor-pointer select-none"
                  >
                    <div className={`h-full p-3 rounded-2xl bg-white dark:bg-slate-900 border-2 shadow-sm transition-all flex items-center space-x-3 overflow-hidden ${
                      node.isRoot 
                        ? 'border-emerald-500 shadow-emerald-500/10' 
                        : node.isHighlighted
                        ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20'
                        : 'border-slate-200 dark:border-slate-800'
                    } hover:border-emerald-500 hover:shadow-md`}>
                      
                      {/* Node profile thumbnail */}
                      <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden">
                        {p.profileImage ? (
                          <img src={p.profileImage} alt={p.firstName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-sm">
                            {p.firstName[0]}
                          </div>
                        )}
                      </div>

                      {/* Info lines */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {p.firstName} {p.lastName || ''}
                        </p>
                        {p.birthYear && (
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            {p.birthYear} – {p.living ? 'Present' : 'Deceased'}
                          </p>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold inline-block mt-1 ${
                          p.gender === 'male' 
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' 
                            : p.gender === 'female' 
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' 
                            : 'bg-slate-50 text-slate-600'
                        }`}>
                          {p.gender || 'Unknown'}
                        </span>
                      </div>

                    </div>
                  </foreignObject>

                  {/* Progressive Branch Collapse/Expand indicator */}
                  {hasCollapseControl && (
                    <circle
                      cx={orientation === 'TB' ? cardWidth / 2 : cardWidth}
                      cy={orientation === 'TB' ? cardHeight : cardHeight / 2}
                      r="9"
                      fill="#1e293b"
                      stroke="#475569"
                      strokeWidth="1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapseNode(p.id);
                      }}
                      className="cursor-pointer btn-interactive hover:fill-emerald-600 transition-colors"
                    />
                  )}
                  {hasCollapseControl && (
                    <text
                      x={orientation === 'TB' ? cardWidth / 2 : cardWidth}
                      y={orientation === 'TB' ? cardHeight + 3.5 : cardHeight / 2 + 3.5}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize="10"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {node.collapsed ? '+' : '–'}
                    </text>
                  )}

                </g>
              );
            })}

          </g>
        </svg>
      </div>

      {/* Right Drawer: Node Profile Quick View Drawer */}
      {selectedPerson && (
        <div className="absolute right-4 top-24 bottom-4 w-80 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 z-10 flex flex-col p-6 animate-fade-in">
          
          {/* Close drawer button */}
          <div className="flex justify-end">
            <button
              onClick={() => setSelectedPersonId(null)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Profile Body */}
          <div className="flex-1 overflow-y-auto space-y-6 mt-2">
            
            <div className="text-center">
              <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden mx-auto shadow-sm border border-slate-200">
                {selectedPerson.profileImage ? (
                  <img src={selectedPerson.profileImage} alt={selectedPerson.firstName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 text-3xl font-bold">
                    {selectedPerson.firstName[0]}
                  </div>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-3.5">
                {selectedPerson.firstName} {selectedPerson.lastName || ''}
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                {selectedPerson.birthYear ? `Born ${selectedPerson.birthYear}` : 'Year of birth unknown'} · {selectedPerson.living ? 'Living' : 'Deceased'}
              </p>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTab('profile', selectedPerson.id)}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1"
              >
                <User className="w-3.5 h-3.5" />
                <span>Open Profile</span>
              </button>
              <button
                onClick={() => setTab('profile', selectedPerson.id)} // will open edit collapsible automatically
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Dynamic calculated relatives of note */}
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Immediate Relatives</span>
              <div className="space-y-2">
                {selectedRelatives.slice(0, 5).map(({ person, relation }) => (
                  <div
                    key={person.id}
                    onClick={() => {
                      setSelectedPersonId(person.id);
                      setRootPersonId(person.id);
                    }}
                    className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-100/50"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 text-[10px] font-bold flex items-center justify-center">
                        {person.profileImage ? (
                          <img src={person.profileImage} alt={person.firstName} className="w-full h-full object-cover" />
                        ) : person.firstName[0]}
                      </div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                        {person.firstName}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {relation}
                    </span>
                  </div>
                ))}
                {selectedRelatives.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">No direct relatives mapped yet.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={(id) => {
          setSelectedPersonId(id);
          setRootPersonId(id);
        }}
      />

    </div>
  );
}

// Minimal X Icon
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
