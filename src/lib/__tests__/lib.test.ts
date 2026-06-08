import { describe, it, expect } from 'vitest';
import { getCleanTitle, isPersonalVideo, srt2vtt, getResolution, formatSize, formatDuration } from '../utils';
import { posterUrl, backdropUrl, stillUrl } from '../tmdb';
import { groupVideos } from '../grouping';
import { filterAndSortVideos } from '../sorting';
import { VideoFile } from '../types';

// Fabrique un VideoFile minimal pour les tests
const v = (name: string, extra: Partial<VideoFile> = {}): VideoFile => ({
  url: 'blob:x',
  name,
  type: 'video/mp4',
  path: name,
  ...extra,
});

describe('getCleanTitle', () => {
  it('retire extension, année et tags de qualité', () => {
    expect(getCleanTitle('Inception.2010.1080p.BluRay.x264.mkv')).toBe('Inception');
  });
  it('retire le marqueur de série S01E01', () => {
    expect(getCleanTitle('Breaking.Bad.S01E01.720p.mkv')).toBe('Breaking Bad');
  });
  it('gère le format 1x01', () => {
    expect(getCleanTitle('The Office 1x05.mp4')).toBe('The Office');
  });
});

describe('isPersonalVideo', () => {
  it('détecte une vidéo caméra Android', () => {
    expect(isPersonalVideo('VID_20240315_143022.mp4', '/Movies/VID_20240315_143022.mp4')).toBe(true);
  });
  it('détecte un chemin DCIM', () => {
    expect(isPersonalVideo('clip.mp4', '/storage/emulated/0/DCIM/Camera/clip.mp4')).toBe(true);
  });
  it('détecte WhatsApp par le chemin', () => {
    expect(isPersonalVideo('movie.mp4', '/WhatsApp/Media/movie.mp4')).toBe(true);
  });
  it("laisse passer un vrai film", () => {
    expect(isPersonalVideo('Inception.2010.1080p.mkv', '/Movies/Inception.2010.1080p.mkv')).toBe(false);
  });
});

describe('srt2vtt', () => {
  it('ajoute l\'en-tête WEBVTT et convertit les virgules en points', () => {
    const srt = '1\n00:00:01,000 --> 00:00:04,000\nBonjour\n';
    const out = srt2vtt(srt);
    expect(out.startsWith('WEBVTT')).toBe(true);
    expect(out).toContain('00:00:01.000 --> 00:00:04.000');
  });
});

describe('getResolution', () => {
  it('reconnaît 4K, 1080p, 720p', () => {
    expect(getResolution('Film.2160p.mkv')).toBe('4K');
    expect(getResolution('Film.1080p.mkv')).toBe('1080p');
    expect(getResolution('Film.720p.mkv')).toBe('720p');
  });
  it('renvoie une chaîne vide si rien', () => {
    expect(getResolution('Film.mkv')).toBe('');
  });
});

describe('formatSize', () => {
  it('formate les octets', () => {
    expect(formatSize(0)).toBe('0 B');
    expect(formatSize(1024)).toBe('1 KB');
    expect(formatSize(1024 * 1024 * 1024)).toBe('1 GB');
  });
});

describe('formatDuration', () => {
  it('formate heures et minutes', () => {
    expect(formatDuration(0)).toBe('Inconnue');
    expect(formatDuration(90)).toBe('1m');
    expect(formatDuration(3660)).toBe('1h 1m');
  });
});

describe('URLs TMDB', () => {
  it('construit les URLs avec la bonne taille', () => {
    expect(posterUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w500/abc.jpg');
    expect(backdropUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/original/abc.jpg');
    expect(stillUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w500/abc.jpg');
  });
  it('renvoie undefined sans chemin', () => {
    expect(posterUrl(null)).toBeUndefined();
    expect(posterUrl(undefined)).toBeUndefined();
  });
});

describe('groupVideos', () => {
  it('regroupe les épisodes d\'une même série triés par saison/épisode', () => {
    const res = groupVideos(
      [v('Show.S01E02.mkv'), v('Show.S01E01.mkv'), v('Show.S02E01.mkv')],
      {}, {}, new Set()
    );
    expect(res).toHaveLength(1);
    expect(res[0].isSeriesGroup).toBe(true);
    expect(res[0].episodes!.map(e => e.name)).toEqual([
      'Show.S01E01.mkv', 'Show.S01E02.mkv', 'Show.S02E01.mkv',
    ]);
  });

  it('exclut les vidéos personnelles non whitelistées', () => {
    const res = groupVideos([v('VID_20240315_143022.mp4')], {}, {}, new Set());
    expect(res).toHaveLength(0);
  });

  it('réintègre une vidéo personnelle whitelistée', () => {
    const name = 'VID_20240315_143022.mp4';
    const res = groupVideos([v(name)], {}, {}, new Set([name]));
    expect(res).toHaveLength(1);
  });

  it('regroupe en saga 2+ films d\'une même collection', () => {
    const col = { id: 1, name: 'Saga X' };
    const res = groupVideos(
      [v('FilmA.mkv'), v('FilmB.mkv')],
      { 'FilmA.mkv': col, 'FilmB.mkv': col },
      {}, new Set()
    );
    expect(res).toHaveLength(1);
    expect(res[0].seriesName).toBe('Saga X');
    expect(res[0].episodes).toHaveLength(2);
  });

  it('laisse un film seul de collection en standalone', () => {
    const col = { id: 1, name: 'Saga X' };
    const res = groupVideos([v('FilmA.mkv')], { 'FilmA.mkv': col }, {}, new Set());
    expect(res).toHaveLength(1);
    expect(res[0].isSeriesGroup).toBeUndefined();
  });
});

describe('filterAndSortVideos', () => {
  const baseOpts = {
    sortBy: 'alpha', filterGenre: 'all' as const, filterResolution: 'all',
    releaseDates: {}, videoGenres: {}, videoDurations: {}, watchedVideos: {},
  };

  it('trie par ordre alphabétique', () => {
    const res = filterAndSortVideos([v('Zebra.mkv'), v('Alpha.mkv')], baseOpts);
    expect(res.map(r => r.name)).toEqual(['Alpha.mkv', 'Zebra.mkv']);
  });

  it('relègue les vidéos vues en fin de liste', () => {
    const res = filterAndSortVideos(
      [v('Alpha.mkv'), v('Beta.mkv')],
      { ...baseOpts, watchedVideos: { 'Alpha.mkv': true } }
    );
    expect(res.map(r => r.name)).toEqual(['Beta.mkv', 'Alpha.mkv']);
  });

  it('filtre par résolution', () => {
    const res = filterAndSortVideos(
      [v('Film.1080p.mkv'), v('Film.720p.mkv')],
      { ...baseOpts, filterResolution: '1080p' }
    );
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe('Film.1080p.mkv');
  });
});
