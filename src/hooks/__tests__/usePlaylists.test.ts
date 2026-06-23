import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlaylists } from '../usePlaylists';

beforeEach(() => localStorage.clear());

describe('usePlaylists', () => {
  it('charge les playlists depuis localStorage', () => {
    localStorage.setItem('playlists', JSON.stringify([{ id: '1', name: 'Favoris', videoNames: ['a.mkv'] }]));
    const { result } = renderHook(() => usePlaylists());
    expect(result.current.playlists).toHaveLength(1);
    expect(result.current.playlists[0].name).toBe('Favoris');
  });

  it('crée une playlist (pré-remplie) et la persiste', () => {
    const { result } = renderHook(() => usePlaylists());
    act(() => result.current.createPlaylist('Soir', ['film.mkv']));
    expect(result.current.playlists).toHaveLength(1);
    expect(result.current.playlists[0]).toMatchObject({ name: 'Soir', videoNames: ['film.mkv'] });
    expect(JSON.parse(localStorage.getItem('playlists')!)[0].name).toBe('Soir');
  });

  it('ignore un nom vide', () => {
    const { result } = renderHook(() => usePlaylists());
    act(() => result.current.createPlaylist('   '));
    expect(result.current.playlists).toHaveLength(0);
  });

  it('ajoute puis retire une vidéo (toggle)', () => {
    const { result } = renderHook(() => usePlaylists());
    act(() => result.current.createPlaylist('L'));
    const id = result.current.playlists[0].id;
    act(() => result.current.toggleVideoInPlaylist(id, 'v.mkv'));
    expect(result.current.playlists[0].videoNames).toEqual(['v.mkv']);
    act(() => result.current.toggleVideoInPlaylist(id, 'v.mkv'));
    expect(result.current.playlists[0].videoNames).toEqual([]);
  });

  it('supprime une playlist et désélectionne si besoin', () => {
    const { result } = renderHook(() => usePlaylists());
    act(() => result.current.createPlaylist('L'));
    const pl = result.current.playlists[0];
    act(() => result.current.setSelectedPlaylist(pl));
    act(() => result.current.deletePlaylist(pl.id));
    expect(result.current.playlists).toHaveLength(0);
    expect(result.current.selectedPlaylist).toBeNull();
  });

  it('retire une vidéo et met à jour la playlist sélectionnée', () => {
    const { result } = renderHook(() => usePlaylists());
    act(() => result.current.createPlaylist('L', ['a.mkv', 'b.mkv']));
    const pl = result.current.playlists[0];
    act(() => result.current.setSelectedPlaylist(pl));
    act(() => result.current.removeVideoFromPlaylist(pl.id, 'a.mkv'));
    expect(result.current.playlists[0].videoNames).toEqual(['b.mkv']);
    expect(result.current.selectedPlaylist!.videoNames).toEqual(['b.mkv']);
  });
});
