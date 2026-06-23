import { describe, it, expect } from 'vitest';
import { groupVideos } from '../grouping';
import { filterAndSortVideos } from '../sorting';
import type { VideoFile } from '../types';

const v = (name: string, extra: Partial<VideoFile> = {}): VideoFile => ({
  url: 'blob:x', name, type: 'video/mp4', path: name, ...extra,
});

describe('groupVideos — cas limites', () => {
  it('trie correctement une série multi-saisons mélangée', () => {
    const res = groupVideos(
      [v('Dark.S02E01.mkv'), v('Dark.S01E02.mkv'), v('Dark.S01E01.mkv'), v('Dark.S03E01.mkv'), v('Dark.S02E02.mkv')],
      {}, {}, new Set()
    );
    expect(res).toHaveLength(1);
    expect(res[0].episodes!.map(e => `${e.season}x${e.episode}`)).toEqual([
      '1x1', '1x2', '2x1', '2x2', '3x1',
    ]);
  });

  it('renseigne season/episode à partir du format NxM', () => {
    const res = groupVideos([v('Friends 1x05.mkv'), v('Friends 1x02.mkv')], {}, {}, new Set());
    expect(res[0].episodes!.map(e => e.episode)).toEqual([2, 5]);
    expect(res[0].episodes!.every(e => e.season === 1)).toBe(true);
  });

  it('garde séparées deux séries distinctes', () => {
    const res = groupVideos([v('Show.A.S01E01.mkv'), v('Show.B.S01E01.mkv')], {}, {}, new Set());
    expect(res).toHaveLength(2);
  });
});

describe('filterAndSortVideos — valeurs manquantes', () => {
  const baseOpts = {
    sortBy: 'alpha' as const, filterGenre: 'all' as const, filterResolution: 'all',
    releaseDates: {}, videoGenres: {}, videoDurations: {}, watchedVideos: {},
  };

  it('tri par taille : les tailles manquantes (0) finissent en dernier', () => {
    const res = filterAndSortVideos(
      [v('Sans.mkv'), v('Gros.mkv', { size: 5000 }), v('Petit.mkv', { size: 100 })],
      { ...baseOpts, sortBy: 'size' }
    );
    expect(res.map(r => r.name)).toEqual(['Gros.mkv', 'Petit.mkv', 'Sans.mkv']);
  });

  it('tri par durée : les durées manquantes finissent en dernier', () => {
    const res = filterAndSortVideos(
      [v('Sans.mkv'), v('Long.mkv'), v('Court.mkv')],
      { ...baseOpts, sortBy: 'duration', videoDurations: { 'Long.mkv': 7200, 'Court.mkv': 1200 } }
    );
    expect(res.map(r => r.name)).toEqual(['Long.mkv', 'Court.mkv', 'Sans.mkv']);
  });

  it('tri par taille d\'un groupe = somme des épisodes', () => {
    const serie = v('S', {
      isSeriesGroup: true, seriesName: 'S',
      episodes: [v('S.S01E01.mkv', { size: 3000 }), v('S.S01E02.mkv', { size: 3000 })],
    });
    const res = filterAndSortVideos(
      [v('Film.mkv', { size: 5000 }), serie],
      { ...baseOpts, sortBy: 'size' }
    );
    // 6000 (série) > 5000 (film)
    expect(res[0].name).toBe('S');
  });

  it('filtre par genre via la table videoGenres', () => {
    const res = filterAndSortVideos(
      [v('Action.mkv'), v('Drame.mkv')],
      { ...baseOpts, filterGenre: 28, videoGenres: { 'Action.mkv': [28], 'Drame.mkv': [18] } }
    );
    expect(res.map(r => r.name)).toEqual(['Action.mkv']);
  });

  it('relègue les contenus vus en fin de liste, non-vus triés d\'abord', () => {
    const res = filterAndSortVideos(
      [v('Avu.mkv'), v('Bnonvu.mkv')],
      { ...baseOpts, watchedVideos: { 'Avu.mkv': true } }
    );
    expect(res.map(r => r.name)).toEqual(['Bnonvu.mkv', 'Avu.mkv']);
  });
});
