# Deployment Anleitung - Waldkindergarten App

## Voraussetzungen

1. **Git installieren** (falls noch nicht geschehen):
   - Gehe zu https://git-scm.com/download/win
   - Lade Git für Windows herunter und installiere es
   - Starte PowerShell neu

2. **GitHub Account** erstellen (falls noch nicht vorhanden):
   - Gehe zu https://github.com
   - Erstelle einen kostenlosen Account

3. **Vercel Account** erstellen:
   - Gehe zu https://vercel.com
   - Melde dich mit deinem GitHub Account an

## Schritt 1: Git Repository initialisieren

```bash
# Git Repository initialisieren
git init

# Alle Dateien hinzufügen
git add .

# Ersten Commit erstellen
git commit -m "Initial commit: Waldkindergarten App"
```

## Schritt 2: GitHub Repository erstellen

1. Gehe zu https://github.com/new
2. Repository Name: `waldkindergarten-app`
3. Beschreibung: `Next.js App für Waldkindergarten Verwaltung`
4. Wähle "Public" oder "Private" (je nach Wunsch)
5. Klicke "Create repository"

## Schritt 3: Code zu GitHub pushen

```bash
# Remote Repository hinzufügen (ersetze USERNAME mit deinem GitHub Username)
git remote add origin https://github.com/USERNAME/waldkindergarten-app.git

# Code zu GitHub pushen
git branch -M main
git push -u origin main
```

## Schritt 4: Vercel Deployment

1. Gehe zu https://vercel.com/dashboard
2. Klicke "New Project"
3. Wähle dein GitHub Repository `waldkindergarten-app`
4. Klicke "Import"

### Umgebungsvariablen in Vercel konfigurieren:

1. Gehe zu deinem Projekt in Vercel
2. Klicke auf "Settings" → "Environment Variables"
3. Füge folgende Variablen hinzu:
   - `NEXT_PUBLIC_SUPABASE_URL`: Deine Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Dein Supabase Anon Key

## Schritt 5: Automatisches Deployment

- Jeder Push zu GitHub löst automatisch ein neues Deployment aus
- Du erhältst eine URL wie: `https://waldkindergarten-app-username.vercel.app`

## Lokale Umgebungsvariablen

Erstelle eine `.env.local` Datei (wird nicht zu Git hinzugefügt):

```bash
# Kopiere env.example zu .env.local
cp env.example .env.local

# Bearbeite .env.local mit deinen echten Werten
```

## Troubleshooting

### Build Fehler
```bash
# Lokalen Build testen
npm run build
```

### Dependency Probleme
```bash
# Node modules neu installieren
rm -rf node_modules package-lock.json
npm install
```

### Git Probleme
```bash
# Git Status prüfen
git status

# Änderungen committen
git add .
git commit -m "Beschreibung der Änderungen"
git push
```

## Nützliche Befehle

```bash
# Entwicklungsserver starten
npm run dev

# Produktions-Build erstellen
npm run build

# Produktionsserver lokal starten
npm start

# Code-Qualität prüfen
npm run lint
```

## Support

Bei Problemen:
1. Prüfe die Vercel Deployment Logs
2. Teste den Build lokal mit `npm run build`
3. Stelle sicher, dass alle Umgebungsvariablen korrekt gesetzt sind 