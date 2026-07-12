import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
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

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_DIR = path.join(DATA_DIR, 'database');
const DB_FILE = path.join(DB_DIR, 'db.json');
const SQLITE_FILE = path.join(DB_DIR, 'family.db');
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

let sqlDb: Database.Database;

export class DatabaseEngine {
  constructor() {
    this.initDirectories();
    this.initDatabase();
  }

  private initDirectories() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.mkdirSync(PROFILE_IMAGES_DIR, { recursive: true });
    fs.mkdirSync(FAMILY_PHOTOS_DIR, { recursive: true });
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  private initDatabase() {
    sqlDb = new Database(SQLITE_FILE);
    
    // Enable WAL mode for high concurrency & performance
    sqlDb.pragma('journal_mode = WAL');

    // Create DB Schema
    sqlDb.exec(`
      CREATE TABLE IF NOT EXISTS people (
        id TEXT PRIMARY KEY,
        firstName TEXT NOT NULL,
        lastName TEXT,
        nickname TEXT,
        gender TEXT,
        living INTEGER NOT NULL DEFAULT 1,
        birthYear INTEGER,
        birthDate TEXT,
        birthPlace TEXT,
        deathDate TEXT,
        deathPlace TEXT,
        burialPlace TEXT,
        occupation TEXT,
        currentLocation TEXT,
        bio TEXT,
        profileImage TEXT,
        isDeleted INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS parent_relationships (
        id TEXT PRIMARY KEY,
        parentId TEXT NOT NULL,
        childId TEXT NOT NULL,
        parentRole TEXT NOT NULL,
        relationshipNature TEXT NOT NULL,
        nonBiologicalType TEXT,
        isDeleted INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS couple_relationships (
        id TEXT PRIMARY KEY,
        personId1 TEXT NOT NULL,
        personId2 TEXT NOT NULL,
        relationshipType TEXT NOT NULL,
        isDeleted INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        date TEXT,
        location TEXT,
        description TEXT,
        isDeleted INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS event_people (
        id TEXT PRIMARY KEY,
        eventId TEXT NOT NULL,
        personId TEXT NOT NULL,
        role TEXT
      );

      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        filePath TEXT NOT NULL,
        thumbnailPath TEXT,
        title TEXT NOT NULL,
        date TEXT,
        location TEXT,
        description TEXT,
        generatedSummary TEXT,
        tags TEXT,
        isDeleted INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS photo_people (
        id TEXT PRIMARY KEY,
        photoId TEXT NOT NULL,
        personId TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        details TEXT NOT NULL,
        undoData TEXT NOT NULL
      );
    `);

    // Check if database is brand new / has no records
    const peopleCount = (sqlDb.prepare("SELECT count(*) as count FROM people").get() as any).count;
    if (peopleCount === 0) {
      // Check if we can migrate from db.json
      if (fs.existsSync(DB_FILE)) {
        try {
          console.log("Migrating legacy db.json data into the SQLite database...");
          const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
          const legacyData = JSON.parse(fileContent);
          this.restoreBackupInternal(legacyData);
          console.log("Migration to SQLite successfully complete!");
        } catch (err) {
          console.error("Migration failed, initializing with sample family state instead", err);
          this.restoreBackupInternal(this.getSampleState());
        }
      } else {
        console.log("No legacy DB file found, seeding brand new SQLite file with beautiful 3-generation family dataset.");
        this.restoreBackupInternal(this.getSampleState());
      }
    }
  }

  private getSampleState(): any {
    const p1: Person = { id: "p-ahmed", firstName: "Ahmed", lastName: "El Amrani", gender: "male", living: false, birthYear: 1952, birthDate: "1952-04-12" };
    const p2: Person = { id: "p-amina", firstName: "Amina", lastName: "Benali", gender: "female", living: true, birthYear: 1955, birthDate: "1955-08-23" };
    const p3: Person = { id: "p-yassine", firstName: "Yassine", lastName: "El Amrani", gender: "male", living: true, birthYear: 1980, birthDate: "1980-01-15" };
    const p4: Person = { id: "p-leyla", firstName: "Leyla", lastName: "El Amrani", gender: "female", living: true, birthYear: 1983, birthDate: "1983-06-30" };
    const p5: Person = { id: "p-sarah", firstName: "Sarah", lastName: "Davis", gender: "female", living: true, birthYear: 1982, birthDate: "1982-11-05" };
    const p6: Person = { id: "p-karim", firstName: "Karim", lastName: "El Amrani", gender: "male", living: true, birthYear: 2010, birthDate: "2010-09-12" };
    const p7: Person = { id: "p-sofia", firstName: "Sofia", lastName: "El Amrani", gender: "female", living: true, birthYear: 2013, birthDate: "2013-02-18" };

    const parents: ParentRelationship[] = [
      { id: "r-yassine-f", parentId: p1.id, childId: p3.id, parentRole: "father", relationshipNature: "biological" },
      { id: "r-yassine-m", parentId: p2.id, childId: p3.id, parentRole: "mother", relationshipNature: "biological" },
      { id: "r-leyla-f", parentId: p1.id, childId: p4.id, parentRole: "father", relationshipNature: "biological" },
      { id: "r-leyla-m", parentId: p2.id, childId: p4.id, parentRole: "mother", relationshipNature: "biological" },
      { id: "r-karim-f", parentId: p3.id, childId: p6.id, parentRole: "father", relationshipNature: "biological" },
      { id: "r-karim-m", parentId: p5.id, childId: p6.id, parentRole: "mother", relationshipNature: "biological" },
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
      }
    };
  }

  private pushToHistory(action: string, details: string) {
    const currentBackup = this.getBackupData();
    const id = `hist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const stmt = sqlDb.prepare(`
      INSERT INTO history (id, action, timestamp, details, undoData)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, action, new Date().toISOString(), details, JSON.stringify(currentBackup));

    // Keep max 50 history rows
    sqlDb.prepare(`
      DELETE FROM history WHERE id NOT IN (
        SELECT id FROM history ORDER BY timestamp DESC LIMIT 50
      )
    `).run();
  }

  public undo(): boolean {
    const row = sqlDb.prepare("SELECT * FROM history ORDER BY timestamp DESC LIMIT 1").get() as any;
    if (!row) return false;

    const data = JSON.parse(row.undoData);
    this.restoreBackupInternal(data);

    // Remove the history state
    sqlDb.prepare("DELETE FROM history WHERE id = ?").run(row.id);
    return true;
  }

  // --- CRUD OPERATIONS ---

  // People
  public getPeople(): Person[] {
    const rows = sqlDb.prepare("SELECT * FROM people WHERE isDeleted = 0").all() as any[];
    return rows.map(r => ({
      ...r,
      living: r.living === 1,
      isDeleted: r.isDeleted === 1,
      birthYear: r.birthYear !== null ? Number(r.birthYear) : undefined
    }));
  }

  public getPerson(id: string): Person | undefined {
    const row = sqlDb.prepare("SELECT * FROM people WHERE id = ? AND isDeleted = 0").get(id) as any;
    if (!row) return undefined;
    return {
      ...row,
      living: row.living === 1,
      isDeleted: row.isDeleted === 1,
      birthYear: row.birthYear !== null ? Number(row.birthYear) : undefined
    };
  }

  public createPerson(p: Omit<Person, 'id'> & { id?: string }): Person {
    const id = p.id || `p-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    this.pushToHistory('create_person', `Created person ${p.firstName} ${p.lastName || ''}`);

    const stmt = sqlDb.prepare(`
      INSERT INTO people (
        id, firstName, lastName, nickname, gender, living, 
        birthYear, birthDate, birthPlace, deathDate, deathPlace, 
        burialPlace, occupation, currentLocation, bio, profileImage, isDeleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    stmt.run(
      id,
      p.firstName,
      p.lastName || null,
      p.nickname || null,
      p.gender || null,
      p.living ? 1 : 0,
      p.birthYear !== undefined ? p.birthYear : null,
      p.birthDate || null,
      p.birthPlace || null,
      p.deathDate || null,
      p.deathPlace || null,
      p.burialPlace || null,
      p.occupation || null,
      p.currentLocation || null,
      p.bio || null,
      p.profileImage || null
    );

    return this.getPerson(id)!;
  }

  public updatePerson(id: string, updates: Partial<Person>): Person {
    const person = this.getPerson(id);
    if (!person) throw new Error("Person not found");

    this.pushToHistory('update_person', `Updated details for ${person.firstName}`);

    const merged = { ...person, ...updates };

    const stmt = sqlDb.prepare(`
      UPDATE people SET
        firstName = ?, lastName = ?, nickname = ?, gender = ?, living = ?, 
        birthYear = ?, birthDate = ?, birthPlace = ?, deathDate = ?, deathPlace = ?, 
        burialPlace = ?, occupation = ?, currentLocation = ?, bio = ?, profileImage = ?
      WHERE id = ?
    `);

    stmt.run(
      merged.firstName,
      merged.lastName || null,
      merged.nickname || null,
      merged.gender || null,
      merged.living ? 1 : 0,
      merged.birthYear !== undefined ? merged.birthYear : null,
      merged.birthDate || null,
      merged.birthPlace || null,
      merged.deathDate || null,
      merged.deathPlace || null,
      merged.burialPlace || null,
      merged.occupation || null,
      merged.currentLocation || null,
      merged.bio || null,
      merged.profileImage || null,
      id
    );

    return this.getPerson(id)!;
  }

  public deletePerson(id: string) {
    const person = this.getPerson(id);
    if (!person) throw new Error("Person not found");

    this.pushToHistory('delete_person', `Deleted person ${person.firstName} ${person.lastName || ''}`);

    sqlDb.prepare("UPDATE people SET isDeleted = 1 WHERE id = ?").run(id);
    sqlDb.prepare("UPDATE parent_relationships SET isDeleted = 1 WHERE parentId = ? OR childId = ?").run(id, id);
    sqlDb.prepare("UPDATE couple_relationships SET isDeleted = 1 WHERE personId1 = ? OR personId2 = ?").run(id, id);
  }

  // Parent Relationships
  public getParentRelationships(): ParentRelationship[] {
    const rows = sqlDb.prepare("SELECT * FROM parent_relationships WHERE isDeleted = 0").all() as any[];
    return rows.map(r => ({
      ...r,
      isDeleted: r.isDeleted === 1
    }));
  }

  public createParentRelationship(rel: Omit<ParentRelationship, 'id'> & { id?: string }): ParentRelationship {
    const activePeople = this.getPeople();
    const activeParents = this.getParentRelationships();
    const error = validateParentRelationship(
      rel.parentId,
      rel.childId,
      rel.parentRole,
      activePeople,
      activeParents
    );
    if (error) throw new Error(error);

    const id = rel.id || `r-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const child = this.getPerson(rel.childId);
    const parent = this.getPerson(rel.parentId);

    this.pushToHistory('create_parent_relationship', `Added parent relationship between ${parent?.firstName} and ${child?.firstName}`);

    const stmt = sqlDb.prepare(`
      INSERT INTO parent_relationships (id, parentId, childId, parentRole, relationshipNature, nonBiologicalType, isDeleted)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);
    stmt.run(id, rel.parentId, rel.childId, rel.parentRole, rel.relationshipNature, rel.nonBiologicalType || null);

    return {
      ...rel,
      id,
      isDeleted: false
    };
  }

  public deleteParentRelationship(id: string) {
    const rel = sqlDb.prepare("SELECT * FROM parent_relationships WHERE id = ? AND isDeleted = 0").get(id) as any;
    if (!rel) throw new Error("Relationship not found");

    const parent = this.getPerson(rel.parentId);
    const child = this.getPerson(rel.childId);

    this.pushToHistory('delete_parent_relationship', `Removed parent link between ${parent?.firstName} and ${child?.firstName}`);

    sqlDb.prepare("UPDATE parent_relationships SET isDeleted = 1 WHERE id = ?").run(id);
  }

  // Couple Relationships
  public getCoupleRelationships(): CoupleRelationship[] {
    const rows = sqlDb.prepare("SELECT * FROM couple_relationships WHERE isDeleted = 0").all() as any[];
    return rows.map(r => ({
      ...r,
      isDeleted: r.isDeleted === 1
    }));
  }

  public createCoupleRelationship(rel: Omit<CoupleRelationship, 'id'> & { id?: string }): CoupleRelationship {
    if (rel.personId1 === rel.personId2) {
      throw new Error("A person cannot be married to or partnered with themselves.");
    }

    const activeCouples = this.getCoupleRelationships();
    const dup = activeCouples.find(c => 
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

    const stmt = sqlDb.prepare(`
      INSERT INTO couple_relationships (id, personId1, personId2, relationshipType, isDeleted)
      VALUES (?, ?, ?, ?, 0)
    `);
    stmt.run(id, rel.personId1, rel.personId2, rel.relationshipType);

    return {
      ...rel,
      id,
      isDeleted: false
    };
  }

  public deleteCoupleRelationship(id: string) {
    const rel = sqlDb.prepare("SELECT * FROM couple_relationships WHERE id = ? AND isDeleted = 0").get(id) as any;
    if (!rel) throw new Error("Relationship not found");

    const p1 = this.getPerson(rel.personId1);
    const p2 = this.getPerson(rel.personId2);

    this.pushToHistory('delete_couple_relationship', `Removed partner link between ${p1?.firstName} and ${p2?.firstName}`);

    sqlDb.prepare("UPDATE couple_relationships SET isDeleted = 1 WHERE id = ?").run(id);
  }

  // Events
  public getEvents(): Event[] {
    const rows = sqlDb.prepare("SELECT * FROM events WHERE isDeleted = 0").all() as any[];
    return rows.map(r => ({
      ...r,
      isDeleted: r.isDeleted === 1
    }));
  }

  public getEventPeople(eventId: string): EventPerson[] {
    const rows = sqlDb.prepare("SELECT * FROM event_people WHERE eventId = ?").all(eventId) as any[];
    return rows;
  }

  public createEvent(ev: Omit<Event, 'id' | 'createdAt'> & { id?: string, people?: Array<{ personId: string, role?: string }> }): Event {
    const id = ev.id || `e-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    this.pushToHistory('create_event', `Created event: ${ev.title}`);

    const stmt = sqlDb.prepare(`
      INSERT INTO events (id, type, title, date, location, description, isDeleted, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `);
    const createdAt = new Date().toISOString();
    stmt.run(id, ev.type, ev.title, ev.date || null, ev.location || null, ev.description || null, createdAt);

    if (ev.people && ev.people.length > 0) {
      const epStmt = sqlDb.prepare(`
        INSERT INTO event_people (id, eventId, personId, role)
        VALUES (?, ?, ?, ?)
      `);
      for (const ep of ev.people) {
        epStmt.run(`ep-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, id, ep.personId, ep.role || null);
      }
    }

    return {
      id,
      type: ev.type,
      title: ev.title,
      date: ev.date,
      location: ev.location,
      description: ev.description,
      isDeleted: false,
      createdAt
    };
  }

  public deleteEvent(id: string) {
    const ev = sqlDb.prepare("SELECT * FROM events WHERE id = ? AND isDeleted = 0").get(id) as any;
    if (!ev) throw new Error("Event not found");

    this.pushToHistory('delete_event', `Deleted event: ${ev.title}`);
    sqlDb.prepare("UPDATE events SET isDeleted = 1 WHERE id = ?").run(id);
  }

  // Photos
  public getPhotos(): Photo[] {
    const rows = sqlDb.prepare("SELECT * FROM photos WHERE isDeleted = 0").all() as any[];
    return rows.map(r => ({
      ...r,
      tags: r.tags ? JSON.parse(r.tags) : [],
      isDeleted: r.isDeleted === 1
    }));
  }

  public getPhotoPeople(photoId: string): PhotoPerson[] {
    const rows = sqlDb.prepare("SELECT * FROM photo_people WHERE photoId = ?").all(photoId) as any[];
    return rows;
  }

  public createPhoto(photo: Omit<Photo, 'id' | 'createdAt'> & { id?: string, people?: string[] }): Photo {
    const id = photo.id || `photo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    this.pushToHistory('create_photo', `Uploaded photo: ${photo.title}`);

    const stmt = sqlDb.prepare(`
      INSERT INTO photos (id, filePath, thumbnailPath, title, date, location, description, generatedSummary, tags, isDeleted, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);
    const createdAt = new Date().toISOString();
    stmt.run(
      id,
      photo.filePath,
      photo.thumbnailPath || null,
      photo.title,
      photo.date || null,
      photo.location || null,
      photo.description || null,
      photo.generatedSummary || null,
      photo.tags ? JSON.stringify(photo.tags) : '[]',
      createdAt
    );

    if (photo.people && photo.people.length > 0) {
      const ppStmt = sqlDb.prepare(`
        INSERT INTO photo_people (id, photoId, personId)
        VALUES (?, ?, ?)
      `);
      for (const pId of photo.people) {
        ppStmt.run(`pp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, id, pId);
      }
    }

    return {
      ...photo,
      id,
      isDeleted: false,
      createdAt
    };
  }

  public updatePhoto(id: string, updates: Partial<Photo> & { people?: string[] }): Photo {
    const photo = sqlDb.prepare("SELECT * FROM photos WHERE id = ? AND isDeleted = 0").get(id) as any;
    if (!photo) throw new Error("Photo not found");

    this.pushToHistory('update_photo', `Updated photo: ${photo.title}`);

    const currentTags = photo.tags ? JSON.parse(photo.tags) : [];
    const merged = {
      ...photo,
      tags: currentTags,
      ...updates
    };

    const stmt = sqlDb.prepare(`
      UPDATE photos SET
        filePath = ?, thumbnailPath = ?, title = ?, date = ?, location = ?, 
        description = ?, generatedSummary = ?, tags = ?
      WHERE id = ?
    `);

    stmt.run(
      merged.filePath,
      merged.thumbnailPath || null,
      merged.title,
      merged.date || null,
      merged.location || null,
      merged.description || null,
      merged.generatedSummary || null,
      JSON.stringify(merged.tags || []),
      id
    );

    if (updates.people !== undefined) {
      sqlDb.prepare("DELETE FROM photo_people WHERE photoId = ?").run(id);
      const ppStmt = sqlDb.prepare(`
        INSERT INTO photo_people (id, photoId, personId)
        VALUES (?, ?, ?)
      `);
      for (const pId of updates.people) {
        ppStmt.run(`pp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, id, pId);
      }
    }

    return this.getPhotos().find(p => p.id === id)!;
  }

  public deletePhoto(id: string) {
    const photo = sqlDb.prepare("SELECT * FROM photos WHERE id = ? AND isDeleted = 0").get(id) as any;
    if (!photo) throw new Error("Photo not found");

    this.pushToHistory('delete_photo', `Deleted photo: ${photo.title}`);
    sqlDb.prepare("UPDATE photos SET isDeleted = 1 WHERE id = ?").run(id);
  }

  // Settings
  public getSettings(): Settings {
    const row = sqlDb.prepare("SELECT value FROM settings WHERE key = 'main_settings'").get() as any;
    if (!row) {
      sqlDb.prepare("INSERT INTO settings (key, value) VALUES ('main_settings', ?)").run(JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return JSON.parse(row.value);
  }

  public updateSettings(settings: Partial<Settings>): Settings {
    const current = this.getSettings();
    const merged = { ...current, ...settings };
    sqlDb.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('main_settings', ?)").run(JSON.stringify(merged));
    return merged;
  }

  // Backup & Restore
  public restoreBackup(data: any): boolean {
    if (!data.people || !data.settings) {
      return false;
    }
    
    this.pushToHistory('restore_backup', 'Restored system backup');
    this.restoreBackupInternal(data);
    return true;
  }

  private restoreBackupInternal(data: any) {
    sqlDb.transaction(() => {
      sqlDb.prepare("DELETE FROM people").run();
      sqlDb.prepare("DELETE FROM parent_relationships").run();
      sqlDb.prepare("DELETE FROM couple_relationships").run();
      sqlDb.prepare("DELETE FROM events").run();
      sqlDb.prepare("DELETE FROM event_people").run();
      sqlDb.prepare("DELETE FROM photos").run();
      sqlDb.prepare("DELETE FROM photo_people").run();
      sqlDb.prepare("DELETE FROM settings").run();

      const pStmt = sqlDb.prepare(`
        INSERT INTO people (
          id, firstName, lastName, nickname, gender, living, 
          birthYear, birthDate, birthPlace, deathDate, deathPlace, 
          burialPlace, occupation, currentLocation, bio, profileImage, isDeleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of data.people || []) {
        pStmt.run(
          p.id,
          p.firstName,
          p.lastName || null,
          p.nickname || null,
          p.gender || null,
          p.living ? 1 : 0,
          p.birthYear !== undefined ? p.birthYear : null,
          p.birthDate || null,
          p.birthPlace || null,
          p.deathDate || null,
          p.deathPlace || null,
          p.burialPlace || null,
          p.occupation || null,
          p.currentLocation || null,
          p.bio || null,
          p.profileImage || null,
          p.isDeleted ? 1 : 0
        );
      }

      const prStmt = sqlDb.prepare(`
        INSERT INTO parent_relationships (id, parentId, childId, parentRole, relationshipNature, nonBiologicalType, isDeleted)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const r of data.parent_relationships || []) {
        prStmt.run(
          r.id,
          r.parentId,
          r.childId,
          r.parentRole,
          r.relationshipNature,
          r.nonBiologicalType || null,
          r.isDeleted ? 1 : 0
        );
      }

      const crStmt = sqlDb.prepare(`
        INSERT INTO couple_relationships (id, personId1, personId2, relationshipType, isDeleted)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const c of data.couple_relationships || []) {
        crStmt.run(
          c.id,
          c.personId1,
          c.personId2,
          c.relationshipType,
          c.isDeleted ? 1 : 0
        );
      }

      const eStmt = sqlDb.prepare(`
        INSERT INTO events (id, type, title, date, location, description, isDeleted, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const e of data.events || []) {
        eStmt.run(
          e.id,
          e.type,
          e.title,
          e.date || null,
          e.location || null,
          e.description || null,
          e.isDeleted ? 1 : 0,
          e.createdAt || new Date().toISOString()
        );
      }

      const epStmt = sqlDb.prepare(`
        INSERT INTO event_people (id, eventId, personId, role)
        VALUES (?, ?, ?, ?)
      `);
      for (const ep of data.event_people || []) {
        epStmt.run(ep.id, ep.eventId, ep.personId, ep.role || null);
      }

      const phStmt = sqlDb.prepare(`
        INSERT INTO photos (id, filePath, thumbnailPath, title, date, location, description, generatedSummary, tags, isDeleted, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const ph of data.photos || []) {
        phStmt.run(
          ph.id,
          ph.filePath,
          ph.thumbnailPath || null,
          ph.title,
          ph.date || null,
          ph.location || null,
          ph.description || null,
          ph.generatedSummary || null,
          ph.tags ? JSON.stringify(ph.tags) : '[]',
          ph.isDeleted ? 1 : 0,
          ph.createdAt || new Date().toISOString()
        );
      }

      const ppStmt = sqlDb.prepare(`
        INSERT INTO photo_people (id, photoId, personId)
        VALUES (?, ?, ?)
      `);
      for (const pp of data.photo_people || []) {
        ppStmt.run(pp.id, pp.photoId, pp.personId);
      }

      const settingsVal = data.settings || DEFAULT_SETTINGS;
      sqlDb.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('main_settings', ?)").run(JSON.stringify(settingsVal));
    })();
  }

  public getBackupData(): any {
    return {
      people: this.getPeople(),
      parent_relationships: this.getParentRelationships(),
      couple_relationships: this.getCoupleRelationships(),
      events: this.getEvents(),
      event_people: sqlDb.prepare("SELECT * FROM event_people").all(),
      photos: this.getPhotos(),
      photo_people: sqlDb.prepare("SELECT * FROM photo_people").all(),
      settings: this.getSettings()
    };
  }

  public getHistory() {
    const rows = sqlDb.prepare("SELECT * FROM history ORDER BY timestamp DESC LIMIT 50").all() as any[];
    return rows.map(r => ({
      id: r.id,
      action: r.action,
      timestamp: r.timestamp,
      details: r.details
    }));
  }

  public clearDatabase() {
    sqlDb.transaction(() => {
      sqlDb.prepare("DELETE FROM people").run();
      sqlDb.prepare("DELETE FROM parent_relationships").run();
      sqlDb.prepare("DELETE FROM couple_relationships").run();
      sqlDb.prepare("DELETE FROM events").run();
      sqlDb.prepare("DELETE FROM event_people").run();
      sqlDb.prepare("DELETE FROM photos").run();
      sqlDb.prepare("DELETE FROM photo_people").run();
      sqlDb.prepare("DELETE FROM history").run();
      sqlDb.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('main_settings', ?)").run(JSON.stringify(DEFAULT_SETTINGS));
    })();
  }
}
