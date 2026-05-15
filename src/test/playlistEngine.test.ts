import { describe, it, expect } from 'vitest';
import { runPlaylistEngine } from '@/lib/playlistEngine';

describe('runPlaylistEngine', () => {
  const now = Date.now();
  const seed = { id: 'seed', tags: ['rock', 'guitar', '90s'], genre: 'rock' };

  const all = [
    { id: 'a', tags: ['rock', 'guitar', '90s'], genre: 'rock', play_count_7d: 100 }, // perfect tag match
    { id: 'b', tags: ['rock', 'guitar'], genre: 'rock', play_count_7d: 50 },
    { id: 'c', tags: ['pop'], genre: 'pop', play_count_7d: 999 },                    // wrong genre
    { id: 'd', tags: ['rock'], genre: 'rock', play_count_7d: 10 },
    { id: 'seed', tags: ['rock', 'guitar', '90s'], genre: 'rock', play_count_7d: 80 }, // must be filtered
  ];

  it('cold start: ranks by tag + trending, excludes seed', () => {
    const out = runPlaylistEngine({
      seed_song: seed,
      user_history: [],
      session_played: [],
      all_songs: all,
      user_song_scores: [],
    }, now);
    expect(out.playlist[0].song_id).toBe('a');
    expect(out.playlist.find((p) => p.song_id === 'seed')).toBeUndefined();
  });

  it('filters session_played', () => {
    const out = runPlaylistEngine({
      seed_song: seed,
      user_history: [],
      session_played: ['a'],
      all_songs: all,
      user_song_scores: [],
    }, now);
    expect(out.playlist.find((p) => p.song_id === 'a')).toBeUndefined();
  });

  it('uses collaborative when cross-user data exists and history >=3', () => {
    const out = runPlaylistEngine({
      seed_song: seed,
      user_history: [
        { song_id: 'x', timestamp: now - 60_000 },
        { song_id: 'y', timestamp: now - 60_000 },
        { song_id: 'z', timestamp: now - 60_000 },
      ],
      session_played: [],
      all_songs: all,
      user_song_scores: [
        { user_id: 'u1', song_id: 'seed', score: 0.9 },
        { user_id: 'u1', song_id: 'd', score: 0.95 },
        { user_id: 'u2', song_id: 'seed', score: 0.8 },
        { user_id: 'u2', song_id: 'd', score: 0.9 },
      ],
    }, now);
    // 'd' should now beat 'b' even though 'b' has more shared tags
    const dRank = out.playlist.findIndex((p) => p.song_id === 'd');
    const bRank = out.playlist.findIndex((p) => p.song_id === 'b');
    expect(dRank).toBeGreaterThanOrEqual(0);
    expect(dRank).toBeLessThan(bRank);
  });

  it('returns at most 20', () => {
    const big = Array.from({ length: 50 }, (_, i) => ({
      id: `s${i}`, tags: ['rock'], genre: 'rock', play_count_7d: i,
    }));
    const out = runPlaylistEngine({
      seed_song: seed, user_history: [], session_played: [],
      all_songs: big, user_song_scores: [],
    }, now);
    expect(out.playlist.length).toBeLessThanOrEqual(20);
  });
});
