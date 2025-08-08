# Zhupani Family Tree Platform

Eine moderne, webbasierte Familienbaum-Plattform für Zhupani.com, die es Familienmitgliedern ermöglicht, interaktive Stammbäume zu erstellen und zu verwalten.

## 🚀 Features

### 👥 Benutzerverwaltung & Rollen
- Registrierung und Login mit JWT-Authentifizierung
- Drei Benutzerrollen: Admin, Familienmitglied, Besucher
- Passwortrücksetzung per E-Mail

### 🌳 Stammbäume & Personenverwaltung
- Interaktive Baumdarstellung mit Zoom und Pan
- Vollständige Personeninformationen (Name, Geburts-/Sterbedaten, Geschlecht, Foto)
- Farbcodierung: Männer (Blau), Frauen (Pink), Verstorbene (Grau)
- Unterstützung für mehrere Partner, Adoptionen, Ex-Beziehungen

### 🔗 Beziehungslogik & Automatik
- Automatische Verknüpfung von Eltern-Kind-Beziehungen
- Partner-Beziehungen mit umgekehrten Verbindungen
- Bearbeitbare und löschbare Beziehungen

### 👨‍👩‍👧‍👦 Familienstruktur
- Nachnamensbasierte Gruppierung
- Mehrere Familien pro Plattform
- Filterbare Familienübersicht

### 📝 Beiträge & Mitteilungen
- Benutzer können Beiträge posten (Text und Bilder)
- Verschiedene Sichtbarkeitsstufen
- Kommentarfunktion

### 📱 Benutzeroberfläche
- Modernes, responsives Design
- Mobile-optimiert
- Dunkelmodus-Unterstützung
- Intuitive Navigation

## 🛠️ Technologie-Stack

- **Frontend:** React 18, TypeScript, Material-UI, D3.js
- **Backend:** Node.js, Express, TypeScript
- **Datenbank:** MySQL
- **Authentifizierung:** JWT
- **Datei-Upload:** Multer
- **E-Mail:** Nodemailer

## 📋 Voraussetzungen

- Node.js (v18 oder höher)
- MySQL (v8.0 oder höher)
- npm oder yarn

## 🚀 Installation

1. **Repository klonen:**
   ```bash
   git clone <repository-url>
   cd zhupani-family-tree
   ```

2. **Alle Dependencies installieren:**
   ```bash
   npm run install-all
   ```

3. **Datenbank einrichten:**
   - MySQL-Datenbank erstellen
   - `.env` Datei im `server/` Ordner konfigurieren
   ```bash
   npm run setup-db
   ```

4. **Anwendung starten:**
   ```bash
   npm run dev
   ```

## 📁 Projektstruktur

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

## 🔧 Konfiguration

### Backend (.env)
```env
PORT=5000
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=zhupani_family_tree
JWT_SECRET=your_jwt_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_UPLOAD_URL=http://localhost:5000/uploads
```

## 📊 Datenbank-Schema

Die Anwendung verwendet folgende Haupttabellen:
- `users` - Benutzerinformationen und Rollen
- `families` - Familieninformationen
- `persons` - Personeninformationen
- `relationships` - Beziehungen zwischen Personen
- `posts` - Benutzerbeiträge
- `comments` - Kommentare zu Beiträgen

## 🎨 Design-System

- **Farben:** Material-UI Theme mit benutzerdefinierten Farben
- **Icons:** Material-UI Icons
- **Typography:** Roboto Font
- **Responsive:** Mobile-First Design

## 🔒 Sicherheit

- JWT-basierte Authentifizierung
- Passwort-Hashing mit bcrypt
- Input-Validierung
- SQL-Injection-Schutz
- CORS-Konfiguration

## 🚀 Deployment

Die Anwendung kann auf Shared-Hosting-Umgebungen mit Node.js-Unterstützung deployed werden:

1. Frontend build erstellen: `npm run build`
2. Backend-Dependencies installieren
3. Datenbank-Migration ausführen
4. Umgebungsvariablen konfigurieren
5. PM2 oder ähnliches für Prozess-Management verwenden

## 📝 Lizenz

MIT License - siehe LICENSE Datei für Details.

## 🤝 Beitragen

1. Fork erstellen
2. Feature-Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add some AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request erstellen

## 📞 Support

Bei Fragen oder Problemen wenden Sie sich an das Entwicklungsteam von Zhupani.com.
