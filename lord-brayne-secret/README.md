# Brain King Animation - StackBlitz Setup Guide

## CORRECT Setup for StackBlitz (Vite + React)

### Step 1: Create New React Project
1. Go to https://stackblitz.com
2. Click "New Project" → Choose **"React"** (this uses Vite)

### Step 2: Replace/Upload Files

**In root directory (base level):**
- Replace `package.json` with the provided one
- Replace `index.html` with `vite-index.html` (rename to `index.html`)
- Add `vite.config.js`

**In `src/` folder:**
- Replace `main.jsx` with the provided one (or `src/main.jsx` file)
- Add `TalkingKing.jsx` (from `src/` folder)
- Add `brain-king-styles.css` (from `src/` folder)
- Delete default `App.jsx` and `App.css` (not needed)

### Step 3: Correct File Structure
```
brain-king-animation/
├── src/
│   ├── main.jsx                    ← Entry point
│   ├── TalkingKing.jsx             ← Component
│   └── brain-king-styles.css       ← Styles
├── index.html                      ← Use vite-index.html (rename it)
├── package.json                    ← Vite version
└── vite.config.js                  ← Vite config
```

### Step 4: Run
1. StackBlitz will auto-install dependencies
2. Click "Install & Run" if needed
3. Animation should start!

## Files You Need

From the files provided, use these for StackBlitz:

**Root directory:**
- `vite-index.html` → rename to `index.html`
- `package.json`
- `vite.config.js`

**src/ folder:**
- `src/main.jsx`
- `src/TalkingKing.jsx`
- `src/brain-king-styles.css`

## What NOT to Use

Don't use these files (they were for different setups):
- ❌ `index.js` (wrong entry point)
- ❌ `public-index.html` (Create React App style)
- ❌ Root-level `TalkingKing.jsx` and `brain-king-styles.css` (need to be in `src/`)

## Troubleshooting

**404 Error?**
- Make sure `index.html` is in root (not in public/)
- Make sure `index.html` has `<script type="module" src="/src/main.jsx"></script>`
- Make sure files are in `src/` folder, not root

**Module errors?**
- Wait for dependencies to install
- Check that `vite.config.js` exists
- Verify `package.json` has Vite dependencies

**Images/Audio not loading?**
- Check browser console
- Verify internet connectivity for GitHub URLs

**Blank screen?**
- Check browser console for errors
- Make sure all imports in `main.jsx` are correct
- Verify Three.js version is 0.128.0

## Quick Checklist

✅ Created React project in StackBlitz  
✅ `index.html` in root with correct script tag  
✅ `vite.config.js` in root  
✅ `package.json` with Vite (not react-scripts)  
✅ `src/main.jsx` exists  
✅ `src/TalkingKing.jsx` exists  
✅ `src/brain-king-styles.css` exists  

If all checked, it should work!

