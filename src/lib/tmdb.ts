// Service TMDB : centralise les endpoints de l'API et la construction des URLs d'images.
// Fonctions pures (sans état React) — renvoient le JSON parsé.

const API_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

const buildUrl = (path: string, apiKey: string, params: Record<string, string> = {}) => {
  const qs = new URLSearchParams({ api_key: apiKey, language: 'fr-FR', ...params });
  return `${API_BASE}${path}?${qs.toString()}`;
};

// --- Construction des URLs d'images ---
export const posterUrl = (p?: string | null) => (p ? `${IMG_BASE}/w500${p}` : undefined);
export const backdropUrl = (p?: string | null) => (p ? `${IMG_BASE}/original${p}` : undefined);
export const stillUrl = (p?: string | null) => (p ? `${IMG_BASE}/w500${p}` : undefined);

// --- Endpoints ---
/** Recherche multi (films + séries). Renvoie le tableau de résultats (vide si rien). */
export const searchMulti = async (apiKey: string, query: string): Promise<any[]> => {
  const res = await fetch(buildUrl('/search/multi', apiKey, { query }));
  const data = await res.json();
  return data?.results ?? [];
};

/** Recherche de films uniquement. Renvoie le tableau de résultats. */
export const searchMovie = async (apiKey: string, query: string): Promise<any[]> => {
  const res = await fetch(buildUrl('/search/movie', apiKey, { query }));
  const data = await res.json();
  return data?.results ?? [];
};

/** Détails d'un film (contient belongs_to_collection). */
export const getMovieDetails = async (apiKey: string, movieId: number | string): Promise<any> => {
  const res = await fetch(buildUrl(`/movie/${movieId}`, apiKey));
  return res.json();
};

/** Détails d'une collection (saga). */
export const getCollection = async (apiKey: string, collectionId: number | string): Promise<any> => {
  const res = await fetch(buildUrl(`/collection/${collectionId}`, apiKey));
  return res.json();
};

/** Détails d'une saison de série (liste des épisodes). */
export const getSeason = async (
  apiKey: string,
  tvId: number | string,
  seasonNumber: number
): Promise<any> => {
  const res = await fetch(buildUrl(`/tv/${tvId}/season/${seasonNumber}`, apiKey));
  return res.json();
};

/** Films populaires (utilisé comme test de validité de la clé API). */
export const getPopular = async (apiKey: string): Promise<Response> => {
  return fetch(buildUrl('/movie/popular', apiKey));
};
