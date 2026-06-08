import { externalRequest } from './http';
import { srt2vtt } from './utils';
import { Subtitle } from './types';

const OS_BASE = 'https://api.opensubtitles.com/api/v1';

/**
 * Service OpenSubtitles : fonctions pures sans état React.
 * Toutes les requêtes passent par externalRequest (natif CapacitorHttp / web proxy).
 */

/** Authentifie et renvoie le token, ou null en cas d'échec. */
export const osLogin = async (
  apiKey: string,
  username: string,
  password: string
): Promise<string | null> => {
  const response = await externalRequest({
    url: `${OS_BASE}/login`,
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: { username, password },
  });
  const data = await response.json();
  return data?.token ?? null;
};

/** Recherche des sous-titres FR/EN pour une requête textuelle. */
export const osSearch = async (apiKey: string, query: string): Promise<Subtitle[]> => {
  const response = await externalRequest({
    url: `${OS_BASE}/subtitles?query=${encodeURIComponent(query)}&languages=fr,en`,
    method: 'GET',
    headers: { 'Api-Key': apiKey, 'Accept': 'application/json' },
  });
  const data = await response.json();
  if (!data?.data) return [];
  return data.data.map((item: any) => ({
    id: item.attributes.files[0].file_id.toString(),
    language: item.attributes.language,
    filename: item.attributes.files[0].file_name,
  }));
};

/**
 * Télécharge un sous-titre, le convertit en VTT et renvoie son contenu.
 * Renvoie null si le lien de téléchargement est indisponible.
 */
export const osDownloadVtt = async (
  apiKey: string,
  token: string,
  fileId: string
): Promise<string | null> => {
  const response = await externalRequest({
    url: `${OS_BASE}/download`,
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: { file_id: parseInt(fileId) },
  });
  const data = await response.json();
  if (!data?.link) return null;
  const subResponse = await externalRequest({ url: data.link, method: 'GET' });
  const srtContent = await subResponse.text();
  return srt2vtt(srtContent);
};
