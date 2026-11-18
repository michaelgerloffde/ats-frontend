// Einfaches Rate-Limit im Arbeitsspeicher: höchstens "max" Anfragen je Absender (IP) in "windowMs"
export function rateLimit({ max, windowMs, message }) {
  const hits = new Map();   // Schlüssel: IP-Adresse, Wert: { count, resetAt }

  // Abgelaufene Einträge regelmäßig entfernen, damit die Liste nicht endlos wächst
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    let entry = hits.get(req.ip);

    // Neues Zeitfenster beginnen, wenn es noch keins gibt oder das alte abgelaufen ist
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(req.ip, entry);
    }

    entry.count += 1;
    if (entry.count > max) {
      // Retry-After: nach wie vielen Sekunden es wieder geht
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}