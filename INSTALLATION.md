# Installation Guide - Zhupani Family Tree Platform

## Voraussetzungen

- Node.js (v18 oder höher)
- MySQL (v8.0 oder höher)
- npm oder yarn

## Schritt-für-Schritt Installation

### 1. Repository klonen
```bash
git clone <repository-url>
cd zhupani-family-tree
```

### 2. Dependencies installieren
```bash
# Alle Dependencies installieren (Backend + Frontend)
npm run install-all

# Oder manuell:
npm install
cd server && npm install
cd ../client && npm install
```

### 3. Datenbank einrichten

#### MySQL-Datenbank erstellen
```sql
CREATE DATABASE zhupani_family_tree CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Umgebungsvariablen konfigurieren
```bash
# Im server/ Ordner eine .env Datei erstellen
cp server/env.example server/.env
```

Bearbeiten Sie die `server/.env` Datei:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=zhupani_family_tree

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Email Configuration (optional für Passwort-Reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=Zhupani Family Tree <noreply@zhupani.com>

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Datenbank-Setup ausführen
```bash
npm run setup-db
```

Dies erstellt:
- Alle notwendigen Tabellen
- Einen Standard-Admin-Benutzer (admin@zhupani.com / admin123)
- Eine Standard-Familie

### 5. Anwendung starten

#### Entwicklungsumgebung
```bash
# Beide Server gleichzeitig starten (Backend + Frontend)
npm run dev

# Oder separat:
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

#### Produktionsumgebung
```bash
# Backend bauen und starten
cd server
npm run build
npm start

# Frontend bauen
cd client
npm run build
```

### 6. Anwendung aufrufen

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Health Check: http://localhost:5000/health

## Standard-Anmeldedaten

Nach der Installation können Sie sich mit folgenden Daten anmelden:

- **E-Mail:** admin@zhupani.com
- **Passwort:** admin123

## Projektstruktur

```
zhupani-family-tree/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # React Komponenten
│   │   ├── pages/         # Seiten-Komponenten
│   │   ├── services/      # API-Services
│   │   ├── types/         # TypeScript Typen
│   │   └── utils/         # Hilfsfunktionen
│   └── public/            # Statische Dateien
├── server/                # Node.js Backend
│   ├── src/
│   │   ├── controllers/   # Route Controller
│   │   ├── models/        # Datenbank-Modelle
│   │   ├── routes/        # API-Routen
│   │   ├── middleware/    # Express Middleware
│   │   └── utils/         # Hilfsfunktionen
│   └── uploads/           # Hochgeladene Dateien
└── docs/                  # Dokumentation
```

## API-Endpunkte

### Authentifizierung
- `POST /api/auth/register` - Benutzer registrieren
- `POST /api/auth/login` - Benutzer anmelden
- `POST /api/auth/forgot-password` - Passwort vergessen
- `POST /api/auth/reset-password` - Passwort zurücksetzen
- `GET /api/auth/me` - Aktueller Benutzer

### Familien
- `GET /api/families` - Alle Familien abrufen
- `POST /api/families` - Neue Familie erstellen
- `PUT /api/families/:id` - Familie bearbeiten
- `DELETE /api/families/:id` - Familie löschen

### Personen
- `GET /api/persons` - Alle Personen abrufen
- `POST /api/persons` - Neue Person erstellen
- `PUT /api/persons/:id` - Person bearbeiten
- `DELETE /api/persons/:id` - Person löschen

### Beziehungen
- `GET /api/relationships` - Alle Beziehungen abrufen
- `POST /api/relationships` - Neue Beziehung erstellen
- `PUT /api/relationships/:id` - Beziehung bearbeiten
- `DELETE /api/relationships/:id` - Beziehung löschen

### Beiträge
- `GET /api/posts` - Alle Beiträge abrufen
- `POST /api/posts` - Neuen Beitrag erstellen
- `PUT /api/posts/:id` - Beitrag bearbeiten
- `DELETE /api/posts/:id` - Beitrag löschen

## Fehlerbehebung

### Häufige Probleme

1. **Datenbankverbindung fehlgeschlagen**
   - Überprüfen Sie die MySQL-Einstellungen in der .env Datei
   - Stellen Sie sicher, dass MySQL läuft
   - Überprüfen Sie Benutzername und Passwort

2. **Port bereits belegt**
   - Ändern Sie den PORT in der .env Datei
   - Oder beenden Sie andere Anwendungen, die den Port verwenden

3. **CORS-Fehler**
   - Überprüfen Sie die CORS_ORIGIN Einstellung
   - Stellen Sie sicher, dass Frontend und Backend auf den richtigen Ports laufen

4. **Datei-Upload funktioniert nicht**
   - Überprüfen Sie die UPLOAD_PATH Einstellung
   - Stellen Sie sicher, dass der Uploads-Ordner existiert und beschreibbar ist

### Logs überprüfen

```bash
# Backend-Logs
cd server
npm run dev

# Frontend-Logs
cd client
npm start
```

## Deployment

### Shared Hosting
1. Frontend build erstellen: `cd client && npm run build`
2. Backend-Dependencies installieren: `cd server && npm install --production`
3. Datenbank-Migration ausführen: `npm run setup-db`
4. Umgebungsvariablen konfigurieren
5. PM2 oder ähnliches für Prozess-Management verwenden

### Docker (optional)
```bash
# Docker Compose Datei erstellen und ausführen
docker-compose up -d
```

## Support

Bei Problemen oder Fragen:
1. Überprüfen Sie die Logs
2. Stellen Sie sicher, dass alle Voraussetzungen erfüllt sind
3. Überprüfen Sie die Umgebungsvariablen
4. Kontaktieren Sie das Entwicklungsteam

## Lizenz

MIT License - siehe LICENSE Datei für Details.
