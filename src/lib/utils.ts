// Utilitaires purs (sans dépendance React) de LocalStream

/**
 * Nettoie un nom de fichier vidéo pour en extraire un titre lisible :
 * retire l'extension, les marqueurs S01E01/1x01, l'année, les tags de qualité.
 */
export const getCleanTitle = (filename: string): string => {
  let title = filename.replace(/\.[^/.]+$/, "");
  title = title.replace(/[sS]\d+(\s*)?([eE]\d+)?|(\d+)(\s*)?x(\d+).*/i, "");
  title = title.replace(/(19|20)\d{2}.*/, "");
  title = title.replace(/[\.\-_]/g, " ");
  title = title.replace(/1080p|720p|2160p|4k|bluray|webrip|hdtv|x264|x265|hevc|vostfr|french|truefrench/ig, "");
  // Supprimer les parenthèses ou crochets orphelins à la fin après nettoyage de l'année
  return title.trim().replace(/[\(\[\{]\s*$/, "").replace(/[\s\-\.\(\)\[\]\{\}]+$/, "").trim();
};

/** Formate une taille en octets en chaîne lisible (B/KB/MB/GB/TB). */
export const formatSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/** Formate une durée en secondes en "Xh Ym" (ou "Ym"). */
export const formatDuration = (seconds: number): string => {
  if (!seconds) return 'Inconnue';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

/** Devine la résolution affichable (4K/2K/1080p/720p/SD) depuis le nom de fichier. */
export const getResolution = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('2160p') || n.includes('4k') || n.includes('uhd')) return '4K';
  if (n.includes('1440p')) return '2K';
  if (n.includes('1080p') || n.includes('fhd')) return '1080p';
  if (n.includes('720p') || n.includes('hd')) return '720p';
  if (n.includes('480p') || n.includes('sd')) return 'SD';
  return '';
};

// Convertit un fichier SRT en VTT
export const srt2vtt = (srt: string): string => {
  let vtt = 'WEBVTT\n\n';
  vtt += srt
    .replace(/\{\\([ibu])\}/g, '<$1>')
    .replace(/\{\\\/([ibu])\}/g, '</$1>')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    .replace(/\r\n/g, '\n');
  return vtt;
};

/**
 * Écriture localStorage tolérante au dépassement de quota.
 * Évite que l'app plante (QuotaExceededError) quand le cache de métadonnées
 * devient trop volumineux sur une grosse bibliothèque.
 */
export const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`Stockage local saturé, impossible d'enregistrer "${key}".`, e);
  }
};

/**
 * Détecte si un fichier vidéo est une vidéo personnelle (souvenir, caméra téléphone, etc.)
 * basé uniquement sur le nom du fichier et son chemin.
 */
export const isPersonalVideo = (name: string, path: string): boolean => {
  const n = name.toLowerCase();
  const p = (path || '').toLowerCase().replace(/\\/g, '/');

  // --- Patterns de chemins suspects ---
  const suspectPaths = [
    '/dcim/',
    '/camera/',
    '/whatsapp/',
    '/snapchat/',
    '/instagram/',
    '/telegram/',
    '/signal/',
    '/viber/',
    '/messenger/',
    '/tiktok/',
    '/recordings/',
    '/screenrecord',
    '/screen_record',
    '/voicememos/',
  ];
  if (suspectPaths.some(sp => p.includes(sp))) return true;

  // --- Patterns de noms de fichiers phones/caméscopes ---
  const personalPatterns = [
    // Android caméra standard : VID_20240315_143022
    /^vid_\d{8}_\d{6}/,
    // Android : 20240315_143022
    /^\d{8}_\d{6}/,
    // Android : 2024-03-15-14-30-22
    /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}/,
    // iPhone photo/vidéo : IMG_1234 ou MOV_1234 (sans titre, juste numéro)
    /^(img|mov|dsc|dscn|dscf|mvc|mvc|sdc|vlc)_?\d{4,}/i,
    // Caméscope Sony/Panasonic : C0001, M2U00001
    /^(c|m2u|avchd|mts|m2ts)\d{4,}/i,
    // GoPro
    /^(gh|gx|gopr|gp)\d{4,}/i,
    // DJI drone
    /^dji_\d{4}/i,
    // WhatsApp
    /^whatsapp.*(video|vidéo|audio)/i,
    // Snapchat
    /^snapchat-\d+/i,
    // Fichier purement numérique (aucune lettre hors extension)
    /^\d+\.(mp4|mkv|avi|mov|webm)$/i,
    // Format date ISO ou slash sans titre : 2024-03-15 14.30.22
    /^\d{4}[-_.\s]\d{2}[-_.\s]\d{2}[\s_-]\d{2}[.:_]\d{2}/,
    // Screen recording Android/Samsung
    /^screen.?record/i,
    // Format caméra sécurité / timelapse
    /^\d{14}\.(mp4|avi|mkv)$/i,
  ];

  return personalPatterns.some(pattern => pattern.test(n));
};
