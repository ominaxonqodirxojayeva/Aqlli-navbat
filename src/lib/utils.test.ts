import { describe, expect, it } from 'vitest';
import { calculateWaitTime, formatMinutes, getPeopleAhead, timeAgo } from '@/lib/utils';
import type { NavbatQueue, NavbatQueueSettings } from '@/lib/supabase';

describe('formatMinutes', () => {
  it('formats sub-minute durations', () => {
    expect(formatMinutes(0.4)).toBe('<1 daqiqa');
  });

  it('formats minutes under an hour', () => {
    expect(formatMinutes(45)).toBe('45 daqiqa');
  });

  it('formats whole hours', () => {
    expect(formatMinutes(120)).toBe('2 soat');
  });

  it('formats hours with remaining minutes', () => {
    expect(formatMinutes(125)).toBe('2 soat 5 daqiqa');
  });
});

describe('calculateWaitTime', () => {
  it('returns 0 when nobody is ahead', () => {
    expect(calculateWaitTime(0, 10)).toBe(0);
  });

  it('multiplies people ahead by the average service time', () => {
    expect(calculateWaitTime(3, 5)).toBe(15);
  });
});

describe('getPeopleAhead', () => {
  const settings: NavbatQueueSettings = {
    id: 's1',
    service_id: null,
    organization_id: 'org1',
    current_number: 10,
    prefix: 'A',
    is_open: true,
    updated_at: new Date().toISOString(),
  };

  function makeQueue(overrides: Partial<NavbatQueue>): NavbatQueue {
    return {
      id: 'q1',
      queue_number: 'A-015',
      service_id: null,
      organization_id: 'org1',
      user_id: 'u1',
      status: 'waiting',
      estimated_wait_time: 0,
      created_at: new Date().toISOString(),
      called_at: null,
      completed_at: null,
      ...overrides,
    };
  }

  it('counts people ahead for a waiting ticket', () => {
    expect(getPeopleAhead(makeQueue({ queue_number: 'A-015' }), settings)).toBe(5);
  });

  it('never returns a negative count', () => {
    expect(getPeopleAhead(makeQueue({ queue_number: 'A-005' }), settings)).toBe(0);
  });

  it('returns 0 once the ticket is no longer waiting', () => {
    expect(getPeopleAhead(makeQueue({ queue_number: 'A-020', status: 'serving' }), settings)).toBe(0);
  });
});

describe('timeAgo', () => {
  it('reports "hozir" for the current moment', () => {
    expect(timeAgo(new Date().toISOString())).toBe('hozir');
  });

  it('reports minutes for recent timestamps', () => {
    expect(timeAgo(new Date(Date.now() - 5 * 60000).toISOString())).toBe('5 daqiqa oldin');
  });
});
