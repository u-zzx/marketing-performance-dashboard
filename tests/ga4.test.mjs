import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGa4Csv, aggregateLandingTraffic } from '../lib/ga4.js';

const csv = `# Property: Demo, metadata
# Alle Nutzer
Sitzung – primäre Channelgruppe (Standard-Channelgruppe);Landingpage + Abfragestring;Sitzungen;Sitzungen mit Interaktionen;Engagement-Rate;Durchschnittliche Interaktionsdauer pro Sitzung
Paid Search;/de/news-elektronische-rechnung?campaign=a;59;40;67,8%;83
Direct;/de/news-elektronische-rechnung?campaign=b;9;5;55%;45
Custom Channel;/resources/certificates;100;60;60%;90
Paid Search;/other;1.200;700;58,3%;12
# Totals, ignored
`;

test('German metadata export retains dimensions and parses numeric metrics', () => {
  const rows = parseGa4Csv(csv);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].trafficChannel, 'Paid Search');
  assert.equal(rows[0].landingPage, '/de/news-elektronische-rechnung?campaign=a');
  assert.equal(rows[0].sessions, 59);
  assert.equal(rows[0].engagementRate, 67.8);
  assert.equal(rows[0].avgEngagementTime, '1:23');
  assert.equal(rows[3].sessions, 1200);
});

test('contains filter affects only Top 5 and never filters all sources', () => {
  const rows = parseGa4Csv(csv);
  const all = aggregateLandingTraffic(rows);
  const filtered = aggregateLandingTraffic(rows, 'ELEKTRONISCHE-RECHNUNG');
  assert.deepEqual(filtered.sources, all.sources);
  assert.equal(filtered.topPages.length, 1);
  assert.equal(filtered.topPages[0].total, 68);
  const grouped = all.topPages.find(page => page.total === 68);
  assert.equal(grouped.urls.size, 2);
  assert.equal(grouped.path, '/de/news-elektronische-rechnung');
  const empty = aggregateLandingTraffic(rows, 'no-matching-page');
  assert.equal(empty.matches, 0);
  assert.equal(empty.topPages.length, 0);
  assert.deepEqual(empty.sources, all.sources);
  assert.ok(all.channels.includes('Custom Channel'));
});

test('Top 5 ranks all rows, including rows beyond the table preview', () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ landingPage: `/page-${i}`, trafficChannel: 'Direct', sessions: i }));
  const result = aggregateLandingTraffic(rows);
  assert.equal(result.topPages.length, 5);
  assert.equal(result.topPages[0].path, '/page-29');
  assert.equal(result.topPages[4].total, 25);
});

test('legacy source/medium and English landing exports remain supported', () => {
  const legacy = parseGa4Csv('Source / Medium,Sessions,Engaged Sessions,Engagement Rate,Average engagement time\ngoogle / organic,12,6,0.5,40');
  assert.equal(legacy[0].engagementRate, 50);
  assert.equal(legacy[0].sourceMedium, 'google / organic');
  assert.equal(aggregateLandingTraffic(legacy).sources[0].sessions, 12);
  assert.equal(aggregateLandingTraffic(legacy).topPages.length, 0);
  assert.equal(parseGa4Csv('SESSION DEFAULT CHANNEL GROUP,LANDING PAGE + QUERY STRING,SESSIONS\nDirect,/,7')[0].landingPage, '/');
  assert.throws(() => parseGa4Csv('wrong,headers\na,b'), /Sessions/);
});
