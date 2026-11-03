/**
 * Synthetische Demodaten für den Mock. Fiktives Unternehmen, erfundene Personen.
 * Dieselben Daten kannst Du später als Seed-Skript für Deine echte Datenbank verwenden.
 */
const DAY = 86_400_000;
const daysAgo = (n, hour = 9) => new Date(Date.now() - n * DAY + hour * 3_600_000 - (Date.now() % DAY)).toISOString();

const JOBS = [
  ['Disponent:in Straßenverkehr (m/w/d)', 'Disposition', 'Hamburg', 'Vollzeit', 'published',
    'Du planst und steuerst nationale Touren für unsere Fernverkehrsflotte.\nDu bist Ansprechperson für Fahrer:innen, Kund:innen und Subunternehmen.\nDu optimierst Auslastung und Laufwege mit unserem Transport-Management-System.',
    'Abgeschlossene Ausbildung als Kaufmann/-frau für Spedition und Logistikdienstleistung oder vergleichbare Qualifikation.\nErste Erfahrung in der Disposition ist von Vorteil.\nOrganisationstalent und Freude an Kommunikation.'],
  ['Fachkraft für Lagerlogistik (m/w/d)', 'Lager', 'Hannover', 'Vollzeit', 'published',
    'Wareneingang, Einlagerung und Kommissionierung im Mehrschichtbetrieb.\nBedienung von Flurförderzeugen.\nInventuren und Qualitätskontrollen.',
    'Abgeschlossene Ausbildung als Fachkraft für Lagerlogistik.\nStaplerschein oder Bereitschaft, ihn zu erwerben.\nZuverlässigkeit und Teamgeist.'],
  ['Werkstudent:in Data Analytics (m/w/d)', 'IT', 'Hamburg', 'Werkstudium', 'published',
    'Du unterstützt beim Aufbau von Dashboards zu Lieferzeiten und Auslastung.\nDu bereitest Daten mit SQL und Python auf.\nDu arbeitest eng mit der Disposition zusammen.',
    'Eingeschriebenes Studium in Informatik, Wirtschaftsinformatik oder ähnlich.\nGrundkenntnisse in SQL.\n15–20 Stunden pro Woche.'],
  ['Ausbildung Kaufmann/-frau für Spedition (m/w/d)', 'Ausbildung', 'Bremen', 'Ausbildung', 'published',
    'Drei Jahre Ausbildung mit Stationen in Disposition, Zoll, Buchhaltung und Vertrieb.\nEigene Projekte ab dem zweiten Lehrjahr.',
    'Guter mittlerer Schulabschluss oder Abitur.\nInteresse an Logistik und internationalen Warenströmen.'],
  ['Berufskraftfahrer:in CE Nahverkehr (m/w/d)', 'Fuhrpark', 'Hannover', 'Vollzeit', 'published',
    'Zustellung an Filialen im Großraum Hannover, abends zu Hause.\nBe- und Entladung mit Hebebühne.\nFahrzeugkontrolle vor Fahrtantritt.',
    'Führerschein CE mit Modulen nach BKrFQG.\nFahrerkarte.\nGute Deutschkenntnisse.'],
  ['IT-Administrator:in (m/w/d)', 'IT', 'Hamburg', 'Vollzeit', 'published',
    'Betreuung unserer Client- und Serverlandschaft an vier Standorten.\nVerwaltung von Benutzerkonten und Berechtigungen.\nUnterstützung bei Projekten zur IT-Sicherheit.',
    'Ausbildung als Fachinformatiker:in Systemintegration oder Studium.\nErfahrung mit Windows Server und Netzwerken.\nStrukturierte Arbeitsweise.'],
  ['Teamleitung Kundenservice (m/w/d)', 'Kundenservice', 'Leipzig', 'Vollzeit', 'published',
    'Fachliche und disziplinarische Führung eines Teams von acht Personen.\nWeiterentwicklung von Prozessen und Kennzahlen.\nEskalationsstelle für Schlüsselkunden.',
    'Mehrjährige Erfahrung im Kundenservice, idealerweise in der Logistik.\nErste Führungserfahrung.\nSicheres Auftreten.'],
  ['Sachbearbeiter:in Zoll (m/w/d)', 'Disposition', 'Bremen', 'Teilzeit', 'published',
    'Erstellung von Ausfuhr- und Einfuhranmeldungen.\nKlärung von Rückfragen mit Zollbehörden.\nPflege von Stammdaten.',
    'Kaufmännische Ausbildung.\nKenntnisse in ATLAS von Vorteil.\n20–30 Stunden pro Woche.'],
  ['Lagerhelfer:in Saisonaushilfe (m/w/d)', 'Lager', 'Leipzig', 'Teilzeit', 'published',
    'Unterstützung bei Kommissionierung und Verpackung im Weihnachtsgeschäft.\nMitarbeit im Wareneingang nach Bedarf.',
    'Keine Ausbildung erforderlich.\nKörperliche Belastbarkeit und Zuverlässigkeit.'],
  ['Controller:in (m/w/d)', 'Finanzen', 'Hamburg', 'Vollzeit', 'draft',
    'Monats- und Jahresabschlüsse, Kostenstellenrechnung, Reporting an die Geschäftsführung.',
    'Studium mit Schwerpunkt Controlling.\nSehr gute Excel-Kenntnisse.'],
  ['Speditionskaufmann/-frau Seefracht (m/w/d)', 'Disposition', 'Bremen', 'Vollzeit', 'closed',
    'Organisation von FCL- und LCL-Verschiffungen.\nAbstimmung mit Reedereien und Agenten.',
    'Ausbildung als Kaufmann/-frau für Spedition.\nGute Englischkenntnisse.'],
];

const FIRST = ['Kim', 'Jona', 'Sam', 'Lou', 'Mika', 'Noa', 'Toni', 'Ari', 'Charlie', 'Eli', 'Fin', 'Juli', 'Luca', 'Nika', 'Ronja', 'Yuri'];
const LAST = ['Beispiel', 'Muster', 'Platzhalter', 'Testmann', 'Probst', 'Demo', 'Fiktiv', 'Exempel'];
const NOTES = ['Fachlich sehr passend, Erfahrung mit TMS vorhanden.', 'Telefonat vereinbart für Donnerstag.', 'Gehaltsvorstellung liegt im Rahmen.', 'Anforderungen nur teilweise erfüllt.'];
const PATHS = {
  new: [], screening: ['screening'], interview: ['screening', 'interview'], offer: ['screening', 'interview', 'offer'],
  hired: ['screening', 'interview', 'offer', 'hired'], rejected: ['screening', 'rejected'],
};
const TARGETS = ['new', 'new', 'new', 'screening', 'screening', 'interview', 'interview', 'offer', 'hired', 'rejected', 'rejected'];

export function buildSeed() {
  let seed = 42;
  const rand = (min, max) => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return min + (seed % (max - min + 1)); };

  const jobs = JOBS.map(([title, department, location, employment_type, status, description, requirements], i) => ({
    id: i + 1, title, department, location, employment_type, status, description, requirements,
    created_at: daysAgo((JOBS.length - i) * 3), updated_at: daysAgo((JOBS.length - i) * 3),
  }));

  const applications = [];
  const history = [];
  const notes = [];
  let n = 0;
  for (const job of jobs.filter((j) => j.status !== 'draft')) {
    const count = job.id <= 3 ? 7 : rand(1, 3);
    for (let i = 0; i < count; i++, n++) {
      const id = n + 1;
      const first = FIRST[n % FIRST.length];
      const last = LAST[(n * 3) % LAST.length];
      const created = daysAgo(rand(1, 20), rand(8, 17));
      const target = TARGETS[rand(0, TARGETS.length - 1)];
      const talent = rand(0, 3) === 0;
      const final = target === 'hired' || target === 'rejected';
      applications.push({
        id, job_id: job.id, first_name: first, last_name: last, email: `${first}.${last}.${n}@example.test`.toLowerCase(),
        phone: rand(0, 1) ? `+49 40 ${rand(1000000, 9999999)}` : '',
        cover_letter: `Sehr geehrte Damen und Herren,\n\nhiermit bewerbe ich mich auf die ausgeschriebene Stelle. (Synthetischer Beispieltext.)\n\nViele Grüße\n${first} ${last}`,
        status: target, rating: target === 'new' ? null : rand(2, 5), consent_at: created, talent_pool: talent,
        status_token: `demo${String(id).padStart(44, '0')}`,
        delete_after: final ? new Date(Date.now() + (talent ? 730 : 180) * DAY).toISOString() : null,
        created_at: created, cv: { name: `Lebenslauf_${first}.pdf`, size: rand(80, 900) * 1024 },
      });
      history.push({ application_id: id, to_status: 'new', author: null, changed_at: created });
      // Folgeschritte zeitlich zwischen Eingang und jetzt verteilen
      const span = Date.now() - Date.parse(created);
      PATHS[target].forEach((s, k, all) => history.push({
        application_id: id, to_status: s, author: 'Robin Recruiter',
        changed_at: new Date(Date.parse(created) + (span * (k + 1)) / (all.length + 1)).toISOString(),
      }));
      if (target !== 'new') notes.push({ id: notes.length + 1, application_id: id, author: 'Robin Recruiter', body: NOTES[rand(0, NOTES.length - 1)], created_at: daysAgo(1) });
    }
  }

  const users = [
    { id: 1, name: 'Alex Admin', email: 'admin@kranich.test', password: 'Admin!Demo2026', role: 'admin', active: true, created_at: daysAgo(60) },
    { id: 2, name: 'Robin Recruiter', email: 'recruiter@kranich.test', password: 'Recruiter!Demo2026', role: 'recruiter', active: true, created_at: daysAgo(60) },
  ];

  return { jobs, applications, history, notes, users };
}
