// Lasttest T10 (E9): 50 gleichzeitige Anfragen, jede Antwort unter 200 ms
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const PATHS = ['/api/jobs', '/api/jobs/1'];
const PARALLEL = 50;
const LIMIT_MS = 200;

// Eine Anfrage schicken und die Zeit bis zur vollständigen Antwort messen
async function timedRequest(url) {
  const start = performance.now();
  const res = await fetch(url);
  await res.arrayBuffer();
  return { status: res.status, ms: performance.now() - start };
}

let allPassed = true;

for (const path of PATHS) {
  const url = BASE_URL + path;

  // Aufwärmen: erste Anfrage nicht mitzählen
  await timedRequest(url);

  // 50 Anfragen gleichzeitig losschicken und auf alle warten
  const results = await Promise.all(Array.from({ length: PARALLEL }, () => timedRequest(url)));

  const times = results.map((r) => r.ms).sort((a, b) => a - b);
  const errors = results.filter((r) => r.status !== 200).length;
  const median = times[Math.floor(times.length / 2)];
  const slowest = times[times.length - 1];
  const passed = errors === 0 && slowest < LIMIT_MS;
  if (!passed) allPassed = false;

  console.log(`${path}`);
  console.log(`  ${PARALLEL} Anfragen gleichzeitig, Fehler: ${errors}`);
  console.log(`  Median: ${median.toFixed(1)} ms, langsamste: ${slowest.toFixed(1)} ms`);
  console.log(`  -> ${passed ? 'bestanden' : 'NICHT bestanden'} (Grenze ${LIMIT_MS} ms)`);
}

process.exit(allPassed ? 0 : 1);