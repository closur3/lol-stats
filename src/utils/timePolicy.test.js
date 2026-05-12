import { describe, expect, it } from 'vitest';
import { timePolicy } from './timePolicy.js';

describe('timePolicy', () => {
  it('derives business time fields from DateTimeUTC once at the boundary', () => {
    const time = timePolicy.deriveMatchTime('2026-03-16 18:00:00');

    expect(time.isoTimestamp).toBe('2026-03-16T18:00:00.000Z');
    expect(time.dateDisplay).toBe('03-17 02:00');
    expect(time.fullDateDisplay).toBe('2026-03-17');
    expect(time.matchDateStr).toBe('2026-03-17');
    expect(time.matchTimeStr).toBe('02:00');
    expect(time.weekdayIndex).toBe(1);
    expect(time.timeMinutes).toBe(120);
  });

  it('maps a business day to the UTC dates needed for fandom discovery', () => {
    expect(timePolicy.getUtcDateKeysForBusinessDate('2026-03-17')).toEqual([
      '2026-03-16',
      '2026-03-17'
    ]);
  });

  it('converts business play windows only at the Cloudflare cron boundary', () => {
    expect(timePolicy.businessWindowToUtcCronSegments('2026-05-10', 8, 23)).toEqual([
      { day: 'sun', startHour: 0, endHour: 15 }
    ]);
    expect(timePolicy.businessWindowToUtcCronSegments('2026-05-10', 0, 11)).toEqual([
      { day: 'sat', startHour: 16, endHour: 23 },
      { day: 'sun', startHour: 0, endHour: 3 }
    ]);
  });
});
