const SECTIONS = [
  ['Welche Daten wir verarbeiten', 'Name, E-Mail-Adresse, optional Telefonnummer, Dein Anschreiben und Deinen Lebenslauf als PDF. Wir fragen bewusst nicht nach Foto, Geburtsdatum, Geschlecht, Familienstand oder Staatsangehörigkeit (Datenminimierung, Art. 5 Abs. 1 lit. c DSGVO; Schutz vor Benachteiligung nach dem AGG).'],
  ['Zweck und Rechtsgrundlage', 'Wir nutzen die Daten ausschließlich, um über Deine Bewerbung zu entscheiden (§ 26 BDSG bzw. Art. 6 Abs. 1 lit. b DSGVO) und dokumentieren Deine Einwilligung mit Zeitstempel. Die Aufnahme in den Talentpool erfolgt nur mit gesonderter, freiwilliger Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).'],
  ['Wer Zugriff hat', 'Nur angemeldete Recruiter:innen und Administrator:innen. Neue Bewerbungen werden zunächst ohne Namen gesichtet. Jeder Statuswechsel wird protokolliert.'],
];

export default function Privacy() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">Datenschutzhinweise für Bewerber:innen</h1>
      <p className="mt-2 text-sm text-slate-500">Musterhinweise für ein Studienprojekt – kein rechtsverbindlicher Text.</p>
      {SECTIONS.map(([title, text]) => (
        <section key={title}>
          <h2 className="mt-8 text-xl font-bold">{title}</h2>
          <p className="mt-2 text-slate-700">{text}</p>
        </section>
      ))}
      <h2 className="mt-8 text-xl font-bold">Wie lange wir speichern</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
        <li>Nach Abschluss des Verfahrens (Zusage oder Absage): 6 Monate, um mögliche Ansprüche nach § 15 Abs. 4 AGG abwehren zu können. Danach automatische Löschung.</li>
        <li>Mit Talentpool-Einwilligung: 24 Monate nach Abschluss.</li>
        <li>Bei Rückzug der Bewerbung: sofort.</li>
      </ul>
      <h2 className="mt-8 text-xl font-bold">Deine Rechte</h2>
      <p className="mt-2 text-slate-700">Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerruf Deiner Einwilligung (Art. 15–21, Art. 7 Abs. 3 DSGVO). Über Deinen persönlichen Status-Link kannst Du Deine Bewerbung jederzeit selbst zurückziehen und löschen.</p>
    </div>
  );
}
