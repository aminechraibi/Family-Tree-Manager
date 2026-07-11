import * as fs from 'fs';
import * as path from 'path';
import { Person, ParentRelationship, CoupleRelationship, validateParentRelationship } from '../../src/utils/relationshipCalculator';

export interface Event {
  id: string;
  type: 'birth' | 'marriage' | 'graduation' | 'migration' | 'employment' | 'death' | 'burial' | 'custom';
  title: string;
  date?: string;
  location?: string;
  description?: string;
  isDeleted?: boolean;
  createdAt: string;
}

export interface EventPerson {
  id: string;
  eventId: string;
  personId: string;
  role?: string;
}

export interface Photo {
  id: string;
  filePath: string;
  thumbnailPath?: string;
  title: string;
  date?: string;
  location?: string;
  description?: string;
  generatedSummary?: string;
  tags?: string[];
  isDeleted?: boolean;
  createdAt: string;
}

export interface PhotoPerson {
  id: string;
  photoId: string;
  personId: string;
}

export interface HistoryItem {
  id: string;
  action: string;
  timestamp: string;
  details: string;
  undoData: {
    people: Person[];
    parent_relationships: ParentRelationship[];
    couple_relationships: CoupleRelationship[];
    events: Event[];
    event_people: EventPerson[];
    photos: Photo[];
    photo_people: PhotoPerson[];
  };
}

export interface Settings {
  familyName: string;
  language: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
  treeLayout: 'TB' | 'LR';
  treeGenerations: number;
  showPhotosInTree: boolean;
  showBirthYearsInTree: boolean;
  imageSummariesEnabled: boolean;
  apiProvider: string;
  apiUrl: string;
  apiKey: string;
  apiModel: string;
}

export interface DbState {
  people: Person[];
  parent_relationships: ParentRelationship[];
  couple_relationships: CoupleRelationship[];
  events: Event[];
  event_people: EventPerson[];
  photos: Photo[];
  photo_people: PhotoPerson[];
  settings: Settings;
  history: HistoryItem[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_DIR = path.join(DATA_DIR, 'database');
const DB_FILE = path.join(DB_DIR, 'db.json');
const PROFILE_IMAGES_DIR = path.join(DATA_DIR, 'profile-images');
const FAMILY_PHOTOS_DIR = path.join(DATA_DIR, 'family-photos');
const THUMBNAILS_DIR = path.join(DATA_DIR, 'thumbnails');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

const DEFAULT_SETTINGS: Settings = {
  familyName: "My Family",
  language: "en",
  dateFormat: "YYYY-MM-DD",
  theme: "light",
  treeLayout: "TB",
  treeGenerations: 3,
  showPhotosInTree: true,
  showBirthYearsInTree: true,
  imageSummariesEnabled: false,
  apiProvider: "disabled",
  apiUrl: "https://api.openai.com/v1",
  apiKey: "",
  apiModel: "gpt-4o-mini"
};

export class DatabaseEngine {
  private state: DbState = {
    people: [],
    parent_relationships: [],
    couple_relationships: [],
    events: [],
    event_people: [],
    photos: [],
    photo_people: [],
    settings: DEFAULT_SETTINGS,
    history: []
  };

  constructor() {
    this.initDirectories();
    this.load();
  }

  private initDirectories() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.mkdirSync(PROFILE_IMAGES_DIR, { recursive: true });
    fs.mkdirSync(FAMILY_PHOTOS_DIR, { recursive: true });
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  public load() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.state = JSON.parse(fileContent);
        // Ensure all arrays and settings exist
        if (!this.state.people) this.state.people = [];
        if (!this.state.parent_relationships) this.state.parent_relationships = [];
        if (!this.state.couple_relationships) this.state.couple_relationships = [];
        if (!this.state.events) this.state.events = [];
        if (!this.state.event_people) this.state.event_people = [];
        if (!this.state.photos) this.state.photos = [];
        if (!this.state.photo_people) this.state.photo_people = [];
        if (!this.state.settings) this.state.settings = DEFAULT_SETTINGS;
        if (!this.state.history) this.state.history = [];
      } catch (err) {
        console.error("Failed to load database, initializing empty state", err);
        this.state = this.getEmptyState();
        this.save();
      }
    } else {
      console.log("No database file found, initializing with sample family data");
      this.state = this.getSampleState();
      this.save();
    }
  }

  private getEmptyState(): DbState {
    return {
      people: [],
      parent_relationships: [],
      couple_relationships: [],
      events: [],
      event_people: [],
      photos: [],
      photo_people: [],
      settings: DEFAULT_SETTINGS,
      history: []
    };
  }

  private getSampleState(): DbState {
    // Generate beautiful 3-generation sample family tree
    const p1: Person = { id: "p-ahmed", firstName: "Ahmed", lastName: "El Amrani", gender: "male", living: false, birthYear: 1952, birthDate: "1952-04-12" };
    const p2: Person = { id: "p-amina", firstName: "Amina", lastName: "Benali", gender: "female", living: true, birthYear: 1955, birthDate: "1955-08-23" };
    const p3: Person = { id: "p-yassine", firstName: "Yassine", lastName: "El Amrani", gender: "male", living: true, birthYear: 1980, birthDate: "1980-01-15" };
    const p4: Person = { id: "p-leyla", firstName: "Leyla", lastName: "El Amrani", gender: "female", living: true, birthYear: 1983, birthDate: "1983-06-30" };
    const p5: Person = { id: "p-sarah", firstName: "Sarah", lastName: "Davis", gender: "female", living: true, birthYear: 1982, birthDate: "1982-11-05" };
    const p6: Person = { id: "p-karim", firstName: "Karim", lastName: "El Amrani", gender: "male", living: true, birthYear: 2010, birthDate: "2010-09-12" };
    const p7: Person = { id: "p-sofia", firstName: "Sofia", lastName: "El Amrani", gender: "female", living: true, birthYear: 2013, birthDate: "2013-02-18" };

    const parents: ParentRelationship[] = [
      // Ahmed and Amina children
      { id: "r-yassine-f", parentId: p1.id, childId: p3.id, parentRole: "father", relationshipNature: "biological" },
      { id: "r-yassine-m", parentId: p2.id, childId: p3.id, parentRole: "mother", relationshipNature: "biological" },
      { id: "r-leyla-f", parentId: p1.id, childId: p4.id, parentRole: "father", relationshipNature: "biological" },
      { id: "r-leyla-m", parentId: p2.id, childId: p4.id, parentRole: "mother", relationshipNature: "biological" },
      
      // Yassine and Sarah children
      { id: "r-karim-f", parentId: p3.id, childId: p6.id, parentRole: "father", relationshipNature: "biological" },
      { id: "r-karim-m", parentId: p5.id, childId: p6.id, parentRole: "mother", relationshipNature: "biological" },
      
      // Sofia is adopted by Yassine and Sarah
      { id: "r-sofia-f", parentId: p3.id, childId: p7.id, parentRole: "father", relationshipNature: "non-biological", nonBiologicalType: "adoptive" },
      { id: "r-sofia-m", parentId: p5.id, childId: p7.id, parentRole: "mother", relationshipNature: "non-biological", nonBiologicalType: "adoptive" }
    ];

    const couples: CoupleRelationship[] = [
      { id: "c-ahmed-amina", personId1: p1.id, personId2: p2.id, relationshipType: "spouse" },
      { id: "c-yassine-sarah", personId1: p3.id, personId2: p5.id, relationshipType: "spouse" }
    ];

    const evs: Event[] = [
      { id: "e-ahmed-amina-mar", type: "marriage", title: "Wedding of Ahmed and Amina", date: "1977-10-10", location: "Casablanca, Morocco", description: "A beautiful traditional ceremony in Casablanca with family and friends.", createdAt: new Date().toISOString() },
      { id: "e-ahmed-death", type: "death", title: "Passing of Ahmed El Amrani", date: "2018-05-14", location: "Rabat, Morocco", description: "Ahmed passed away peacefully surrounded by his loved ones.", createdAt: new Date().toISOString() }
    ];

    return {
      people: [p1, p2, p3, p4, p5, p6, p7],
      parent_relationships: parents,
      couple_relationships: couples,
      events: evs,
      event_people: [
        { id: "ep1", eventId: "e-ahmed-amina-mar", personId: p1.id, role: "Groom" },
        { id: "ep2", eventId: "e-ahmed-amina-mar", personId: p2.id, role: "Bride" },
        { id: "ep3", eventId: "e-ahmed-death", personId: p1.id, role: "Deceased" }
      ],
      photos: [],
      photo_people: [],
      settings: {
        ...DEFAULT_SETTINGS,
        familyName: "El Amrani Family"
      },
      history: []
    };
  }

  public save() {
    const tempFile = `${DB_FILE}.tmp`;
    try {
      fs.writeFileSync(tempFile, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error("Atomic database write failed", err);
      // Fallback
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    }
  }

  private pushToHistory(action: string, details: string) {
    const historyItem: HistoryItem = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      action,
      timestamp: new Date().toISOString(),
      details,
      // Deep copy active state for Undo
      undoData: {
        people: JSON.parse(JSON.stringify(this.state.people)),
        parent_relationships: JSON.parse(JSON.stringify(this.state.parent_relationships)),
        couple_relationships: JSON.parse(JSON.stringify(this.state.couple_relationships)),
        events: JSON.parse(JSON.stringify(this.state.events)),
        event_people: JSON.parse(JSON.stringify(this.state.event_people)),
        photos: JSON.parse(JSON.stringify(this.state.photos)),
        photo_people: JSON.parse(JSON.stringify(this.state.photo_people))
      }
    };
    
    // Keep max 50 items in history
    this.state.history.unshift(historyItem);
    if (this.state.history.length > 50) {
      this.state.history.pop();
    }
  }

  public undo(): boolean {
    if (this.state.history.length === 0) return false;
    const item = this.state.history.shift()!;
    this.state.people = item.undoData.people;
    this.state.parent_relationships = item.undoData.parent_relationships;
    this.state.couple_relationships = item.undoData.couple_relationships;
    this.state.events = item.undoData.events;
    this.state.event_people = item.undoData.event_people;
    this.state.photos = item.undoData.photos;
    this.state.photo_people = item.undoData.photo_people;
    this.save();
    return true;
  }

  // --- CRUD OPERATIONS ---

  // People
  public getPeople(): Person[] {
    return this.state.people.filter(p => !p.isDeleted);
  }

  public getPerson(id: string): Person | undefined {
    return this.state.people.find(p => p.id === id && !p.isDeleted);
  }

  public createPerson(p: Omit<Person, 'id'> & { id?: string }): Person {
    const id = p.id || `p-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    this.pushToHistory('create_person', `Created person ${p.firstName} ${p.lastName || ''}`);
    
    const newPerson: Person = {
      ...p,
      id,
      isDeleted: false
    };
    
    this.state.people.push(newPerson);
    this.save();
    return newPerson;
  }

  public updatePerson(id: string, updates: Partial<Person>): Person {
    const index = this.state.people.findIndex(p => p.id === id && !p.isDeleted);
    if (index === -1) throw new Error("Person not found");
    
    this.pushToHistory('update_person', `Updated details for ${this.state.people[index].firstName}`);
    
    this.state.people[index] = {
      ...this.state.people[index],
      ...updates,
      id // prevent id overwrite
    };
    
    this.save();
    return this.state.people[index];
  }

  public deletePerson(id: string) {
    const person = this.getPerson(id);
    if (!person) throw new Error("Person not found");
    
    this.pushToHistory('delete_person', `Deleted person ${person.firstName} ${person.lastName || ''}`);
    
    // Soft delete person
    person.isDeleted = true;
    
    // Soft delete associated parent relationships (both where they are child and parent)
    for (const rel of this.state.parent_relationships) {
      if (rel.parentId === id || rel.childId === id) {
        rel.isDeleted = true;
      }
    }

    // Soft delete associated couple relationships
    for (const rel of this.state.couple_relationships) {
      if (rel.personId1 === id || rel.personId2 === id) {
        rel.isDeleted = true;
      }
    }

    this.save();
  }

  // Parent Relationships
  public getParentRelationships(): ParentRelationship[] {
    return this.state.parent_relationships.filter(r => !r.isDeleted);
  }

  public createParentRelationship(rel: Omit<ParentRelationship, 'id'> & { id?: string }): ParentRelationship {
    const error = validateParentRelationship(
      rel.parentId,
      rel.childId,
      rel.parentRole,
      this.getPeople(),
      this.getParentRelationships()
    );
    if (error) throw new Error(error);

    const id = rel.id || `r-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const child = this.getPerson(rel.childId);
    const parent = this.getPerson(rel.parentId);
    
    this.pushToHistory('create_parent_relationship', `Added parent relationship between ${parent?.firstName} and ${child?.firstName}`);

    const newRel: ParentRelationship = {
      ...rel,
      id,
      isDeleted: false
    };

    this.state.parent_relationships.push(newRel);
    this.save();
    return newRel;
  }

  public deleteParentRelationship(id: string) {
    const rel = this.state.parent_relationships.find(r => r.id === id && !r.isDeleted);
    if (!rel) throw new Error("Relationship not found");

    const parent = this.getPerson(rel.parentId);
    const child = this.getPerson(rel.childId);

    this.pushToHistory('delete_parent_relationship', `Removed parent link between ${parent?.firstName} and ${child?.firstName}`);
    rel.isDeleted = true;
    this.save();
  }

  // Couple Relationships
  public getCoupleRelationships(): CoupleRelationship[] {
    return this.state.couple_relationships.filter(c => !c.isDeleted);
  }

  public createCoupleRelationship(rel: Omit<CoupleRelationship, 'id'> & { id?: string }): CoupleRelationship {
    // Prevent self-relationship
    if (rel.personId1 === rel.personId2) {
      throw new Error("A person cannot be married to or partnered with themselves.");
    }

    // Prevent duplicate active couple relationships
    const dup = this.getCoupleRelationships().find(c => 
      (c.personId1 === rel.personId1 && c.personId2 === rel.personId2) ||
      (c.personId1 === rel.personId2 && c.personId2 === rel.personId1)
    );
    if (dup) {
      throw new Error("These two people already have a registered couple relationship.");
    }

    const id = rel.id || `c-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const p1 = this.getPerson(rel.personId1);
    const p2 = this.getPerson(rel.personId2);

    this.pushToHistory('create_couple_relationship', `Added partner relationship between ${p1?.firstName} and ${p2?.firstName}`);

    const newRel: CoupleRelationship = {
      ...rel,
      id,
      isDeleted: false
    };

    this.state.couple_relationships.push(newRel);
    this.save();
    return newRel;
  }

  public deleteCoupleRelationship(id: string) {
    const rel = this.state.couple_relationships.find(c => c.id === id && !c.isDeleted);
    if (!rel) throw new Error("Relationship not found");

    const p1 = this.getPerson(rel.personId1);
    const p2 = this.getPerson(rel.personId2);

    this.pushToHistory('delete_couple_relationship', `Removed partner link between ${p1?.firstName} and ${p2?.firstName}`);
    rel.isDeleted = true;
    this.save();
  }

  // Events
  public getEvents(): Event[] {
    return this.state.events.filter(e => !e.isDeleted);
  }

  public getEventPeople(eventId: string): EventPerson[] {
    return this.state.event_people.filter(ep => ep.eventId === eventId);
  }

  public createEvent(ev: Omit<Event, 'id' | 'createdAt'> & { id?: string, people?: Array<{ personId: string, role?: string }> }): Event {
    const id = ev.id || `e-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    this.pushToHistory('create_event', `Created event: ${ev.title}`);

    const newEvent: Event = {
      id,
      type: ev.type,
      title: ev.title,
      date: ev.date,
      location: ev.location,
      description: ev.description,
      isDeleted: false,
      createdAt: new Date().toISOString()
    };

    this.state.events.push(newEvent);

    if (ev.people && ev.people.length > 0) {
      for (const ep of ev.people) {
        this.state.event_people.push({
          id: `ep-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          eventId: id,
          personId: ep.personId,
          role: ep.role
        });
      }
    }

    this.save();
    return newEvent;
  }

  public deleteEvent(id: string) {
    const ev = this.state.events.find(e => e.id === id && !e.isDeleted);
    if (!ev) throw new Error("Event not found");

    this.pushToHistory('delete_event', `Deleted event: ${ev.title}`);
    ev.isDeleted = true;
    this.save();
  }

  // Photos
  public getPhotos(): Photo[] {
    return this.state.photos.filter(p => !p.isDeleted);
  }

  public getPhotoPeople(photoId: string): PhotoPerson[] {
    return this.state.photo_people.filter(pp => pp.photoId === photoId);
  }

  public createPhoto(photo: Omit<Photo, 'id' | 'createdAt'> & { id?: string, people?: string[] }): Photo {
    const id = photo.id || `photo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    this.pushToHistory('create_photo', `Uploaded photo: ${photo.title}`);

    const newPhoto: Photo = {
      ...photo,
      id,
      isDeleted: false,
      createdAt: new Date().toISOString()
    };

    this.state.photos.push(newPhoto);

    if (photo.people && photo.people.length > 0) {
      for (const pId of photo.people) {
        this.state.photo_people.push({
          id: `pp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          photoId: id,
          personId: pId
        });
      }
    }

    this.save();
    return newPhoto;
  }

  public updatePhoto(id: string, updates: Partial<Photo> & { people?: string[] }): Photo {
    const index = this.state.photos.findIndex(p => p.id === id && !p.isDeleted);
    if (index === -1) throw new Error("Photo not found");

    this.pushToHistory('update_photo', `Updated photo: ${this.state.photos[index].title}`);

    const { people, ...photoFields } = updates;

    this.state.photos[index] = {
      ...this.state.photos[index],
      ...photoFields,
      id
    };

    if (people !== undefined) {
      // Clear previous links
      this.state.photo_people = this.state.photo_people.filter(pp => pp.photoId !== id);
      // Create new links
      for (const pId of people) {
        this.state.photo_people.push({
          id: `pp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          photoId: id,
          personId: pId
        });
      }
    }

    this.save();
    return this.state.photos[index];
  }

  public deletePhoto(id: string) {
    const photo = this.state.photos.find(p => p.id === id && !p.isDeleted);
    if (!photo) throw new Error("Photo not found");

    this.pushToHistory('delete_photo', `Deleted photo: ${photo.title}`);
    photo.isDeleted = true;
    this.save();
  }

  // Settings
  public getSettings(): Settings {
    return this.state.settings || DEFAULT_SETTINGS;
  }

  public updateSettings(settings: Partial<Settings>): Settings {
    this.state.settings = {
      ...this.state.settings,
      ...settings
    };
    this.save();
    return this.state.settings;
  }

  // Backup & Restore
  public restoreBackup(data: any): boolean {
    if (!data.people || !data.settings) {
      return false;
    }
    
    this.pushToHistory('restore_backup', 'Restored system backup');
    
    this.state.people = data.people || [];
    this.state.parent_relationships = data.parent_relationships || [];
    this.state.couple_relationships = data.couple_relationships || [];
    this.state.events = data.events || [];
    this.state.event_people = data.event_people || [];
    this.state.photos = data.photos || [];
    this.state.photo_people = data.photo_people || [];
    this.state.settings = { ...DEFAULT_SETTINGS, ...data.settings };
    
    this.save();
    return true;
  }

  public getBackupData(): any {
    return {
      people: this.state.people,
      parent_relationships: this.state.parent_relationships,
      couple_relationships: this.state.couple_relationships,
      events: this.state.events,
      event_people: this.state.event_people,
      photos: this.state.photos,
      photo_people: this.state.photo_people,
      settings: this.state.settings
    };
  }

  public getHistory() {
    return this.state.history;
  }
}
