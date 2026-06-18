// Fonction serverless Vercel : interroge l'API publique "Recherche d'entreprises"
// (gouv.fr) côté serveur, pour éviter le blocage CORS côté navigateur.
module.exports = async (req, res) => {
  const raw = (req.query && req.query.q ? String(req.query.q) : '').replace(/\D/g, '');
  if (raw.length !== 9 && raw.length !== 14) {
    res.status(400).json({ error: 'Numéro invalide (SIREN = 9 chiffres, SIRET = 14 chiffres).' });
    return;
  }
  try {
    const url = 'https://recherche-entreprises.api.gouv.fr/search?q=' + encodeURIComponent(raw) + '&page=1&per_page=1';
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    if (!r.ok) {
      res.status(502).json({ error: 'Registre indisponible', status: r.status });
      return;
    }
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erreur lors de la consultation du registre.' });
  }
};
