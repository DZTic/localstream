import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { VideoFile } from '../../lib/types';

// On mocke les appels réseau TMDB tout en gardant les constructeurs d'URL réels.
vi.mock('../../lib/tmdb', async (importActual) => {
  const actual = await importActual<typeof import('../../lib/tmdb')>();
  return {
    ...actual,
    searchMulti: vi.fn(async () => []),
    searchMovie: vi.fn(async () => []),
    getMovieDetails: vi.fn(async () => ({})),
    getCollection: vi.fn(async () => ({})),
    getSeason: vi.fn(async () => ({ episodes: [] })),
  };
});

import { useTmdbMetadata } from '../useTmdbMetadata';
import * as tmdb from '../../lib/tmdb';

const v = (name: string, extra: Partial<VideoFile> = {}): VideoFile => ({
  url: 'blob:x', name, type: 'video/mp4', path: name, ...extra,
});

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

const render = (videos: VideoFile[], tmdbApiKey = '') =>
  renderHook(() => useTmdbMetadata({
    videos, whitelistedVideos: new Set<string>(), tmdbApiKey, addLog: () => {},
  }));

describe('useTmdbMetadata', () => {
  it('expose groupedVideos dérivé des vidéos (regroupement des épisodes)', () => {
    const { result } = render([v('Show.S01E01.mkv'), v('Show.S01E02.mkv')]);
    expect(result.current.groupedVideos).toHaveLength(1);
    expect(result.current.groupedVideos[0].episodes).toHaveLength(2);
  });

  it('charge le cache d\'affiches depuis localStorage', () => {
    localStorage.setItem('moviePosters', JSON.stringify({ 'Film.mkv': 'http://img/p.jpg' }));
    const { result } = render([]);
    expect(result.current.posters['Film.mkv']).toBe('http://img/p.jpg');
  });

  it('ne tente aucun appel TMDB sans clé API', () => {
    render([v('Inception.2010.mkv')]);
    expect(tmdb.searchMulti).not.toHaveBeenCalled();
    expect(tmdb.searchMovie).not.toHaveBeenCalled();
  });

  it('fetchSingleMetadata enregistre et persiste l\'affiche trouvée', async () => {
    (tmdb.searchMulti as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { title: 'Inception', media_type: 'movie', poster_path: '/p.jpg', overview: 'rêve', release_date: '2010-07-16', genre_ids: [28] },
    ]);

    const { result } = render([], 'fake-key');

    await act(async () => {
      await result.current.fetchSingleMetadata(v('Inception.2010.1080p.mkv'));
    });

    expect(result.current.posters['Inception.2010.1080p.mkv']).toBe('https://image.tmdb.org/t/p/w500/p.jpg');
    expect(result.current.overviews['Inception.2010.1080p.mkv']).toBe('rêve');

    // La persistance localStorage se fait dans un effet → on attend qu'elle soit écrite.
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('moviePosters') || '{}');
      expect(saved['Inception.2010.1080p.mkv']).toBe('https://image.tmdb.org/t/p/w500/p.jpg');
    });
  });
});
