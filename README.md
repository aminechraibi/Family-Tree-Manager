# 🌳 KinChronicle: Interactive Family Tree Builder & Memory Journal

[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite)](https://vite.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express)](https://expressjs.com/)

**KinChronicle** is a beautiful, secure, and modern interactive family tree builder and memory journal designed to chronicle your lineage and preserve your most precious family milestones. Combining a high-performance **interactive pedigree visualization engine** with **multimedia memory galleries** and **kinship relationship calculations**, KinChronicle makes it effortless to curate, visualize, and safeguard your ancestry.

---

## 🌟 Key Features

### 1. Interactive Pedigree & Family Tree Visualization
* **Dynamic Direct Ancestry Visualizer**: Interact with custom-designed tree maps, visualizing ancestral generations, sibling connections, and partner marriages cleanly.
* **Fluid Layouts**: Powered by modern physics-friendly responsive components for perfect desktop-first and mobile-responsive rendering.

### 2. High-Precision Kinship Calculation Engine
* **Automatic Relationship Mapping**: Determine complex generational ties (e.g., biological or adoptive parent-child relations, multi-generation marriages, and custom lineage branches) in real time.
* **Biographical Profiles**: Deep-dive into each individual profile with localized chronologies, active status markers, life milestones, and dynamic galleries.

### 3. Advanced Searchable Select ComboBoxes
* **Instant Auto-Complete Dropdowns**: High-speed, live search filters embedded across all relative picker dropdowns (spouses, children, parent links, tagged members).
* **Frictionless Linkages**: Handles hundreds of active family records seamlessly, making relationship building swift and completely free from dropdown overload.

### 4. Tagged Photo Galleries & Milestone Chronicle
* **Smart Face & Profile Tagging**: Upload memories, title your family photos, specify dates, and link unlimited relatives directly in an interactive album view.
* **Milestone Chronicle Timeline**: Track and filter historical milestones—births, weddings, graduations, achievements, and memoriam pages—tagging specific relatives dynamically.

### 5. Safe & Durable Data Persistence
* **SQLite File-Backed Relational Engine**: Fully powered by high-performance SQLite with WAL journaling and a custom relational ORM layer for local, zero-latency persistence. 
* **Seamless Legacy Migration**: Automatically detects and migrates existing JSON files into your secure SQLite database.
* **Instant Offline Backups**: Import, export, and fully restore complete family datasets locally without third-party surveillance or cloud leaks.
* **Safe Profile Deletion**: Protect family tree integrity with full-context confirmation popups mapping all unlinked relationships (such as fathers, spouses, and descendants) before any delete operations.

---

## 🛠️ Technology Stack

* **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion (Animation library)
* **Backend**: Node.js, Express, SQLite (`better-sqlite3`), Multer (Local memory uploads)
* **Build System**: Vite, Esbuild (Optimized CommonJS standalone bundling)
* **State Management**: Zustand (Instant multi-branch reactive updates)
* **Icons & Typography**: Lucide React, Inter (Sans-serif), JetBrains Mono (Technical detail)

---

## 🚀 Quick Start Guide

Follow these steps to configure, build, and run the development or production environments.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18.x or above) and `npm` installed.

### 1. Installation
Clone the repository and install the project dependencies:
```bash
npm install
```

### 2. Running in Development Mode
To boot up the unified full-stack server using hot reloading (powered by `tsx` and the Vite dev server):
```bash
npm run dev
```
The server will bind to `0.0.0.0:3000` by default. You can open and view the application in your browser at:
`http://localhost:3000`

### 3. Building for Production
The production suite bundles the frontend files into static assets and bundles the TypeScript backend into a highly optimized, standalone CommonJS module using `esbuild`.

To compile the production assets:
```bash
npm run build
```
This produces:
* Combined static build files under `/dist`
* A compiled standalone server entry file at `/dist/server.cjs`

### 4. Running the Production Server
Start the production server using the optimized single-file build:
```bash
npm start
```

---

## 📂 Project Structure

```
├── server/                 # Full-stack backend module
│   └── database/           # In-memory database & file persistence engines
├── src/                    # Frontend React core application
│   ├── components/         # Highly modular design components
│   │   ├── Dashboard.tsx       # Lineage stats & recent milestone updates
│   │   ├── FamilyTree.tsx      # Multi-generation interactive tree view
│   │   ├── PeoplePage.tsx      # Comprehensive relative listings (grid/table views)
│   │   ├── PersonProfile.tsx   # Direct bio, link edits, and relationship math
│   │   ├── PhotosPage.tsx      # Tagged photo collection and lightbox
│   │   ├── EventsPage.tsx      # Historical chronicle and milestone tracking
│   │   ├── SearchableSelect.tsx# Premium autocompleting combobox search component
│   │   └── DeleteConfirmModal.tsx # Safe recursive relation checker popup
│   ├── hooks/              # Global state hooks (useFamilyStore)
│   ├── utils/              # Kinship relationship calculations
│   ├── App.tsx             # Parent viewport controller
│   └── main.tsx            # DOM node attachment
├── server.ts               # Standalone Express Server entry point
├── package.json            # Deployment scripts and dependencies
└── vite.config.ts          # Vite build pipeline and proxy configurations
```

---

## 🔒 Security & Privacy First

All profile imagery, relationship charts, and milestone dates are served under safe container protocols. All databases and backup mechanisms are built to respect your boundaries—no external tracker integrations, no telemetry leakages, and complete data export capabilities at the touch of a button.
