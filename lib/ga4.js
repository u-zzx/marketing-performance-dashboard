import Papa from 'papaparse';

const MAPPING = {
  sourceMedium: ['sitzung - quelle / medium', 'source / medium', 'quelle/medium', 'session source / medium'],
  trafficChannel: ['sitzung - primäre channelgruppe (standard-channelgruppe)', 'sitzung - primäre channelgruppe', 'session primary channel group (default channel group)', 'session default channel group', 'default channel grouping'],
  landingPage: ['landingpage + abfragestring', 'landing page + query string', 'landing page', 'zielseite'],
  pagePath: ['seitenpfad und bildschirmklasse', 'page path and screen class', 'seitenpfad', 'page path'],
  sessions: ['sitzungen', 'sessions'],
  engagedSessions: ['sitzungen mit interaktionen', 'engaged sessions'],
  engagementRate: ['engagement-rate', 'engagement rate'],
  avgEngagementTime: ['durchschnittliche interaktionsdauer pro sitzung', 'average engagement time', 'durchschn. interaktionsdauer pro sitzung'],
};

const normalize = (value) => String(value ?? '').toLowerCase().replace(/\uFEFF/g, '')
  .replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim().replace(/\s*([/\-+])\s*/g, '$1');
const aliases = Object.entries(MAPPING).flatMap(([key, values]) => values.map(value => [normalize(value), key]));
const mappedKey = (value) => aliases.find(([alias]) => alias === normalize(value))?.[1];

function number(value, count = false) {
  let raw = String(value ?? '').replace(/[\s\u00a0%]/g, '');
  if (count && /^\d{1,3}([.,]\d{3})+$/.test(raw)) raw = raw.replace(/[.,]/g, '');
  else if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) raw = raw.replace(/\./g, '').replace(',', '.');
  else raw = raw.replace(/,/g, '');
  const result = Number(raw);
  return Number.isFinite(result) ? result : 0;
}

function time(value) {
  const raw = String(value ?? '').trim();
  if (!raw || /[a-zA-Z:]/.test(raw)) return raw;
  const seconds = Math.max(0, Math.round(number(raw)));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return `${hours ? `${hours}:${String(minutes).padStart(2, '0')}` : minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function parseGa4Csv(text) {
  // Remove export metadata before delimiter detection; find the actual table header.
  const content = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => !/^\s*#/.test(line)).join('\n');
  for (const delimiter of [',', ';', '\t']) {
    const { data } = Papa.parse(content, { delimiter, skipEmptyLines: 'greedy' });
    const headerIndex = data.findIndex(row => {
      const keys = row.map(mappedKey);
      return keys.includes('sessions') && (keys.includes('trafficChannel') || keys.includes('sourceMedium'));
    });
    if (headerIndex < 0) continue;
    const keys = data[headerIndex].map(mappedKey);
    const rows = data.slice(headerIndex + 1).filter(row => !/^\s*#/.test(row[0] || '')).map(row => {
      const values = {};
      keys.forEach((key, index) => { if (key) values[key] = String(row[index] ?? '').trim(); });
      const rate = number(values.engagementRate);
      return {
        sourceMedium: values.sourceMedium || values.trafficChannel || '',
        trafficChannel: values.trafficChannel || '',
        landingPage: values.landingPage || '',
        pagePath: values.landingPage || values.pagePath || '',
        sessions: number(values.sessions, true),
        engagedSessions: number(values.engagedSessions, true),
        engagementRate: values.engagementRate?.includes('%') || rate > 1 ? rate : rate * 100,
        avgEngagementTime: time(values.avgEngagementTime),
      };
    }).filter(row => row.sourceMedium && !/^(gesamt|total|grand total)$/i.test(row.sourceMedium));
    if (rows.length) return rows;
  }
  throw new Error('Please check that Source / Medium or Traffic Channel and Sessions columns are present.');
}

export function landingPath(value) {
  const raw = String(value || '').trim();
  try { return new URL(raw).pathname; } catch { return raw.split(/[?#]/)[0]; }
}

export function aggregateLandingTraffic(rows, filter = '') {
  const valid = rows.filter(row => (row.trafficChannel || row.sourceMedium) && Number.isFinite(row.sessions) && row.sessions >= 0)
    .map(row => ({ ...row, trafficChannel: row.trafficChannel || row.sourceMedium }));
  const channels = [...new Set(valid.map(row => row.trafficChannel))].sort();
  const sources = new Map();
  const pages = new Map();
  let matches = 0;
  const query = filter.trim().toLowerCase();
  for (const row of valid) {
    // All sources always use the entire dataset, independently of the landing page filter.
    sources.set(row.trafficChannel, (sources.get(row.trafficChannel) || 0) + row.sessions);
    if (!row.landingPage || !row.landingPage.toLowerCase().includes(query)) continue;
    matches++;
    const path = landingPath(row.landingPage);
    if (!pages.has(path)) pages.set(path, { path, total: 0, channels: new Map(), urls: new Set() });
    const page = pages.get(path);
    page.total += row.sessions;
    page.channels.set(row.trafficChannel, (page.channels.get(row.trafficChannel) || 0) + row.sessions);
    page.urls.add(row.landingPage);
  }
  return {
    channels, matches,
    sources: [...sources].map(([channel, sessions]) => ({ channel, sessions })).sort((a, b) => b.sessions - a.sessions || a.channel.localeCompare(b.channel)),
    topPages: [...pages.values()].sort((a, b) => b.total - a.total || a.path.localeCompare(b.path)).slice(0, 5),
  };
}
