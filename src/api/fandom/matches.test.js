import { describe, expect, it, vi } from 'vitest';
import { fetchAllMatches } from './matches.js';

function match(matchId, dateTimeUtc) {
  return { title: { MatchId: matchId, DateTimeUTC: dateTimeUtc } };
}

describe('fetchAllMatches', () => {
  it('excludes Fandom matches without a scheduled time', async () => {
    const fandomClient = {
      fetchWithRetry: vi.fn().mockResolvedValue([
        match('scheduled', '2026-07-20 08:00:00'),
        match('unscheduled', '')
      ])
    };

    const matches = await fetchAllMatches(fandomClient, 'kespa-cup-2026', '2026 LoL KeSPA Cup');

    expect(matches).toEqual([{ MatchId: 'scheduled', DateTimeUTC: '2026-07-20 08:00:00' }]);
  });
});
