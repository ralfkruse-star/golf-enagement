# PC Caddie Integration & Migration

## Überblick

PC Caddie ist eine weit verbreitete Golfclub-Management-Software. Viele Clubs nutzen sie für:
- Mitgliederverwaltung
- Handicap-Verwaltung
- Turniere
- Tee-Time Buchungen
- Finanzen

**Strategische Optionen:**

### Option A: Integration (Kurzfristig)
PC Caddie als "System of Record" behalten, aber Daten synchronisieren.

### Option B: Schrittweise Ablösung (Langfristig)
Golf Engagement System erweitern und PC Caddie phasenweise ersetzen.

---

## Option A: PC Caddie Integration

### Architektur

```
PC Caddie (MySQL)
      ↓
 Sync Service (Cron)
      ↓
Golf Engagement DB
      ↓
Mobile App / Dashboard
```

### Zu synchronisierende Daten

**1. Mitglieder (täglich)**
- Stammdaten (Name, Email, Geburtsdatum)
- Mitgliedsnummer
- Mitgliedstyp
- Status (aktiv/inaktiv)
- Handicap

**2. Turniere/Events (täglich)**
- Turnierdaten
- Teilnehmerlisten
- Ergebnisse

**3. Tee-Times (stündlich)**
- Gebuchte Slots
- Verfügbarkeit

### Implementierung

```typescript
// PC Caddie Sync Service

interface PCCaddieConfig {
  host: string;
  database: string;
  user: string;
  password: string;
}

class PCCaddieSync {
  private mysql: any;

  async syncMembers() {
    // 1. Fetch from PC Caddie
    const members = await this.mysql.query(`
      SELECT
        Mitgliedsnummer as memberNumber,
        Vorname as firstName,
        Nachname as lastName,
        Email as email,
        Handicap as handicap,
        MitgliedsTyp as type,
        Status as status
      FROM Mitglieder
      WHERE Status = 'aktiv'
    `);

    // 2. Upsert to Golf Engagement DB
    for (const member of members) {
      await prisma.member.upsert({
        where: { membershipNumber: member.memberNumber },
        create: {
          membershipNumber: member.memberNumber,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          handicap: member.handicap,
          membershipType: this.mapMembershipType(member.type),
          membershipStatus: 'ACTIVE',
          password: await this.generateTempPassword(),
        },
        update: {
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          handicap: member.handicap,
        }
      });
    }

    logger.info(`Synced ${members.length} members from PC Caddie`);
  }

  async syncTournaments() {
    const tournaments = await this.mysql.query(`
      SELECT
        TurnierID as id,
        Name as name,
        Datum as date,
        Beschreibung as description,
        MaxTeilnehmer as maxParticipants
      FROM Turniere
      WHERE Datum >= CURDATE()
    `);

    for (const tournament of tournaments) {
      await prisma.event.upsert({
        where: { externalId: `pccaddie-${tournament.id}` },
        create: {
          externalId: `pccaddie-${tournament.id}`,
          title: tournament.name,
          description: tournament.description,
          type: 'TOURNAMENT',
          startDate: new Date(tournament.date),
          maxParticipants: tournament.maxParticipants,
          status: 'PUBLISHED',
        },
        update: {
          title: tournament.name,
          maxParticipants: tournament.maxParticipants,
        }
      });
    }
  }

  async syncHandicaps() {
    // Sync latest handicaps from PC Caddie
    const handicaps = await this.mysql.query(`
      SELECT Mitgliedsnummer, Handicap, Datum
      FROM HandicapHistory
      WHERE Datum = (
        SELECT MAX(Datum)
        FROM HandicapHistory h2
        WHERE h2.Mitgliedsnummer = HandicapHistory.Mitgliedsnummer
      )
    `);

    for (const hcp of handicaps) {
      await prisma.member.updateMany({
        where: { membershipNumber: hcp.Mitgliedsnummer },
        data: { handicap: hcp.Handicap }
      });
    }
  }

  private mapMembershipType(pcCaddieType: string): string {
    const mapping: Record<string, string> = {
      'Vollmitglied': 'FULL',
      'Seniorenmitglied': 'SENIOR',
      'Jugendmitglied': 'JUNIOR',
      'Gastmitglied': 'GUEST',
    };
    return mapping[pcCaddieType] || 'FULL';
  }

  private async generateTempPassword(): Promise<string> {
    // Generate random password for first-time login
    const password = Math.random().toString(36).slice(-8);
    return bcrypt.hash(password, 10);
  }
}

// Cron Job (every night at 2 AM)
cron.schedule('0 2 * * *', async () => {
  const sync = new PCCaddieSync();
  await sync.syncMembers();
  await sync.syncTournaments();
  await sync.syncHandicaps();
});
```

### Vorteile Integration
✅ Schnell implementierbar
✅ PC Caddie bleibt Master
✅ Keine Disruption für Admins
✅ Mitglieder profitieren sofort

### Nachteile Integration
❌ Abhängigkeit von PC Caddie
❌ Sync-Delays
❌ Doppelte Datenhaltung
❌ Limitiert auf PC Caddie Features

---

## Option B: PC Caddie Ablösung

### Phasenplan

**Phase 1: Parallel-Betrieb (3-6 Monate)**
- Golf Engagement läuft parallel
- Alle Daten werden synchronisiert
- Admins nutzen PC Caddie
- Mitglieder nutzen Golf Engagement App

**Phase 2: Feature-Parität (6-12 Monate)**
- Alle PC Caddie Features in Golf Engagement
- Admin-Schulungen
- Daten-Migration Tools

**Phase 3: Migration (3 Monate)**
- Vollständige Daten-Migration
- PC Caddie als Read-Only
- Support & Troubleshooting

**Phase 4: Sunset (1 Monat)**
- PC Caddie abschalten
- Archivierung

### Zusätzliche Features für Ablösung

**Finanzen & Buchhaltung**
- Mitgliedsbeiträge-Verwaltung
- Rechnungsstellung
- SEPA-Lastschriften
- Mahnwesen
- Export für Steuerberater

**Handicap-Verwaltung**
- DGV-Handicap-System
- Turnier-Scorekarten
- Handicap-Historie
- Automatische Anpassungen

**Turniere (Advanced)**
- Verschiedene Spielformen (Stableford, Zählspiel, etc.)
- Netto/Brutto Wertungen
- Live-Scoring während Turnier
- Ergebnis-Export

**Statistiken & Reports**
- Finanzbericht
- Mitglieder-Entwicklung
- Auslastungs-Reports
- Turnier-Statistiken

### Migration-Checkliste

- [ ] PC Caddie Datenbank-Backup
- [ ] Schema-Mapping (PC Caddie → Golf Engagement)
- [ ] Daten-Bereinigung (Duplikate, ungültige Daten)
- [ ] Test-Migration (Staging)
- [ ] Daten-Validierung
- [ ] Admin-Training
- [ ] Rollback-Plan
- [ ] Go-Live

---

## Empfehlung

**Kurzfristig (0-3 Monate):**
→ **Integration** (Option A)
- Schnell umzusetzen
- Low Risk
- Sofortiger Member-Benefit

**Mittelfristig (3-12 Monate):**
→ **Evaluierung** der PC Caddie Abhängigkeit
- Feature-Gap-Analyse
- Kosten-Nutzen-Rechnung
- Entscheidung für/gegen Ablösung

**Langfristig (12+ Monate):**
→ **Optionale Ablösung** (Option B)
- Wenn strategisch sinnvoll
- Volle Kontrolle über Features
- Keine Lizenzkosten

---

## PC Caddie API (falls verfügbar)

Falls PC Caddie eine moderne API hat:

```typescript
// REST API statt MySQL-Zugriff
const response = await fetch('https://pccaddie.example.com/api/members', {
  headers: {
    'Authorization': `Bearer ${PC_CADDIE_API_KEY}`,
  }
});

const members = await response.json();
```

**Vorteil:** Cleaner, wartbarer, keine direkten DB-Zugriffe

---

## Kosten-Schätzung

**Integration (Option A):**
- Entwicklung: ~40 Stunden
- Testing: ~10 Stunden
- **Total: ~50 Stunden**

**Ablösung (Option B):**
- Feature-Entwicklung: ~300 Stunden
- Migration & Testing: ~80 Stunden
- Training & Support: ~40 Stunden
- **Total: ~420 Stunden**

**Aber:** Langfristige Einsparung durch wegfallende PC Caddie Lizenz!
