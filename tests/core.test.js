import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBSDate, normalizeNepaliDigits, parseADDate } from '../src/dates.js';
import { buildEmail } from '../src/email.js';
import { dedupeNotices, extractNoticeId, parsePage } from '../src/parser.js';
import { buildState, detectNewNotices } from '../src/state.js';

test('Nepali digits normalize', () => {
  assert.equal(normalizeNepaliDigits('२०८३/४/१५'), '2083/4/15');
});

test('AD and BS dates are validated independently', () => {
  assert.ok(parseADDate('2026-07-30'));
  assert.equal(parseADDate('2083-04-15'), null);
  assert.equal(extractBSDate('2083/04/15'), '2083-04-15');
  assert.equal(extractBSDate('2026/04/15'), null);
});

test('notice IDs and duplicates are handled', () => {
  assert.equal(extractNoticeId('https://exam.tu.edu.np/notices/14101'), '14101');
  assert.equal(dedupeNotices([{ id: '1' }, { id: '1' }, { id: '2' }]).length, 2);
});

test('parser extracts notices and follows an explicit next link', () => {
  const html = `
    <article><span>२०८३/०४/१५</span><a href="/notices/14101">Exam result</a></article>
    <a rel="next" href="/notices?page=2">Next</a>`;
  const result = parsePage(html, 'https://exam.tu.edu.np/notices');
  assert.equal(result.notices.length, 1);
  assert.equal(result.notices[0].bsDate, '2083-04-15');
  assert.equal(result.nextPage, 'https://exam.tu.edu.np/notices?page=2');
});

test('new notice detection and merged state preserve older IDs', () => {
  const previous = {
    seenIds: ['1', 'old'],
    notices: [{ id: 'old', title: 'Old', url: 'https://x/notices/old', discoveredAt: '2026-01-01T00:00:00Z' }],
  };
  const current = [{ id: '1', title: 'Existing', url: 'https://x/notices/1' }, { id: '2', title: 'New', url: 'https://x/notices/2' }];
  assert.deepEqual(detectNewNotices(current, previous).map((notice) => notice.id), ['2']);
  const state = buildState(previous, current, 500, '2026-08-10T00:00:00Z');
  assert.deepEqual(state.seenIds, ['1', '2', 'old']);
  assert.ok(state.notices.some((notice) => notice.id === 'old'));
});

test('email builder escapes notice content', () => {
  const email = buildEmail([{ id: '1', title: '<script>alert(1)</script>', url: 'https://x/?a=1&b=2', bsDate: '2083-04-15' }]);
  assert.match(email.subject, /New Notice/);
  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /&lt;script&gt;/);
});
