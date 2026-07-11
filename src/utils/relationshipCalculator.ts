export interface Person {
  id: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  gender?: 'male' | 'female' | 'unknown' | string;
  living: boolean;
  birthYear?: number;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  burialPlace?: string;
  occupation?: string;
  currentLocation?: string;
  bio?: string;
  profileImage?: string;
  isDeleted?: boolean;
}

export interface ParentRelationship {
  id: string;
  parentId: string;
  childId: string;
  parentRole: 'father' | 'mother';
  relationshipNature: 'biological' | 'non-biological';
  nonBiologicalType?: 'adoptive' | 'foster' | 'guardian' | 'stepparent' | 'other';
  isDeleted?: boolean;
}

export interface CoupleRelationship {
  id: string;
  personId1: string;
  personId2: string;
  relationshipType: 'spouse' | 'partner' | 'former_spouse' | 'former_partner';
  isDeleted?: boolean;
}

/**
 * Returns all ancestors of a person (parents, grandparents, etc.) recursively.
 */
export function getAncestors(
  personId: string,
  people: Person[],
  parentsMap: Record<string, string[]> // childId -> parentIds
): string[] {
  const ancestors = new Set<string>();
  const queue = [...(parentsMap[personId] || [])];
  
  while (queue.length > 0) {
    const ancestorId = queue.shift()!;
    if (!ancestors.has(ancestorId)) {
      ancestors.add(ancestorId);
      const parentIds = parentsMap[ancestorId] || [];
      queue.push(...parentIds);
    }
  }
  
  return Array.from(ancestors);
}

/**
 * Returns all descendants of a person recursively.
 */
export function getDescendants(
  personId: string,
  people: Person[],
  childrenMap: Record<string, string[]> // parentId -> childIds
): string[] {
  const descendants = new Set<string>();
  const queue = [...(childrenMap[personId] || [])];
  
  while (queue.length > 0) {
    const descendantId = queue.shift()!;
    if (!descendants.has(descendantId)) {
      descendants.add(descendantId);
      const childIds = childrenMap[descendantId] || [];
      queue.push(...childIds);
    }
  }
  
  return Array.from(descendants);
}

/**
 * Validates relationship rules to prevent self-relationships, circular ancestry, etc.
 * Returns error message if invalid, or null if valid.
 */
export function validateParentRelationship(
  parentId: string,
  childId: string,
  parentRole: 'father' | 'mother',
  people: Person[],
  parentRelationships: ParentRelationship[]
): string | null {
  if (parentId === childId) {
    return "A person cannot be their own parent.";
  }

  // Check if parent and child exist
  const parent = people.find(p => p.id === parentId && !p.isDeleted);
  const child = people.find(p => p.id === childId && !p.isDeleted);
  if (!parent || !child) {
    return "Selected parent or child does not exist.";
  }

  // Prevent duplicate parent relationships
  const duplicate = parentRelationships.find(r => 
    !r.isDeleted && 
    r.parentId === parentId && 
    r.childId === childId
  );
  if (duplicate) {
    return "This parent relationship already exists.";
  }

  // Check if child already has a parent of this role (cannot have two mothers or two fathers)
  const existingRole = parentRelationships.find(r =>
    !r.isDeleted &&
    r.childId === childId &&
    r.parentRole === parentRole
  );
  if (existingRole) {
    const otherParent = people.find(p => p.id === existingRole.parentId);
    return `This person already has a assigned ${parentRole}: ${otherParent ? otherParent.firstName : 'Unknown'}.`;
  }

  // Build temporary maps to check for circular ancestry
  const parentsMap: Record<string, string[]> = {};
  for (const r of parentRelationships) {
    if (!r.isDeleted) {
      if (!parentsMap[r.childId]) parentsMap[r.childId] = [];
      parentsMap[r.childId].push(r.parentId);
    }
  }
  // Add proposed relationship
  if (!parentsMap[childId]) parentsMap[childId] = [];
  parentsMap[childId].push(parentId);

  // Check if parent is a descendant of the child (circular ancestry)
  const childDescendants = getDescendants(childId, people, getChildrenMap(parentRelationships));
  if (childDescendants.includes(parentId)) {
    return "Circular ancestry detected: A child cannot be an ancestor of their parent.";
  }

  return null;
}

// Helper to construct maps
function getParentsMap(rels: ParentRelationship[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const r of rels) {
    if (!r.isDeleted) {
      if (!map[r.childId]) map[r.childId] = [];
      map[r.childId].push(r.parentId);
    }
  }
  return map;
}

function getChildrenMap(rels: ParentRelationship[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const r of rels) {
    if (!r.isDeleted) {
      if (!map[r.parentId]) map[r.parentId] = [];
      map[r.parentId].push(r.childId);
    }
  }
  return map;
}

/**
 * Calculates a person's exact dynamic relationship labels relative to them.
 */
export function calculateRelationships(
  targetId: string,
  people: Person[],
  parentRelationships: ParentRelationship[],
  coupleRelationships: CoupleRelationship[]
): Array<{ person: Person; relation: string; category: string }> {
  const results: Array<{ person: Person; relation: string; category: string }> = [];
  
  const target = people.find(p => p.id === targetId && !p.isDeleted);
  if (!target) return results;

  // Active people, parent relationships, couple relationships
  const activePeople = people.filter(p => !p.isDeleted);
  const activeRels = parentRelationships.filter(r => !r.isDeleted);
  const activeCouples = coupleRelationships.filter(c => !c.isDeleted);

  // Quick lookup maps
  const parentsOf: Record<string, string[]> = {}; // childId -> parentIds
  const fatherOf: Record<string, string> = {}; // childId -> fatherId
  const motherOf: Record<string, string> = {}; // childId -> motherId
  const childrenOf: Record<string, string[]> = {}; // parentId -> childIds
  
  for (const r of activeRels) {
    if (!parentsOf[r.childId]) parentsOf[r.childId] = [];
    parentsOf[r.childId].push(r.parentId);
    
    if (r.parentRole === 'father') {
      fatherOf[r.childId] = r.parentId;
    } else {
      motherOf[r.childId] = r.parentId;
    }

    if (!childrenOf[r.parentId]) childrenOf[r.parentId] = [];
    childrenOf[r.parentId].push(r.childId);
  }

  const getGenderLabel = (person: Person, maleLabel: string, femaleLabel: string, neutralLabel: string) => {
    if (person.gender === 'male') return maleLabel;
    if (person.gender === 'female') return femaleLabel;
    return neutralLabel;
  };

  const addedIds = new Set<string>([targetId]);

  const addRelation = (personId: string, relation: string, category: string) => {
    if (addedIds.has(personId)) return;
    const p = activePeople.find(person => person.id === personId);
    if (p) {
      results.push({ person: p, relation, category });
      addedIds.add(personId);
    }
  };

  // 1. Direct Parents
  const targetParents = parentsOf[targetId] || [];
  for (const pId of targetParents) {
    const isFather = fatherOf[targetId] === pId;
    const r = activeRels.find(rel => rel.parentId === pId && rel.childId === targetId);
    const nature = r?.relationshipNature === 'non-biological' 
      ? ` (${r.nonBiologicalType || 'non-biological'})` 
      : '';
    const label = isFather ? `Father${nature}` : `Mother${nature}`;
    addRelation(pId, label, 'Immediate Family');
  }

  // 2. Direct Children
  const targetChildren = childrenOf[targetId] || [];
  for (const cId of targetChildren) {
    const childPerson = activePeople.find(p => p.id === cId);
    if (childPerson) {
      const r = activeRels.find(rel => rel.parentId === targetId && rel.childId === cId);
      const nature = r?.relationshipNature === 'non-biological' 
        ? ` (${r.nonBiologicalType || 'non-biological'})` 
        : '';
      const label = getGenderLabel(childPerson, `Son${nature}`, `Daughter${nature}`, `Child${nature}`);
      addRelation(cId, label, 'Immediate Family');
    }
  }

  // 3. Spouses and Partners
  for (const rel of activeCouples) {
    let spouseId: string | null = null;
    if (rel.personId1 === targetId) spouseId = rel.personId2;
    else if (rel.personId2 === targetId) spouseId = rel.personId1;
    
    if (spouseId) {
      const p = activePeople.find(person => person.id === spouseId);
      if (p) {
        let label = 'Partner';
        if (rel.relationshipType === 'spouse') {
          label = getGenderLabel(p, 'Husband', 'Wife', 'Spouse');
        } else if (rel.relationshipType === 'former_spouse') {
          label = getGenderLabel(p, 'Former Husband', 'Former Wife', 'Former Spouse');
        } else if (rel.relationshipType === 'former_partner') {
          label = 'Former Partner';
        }
        addRelation(spouseId, label, 'Spouse/Partner');
      }
    }
  }

  // 4. Siblings (Full and Half)
  const targetFather = fatherOf[targetId];
  const targetMother = motherOf[targetId];

  for (const p of activePeople) {
    if (p.id === targetId) continue;
    
    const pFather = fatherOf[p.id];
    const pMother = motherOf[p.id];
    
    const sharesFather = targetFather && pFather && targetFather === pFather;
    const sharesMother = targetMother && pMother && targetMother === pMother;

    if (sharesFather && sharesMother) {
      const label = getGenderLabel(p, 'Brother', 'Sister', 'Sibling');
      addRelation(p.id, label, 'Immediate Family');
    } else if (sharesFather || sharesMother) {
      const label = getGenderLabel(p, 'Half-Brother', 'Half-Sister', 'Half-Sibling');
      addRelation(p.id, label, 'Immediate Family');
    }
  }

  // 5. Grandparents & Grandchildren
  // Grandparents
  for (const pId of targetParents) {
    const parentParents = parentsOf[pId] || [];
    for (const gpId of parentParents) {
      const gp = activePeople.find(person => person.id === gpId);
      if (gp) {
        const label = getGenderLabel(gp, 'Grandfather', 'Grandmother', 'Grandparent');
        addRelation(gpId, label, 'Extended Family');
      }
    }
  }

  // Grandchildren
  for (const cId of targetChildren) {
    const childChildren = childrenOf[cId] || [];
    for (const gcId of childChildren) {
      const gc = activePeople.find(person => person.id === gcId);
      if (gc) {
        const label = getGenderLabel(gc, 'Grandson', 'Granddaughter', 'Grandchild');
        addRelation(gcId, label, 'Extended Family');
      }
    }
  }

  // 6. Uncles, Aunts, Nephews, Nieces, Cousins
  // Uncles & Aunts (Parents' Siblings)
  for (const pId of targetParents) {
    const pFather = fatherOf[pId];
    const pMother = motherOf[pId];

    for (const sib of activePeople) {
      if (sib.id === pId) continue;
      const sibFather = fatherOf[sib.id];
      const sibMother = motherOf[sib.id];
      const sharesF = pFather && sibFather && pFather === sibFather;
      const sharesM = pMother && sibMother && pMother === sibMother;

      if (sharesF || sharesM) {
        const label = getGenderLabel(sib, 'Uncle', 'Aunt', 'Aunt/Uncle');
        addRelation(sib.id, label, 'Extended Family');
      }
    }
  }

  // Nephews & Nieces (Children of target's Siblings)
  const siblings = activePeople.filter(p => {
    if (p.id === targetId) return false;
    const pFather = fatherOf[p.id];
    const pMother = motherOf[p.id];
    return (targetFather && pFather && targetFather === pFather) || 
           (targetMother && pMother && targetMother === pMother);
  });

  for (const sib of siblings) {
    const sibChildren = childrenOf[sib.id] || [];
    for (const childId of sibChildren) {
      const child = activePeople.find(person => person.id === childId);
      if (child) {
        const label = getGenderLabel(child, 'Nephew', 'Niece', 'Niece/Nephew');
        addRelation(childId, label, 'Extended Family');
      }
    }
  }

  // Cousins (Children of Parents' Siblings)
  for (const pId of targetParents) {
    const pFather = fatherOf[pId];
    const pMother = motherOf[pId];

    const parentsSiblings = activePeople.filter(sib => {
      if (sib.id === pId) return false;
      const sibFather = fatherOf[sib.id];
      const sibMother = motherOf[sib.id];
      return (pFather && sibFather && pFather === sibFather) || 
             (pMother && sibMother && pMother === sibMother);
    });

    for (const sib of parentsSiblings) {
      const cousins = childrenOf[sib.id] || [];
      for (const cousinId of cousins) {
        const cousin = activePeople.find(person => person.id === cousinId);
        if (cousin) {
          const label = getGenderLabel(cousin, 'Cousin (Male)', 'Cousin (Female)', 'Cousin');
          addRelation(cousinId, label, 'Extended Family');
        }
      }
    }
  }

  // 7. General Ancestors (Great Grandparents, etc.)
  const allAncestors = getAncestors(targetId, people, parentsOf);
  for (const ancId of allAncestors) {
    if (!addedIds.has(ancId)) {
      addRelation(ancId, 'Ancestor', 'Ancestors');
    }
  }

  // 8. General Descendants (Great Grandchildren, etc.)
  const allDescendants = getDescendants(targetId, people, childrenOf);
  for (const descId of allDescendants) {
    if (!addedIds.has(descId)) {
      addRelation(descId, 'Descendant', 'Descendants');
    }
  }

  return results;
}
