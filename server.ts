import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { DatabaseEngine } from './server/database/db';
import { calculateRelationships } from './src/utils/relationshipCalculator';

const app = express();
const PORT = 3000;

// Initialize database
const db = new DatabaseEngine();

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isProfile = req.path.includes('/profile');
    const folder = isProfile ? 'data/profile-images' : 'data/family-photos';
    cb(null, path.join(process.cwd(), folder));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Serve static uploaded folders
app.use('/uploads/profile-images', express.static(path.join(process.cwd(), 'data', 'profile-images')));
app.use('/uploads/family-photos', express.static(path.join(process.cwd(), 'data', 'family-photos')));

// Helper: safe JSON response
const wrap = (fn: Function) => async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    await fn(req, res, next);
  } catch (err: any) {
    console.error("API error", err);
    res.status(500).json({ error: err.message || "An unknown error occurred" });
  }
};

// --- API ENDPOINTS ---

// People endpoints
app.get('/api/people', wrap((req: any, res: any) => {
  res.json(db.getPeople());
}));

app.get('/api/people/:id', wrap((req: any, res: any) => {
  const person = db.getPerson(req.params.id);
  if (!person) {
    return res.status(404).json({ error: "Person not found" });
  }
  
  // Calculate dynamic relationships
  const people = db.getPeople();
  const parents = db.getParentRelationships();
  const couples = db.getCoupleRelationships();
  const relationships = calculateRelationships(person.id, people, parents, couples);

  res.json({
    person,
    relationships
  });
}));

app.post('/api/people', wrap((req: any, res: any) => {
  const person = db.createPerson(req.body);
  res.status(201).json(person);
}));

app.put('/api/people/:id', wrap((req: any, res: any) => {
  const person = db.updatePerson(req.params.id, req.body);
  res.json(person);
}));

app.delete('/api/people/:id', wrap((req: any, res: any) => {
  db.deletePerson(req.params.id);
  res.json({ success: true });
}));

// Relationships endpoints
app.get('/api/parent-relationships', wrap((req: any, res: any) => {
  res.json(db.getParentRelationships());
}));

app.post('/api/parent-relationships', wrap((req: any, res: any) => {
  const rel = db.createParentRelationship(req.body);
  res.status(201).json(rel);
}));

app.delete('/api/parent-relationships/:id', wrap((req: any, res: any) => {
  db.deleteParentRelationship(req.params.id);
  res.json({ success: true });
}));

app.get('/api/couple-relationships', wrap((req: any, res: any) => {
  res.json(db.getCoupleRelationships());
}));

app.post('/api/couple-relationships', wrap((req: any, res: any) => {
  const rel = db.createCoupleRelationship(req.body);
  res.status(201).json(rel);
}));

app.delete('/api/couple-relationships/:id', wrap((req: any, res: any) => {
  db.deleteCoupleRelationship(req.params.id);
  res.json({ success: true });
}));

// Events endpoints
app.get('/api/events', wrap((req: any, res: any) => {
  const events = db.getEvents();
  const result = events.map(ev => {
    const people = db.getEventPeople(ev.id);
    return { ...ev, people };
  });
  res.json(result);
}));

app.post('/api/events', wrap((req: any, res: any) => {
  const ev = db.createEvent(req.body);
  res.status(201).json(ev);
}));

app.delete('/api/events/:id', wrap((req: any, res: any) => {
  db.deleteEvent(req.params.id);
  res.json({ success: true });
}));

// Photos endpoints
app.get('/api/photos', wrap((req: any, res: any) => {
  const photos = db.getPhotos();
  const result = photos.map(photo => {
    const people = db.getPhotoPeople(photo.id);
    return { ...photo, people: people.map(p => p.personId) };
  });
  res.json(result);
}));

app.post('/api/photos', wrap((req: any, res: any) => {
  const photo = db.createPhoto(req.body);
  res.status(201).json(photo);
}));

app.put('/api/photos/:id', wrap((req: any, res: any) => {
  const photo = db.updatePhoto(req.params.id, req.body);
  res.json(photo);
}));

app.delete('/api/photos/:id', wrap((req: any, res: any) => {
  db.deletePhoto(req.params.id);
  res.json({ success: true });
}));

// File Upload endpoints
app.post('/api/upload/profile', upload.single('image'), wrap((req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file uploaded" });
  }
  const filePath = `/uploads/profile-images/${req.file.filename}`;
  res.json({ filePath });
}));

app.post('/api/upload/photo', upload.single('image'), wrap((req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ error: "No photo file uploaded" });
  }
  const filePath = `/uploads/family-photos/${req.file.filename}`;
  res.json({ filePath });
}));

// AI Image Summary Endpoint
app.post('/api/photos/:id/generate-summary', wrap(async (req: any, res: any) => {
  const photoId = req.params.id;
  const photos = db.getPhotos();
  const photo = photos.find(p => p.id === photoId && !p.isDeleted);
  
  if (!photo) {
    return res.status(404).json({ error: "Photo not found" });
  }

  // Get full local path of photo file
  const baseName = path.basename(photo.filePath);
  const fullPath = path.join(process.cwd(), 'data/family-photos', baseName);

  if (!fs.existsSync(fullPath)) {
    return res.status(400).json({ error: `Photo file does not exist locally at path ${photo.filePath}` });
  }

  const settings = db.getSettings();
  
  // Verify if summaries are enabled
  if (!settings.imageSummariesEnabled) {
    return res.status(400).json({ error: "Image summaries are currently disabled in settings." });
  }

  try {
    const fileBuffer = fs.readFileSync(fullPath);
    const base64Data = fileBuffer.toString('base64');
    
    let summaryText = "";

    // If Custom Local or OpenAI-compatible provider is selected (and configured)
    if (settings.apiProvider === 'openai' && settings.apiKey) {
      // Use custom OpenAI endpoint
      const response = await fetch(`${settings.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: settings.apiModel || 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Identify the visual elements of this family photograph. Provide a warm, helpful summary describing the number of visible people, the indoor or outdoor setting, details about clothing, environment, approximate period or era, and custom objects. Avoid identifying specific personal names; use descriptors like "family members" or "people".'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Data}`
                  }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI provider returned error: ${response.statusText} (${errText})`);
      }

      const openAiResult = await response.json();
      summaryText = openAiResult?.choices?.[0]?.message?.content || "";
    } else {
      // DEFAULT: Use the official server-side Gemini API key!
      // This works out-of-the-box in AI Studio!
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        throw new Error("No Gemini API Key found in server environment variables. Please check the Settings secrets.");
      }

      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const imagePart = {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      };

      const textPart = {
        text: 'Analyze this family photograph and generate an elegant, warm, and helpful description. Include: number of visible people, indoor/outdoor scene, whether it is a family gathering, wedding, birthday, graduation, or approximate period/era, visible environment, clothing, and objects. Do NOT claim a person is a specific family member by name; use neutral descriptive language. Keep the response to 1-2 friendly, descriptive paragraphs.'
      };

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: { parts: [imagePart, textPart] }
      });

      summaryText = aiResponse.text || "";
    }

    if (!summaryText) {
      throw new Error("Failed to generate summary text from provider.");
    }

    // Save generated summary to database
    const updatedPhoto = db.updatePhoto(photoId, { generatedSummary: summaryText });
    res.json(updatedPhoto);

  } catch (err: any) {
    console.error("AI Generation error:", err);
    res.status(500).json({ error: `AI Generation failed: ${err.message}` });
  }
}));

// Settings endpoints
app.get('/api/settings', wrap((req: any, res: any) => {
  res.json(db.getSettings());
}));

app.put('/api/settings', wrap((req: any, res: any) => {
  const updated = db.updateSettings(req.body);
  res.json(updated);
}));

// History & Undo endpoints
app.get('/api/history', wrap((req: any, res: any) => {
  res.json(db.getHistory());
}));

app.post('/api/history/undo', wrap((req: any, res: any) => {
  const success = db.undo();
  res.json({ success });
}));

// Import & Export Backup endpoints
app.get('/api/backup/export', wrap((req: any, res: any) => {
  const backupData = db.getBackupData();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=family-tree-backup.json');
  res.send(JSON.stringify(backupData, null, 2));
}));

app.post('/api/backup/import', wrap((req: any, res: any) => {
  const data = req.body;
  
  if (!data.people || !Array.isArray(data.people)) {
    return res.status(400).json({ error: "Invalid backup format: missing 'people' list" });
  }

  // Pre-validate: count elements
  const peopleCount = data.people.filter((p: any) => !p.isDeleted).length;
  const relsCount = (data.parent_relationships || []).filter((r: any) => !r.isDeleted).length;

  res.json({
    valid: true,
    peopleCount,
    relationshipsCount: relsCount,
    familyName: data.settings?.familyName || "Unknown Family Backup"
  });
}));

app.post('/api/backup/import/confirm', wrap((req: any, res: any) => {
  const data = req.body;
  const success = db.restoreBackup(data);
  if (success) {
    res.json({ success: true, message: "Backup successfully restored!" });
  } else {
    res.status(400).json({ error: "Failed to restore backup data. File may be corrupted." });
  }
}));

// List local backups on server disk
app.get('/api/backup/list', wrap((req: any, res: any) => {
  const backupsDir = path.join(process.cwd(), 'data/backups');
  const files = fs.readdirSync(backupsDir);
  const backups = files
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const stats = fs.statSync(path.join(backupsDir, f));
      return {
        filename: f,
        createdAt: stats.mtime.toISOString(),
        size: stats.size
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(backups);
}));

// Create local backup on server disk
app.post('/api/backup/create', wrap((req: any, res: any) => {
  const backupsDir = path.join(process.cwd(), 'data/backups');
  const backupData = db.getBackupData();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.json`;
  const filePath = path.join(backupsDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');

  // Clean old backups if we have more than configured (e.g. keep max 5)
  const files = fs.readdirSync(backupsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({ name: f, time: fs.statSync(path.join(backupsDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length > 5) {
    for (let i = 5; i < files.length; i++) {
      fs.unlinkSync(path.join(backupsDir, files[i].name));
    }
  }

  res.json({ success: true, filename });
}));

// Restore local backup from server disk
app.post('/api/backup/restore-disk', wrap((req: any, res: any) => {
  const { filename } = req.body;
  const filePath = path.join(process.cwd(), 'data/backups', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Backup file not found" });
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(fileContent);
  const success = db.restoreBackup(data);

  if (success) {
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "Failed to restore local backup" });
  }
}));

// --- VITE DEV SETUP OR PRODUCTION SERVING ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
