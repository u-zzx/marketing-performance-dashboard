import Papa from 'papaparse';

const FIELDS = {
  date: ['date', 'datum', 'day', 'tag', 'startdatum (in utc)', 'startdatum'],
  campaign: ['name der anzeigengruppe', 'anzeigengruppe', 'ad group name', 'ad group', 'campaign', 'kampagne', 'campaign name', 'kampagnenname', 'name der kampagne'],
  spend: ['spend', 'cost', 'kosten', 'amount spent', 'ausgaben', 'gesamtausgaben', 'total spent'],
  impressions: ['impressions', 'impressionen'],
  clicks: ['clicks', 'klicks'],
  conversions: ['conversions', 'abschlüsse', 'leads', 'kontakte'],
};
const normalize = value => String(value ?? '').replace(/\uFEFF/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

export function decodeAdsCsv(buffer) {
  const bytes = new Uint8Array(buffer);
  const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le'
    : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be'
    : bytes[1] === 0 ? 'utf-16le' : bytes[0] === 0 ? 'utf-16be' : 'utf-8';
  return new TextDecoder(encoding).decode(bytes).replace(/^\uFEFF/, '');
}

function numeric(value, integer, german) {
  let raw = String(value ?? '').trim().replace(/[\s\u00a0€$£]/g, '');
  if (!raw || /^(--?|—|n\/a)$/i.test(raw)) return 0;
  if (integer && /^[-+]?\d{1,3}([.,]\d{3})+$/.test(raw)) raw = raw.replace(/[.,]/g, '');
  else if (raw.includes(',') && raw.includes('.')) {
    raw = raw.lastIndexOf(',') > raw.lastIndexOf('.') ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  } else if (raw.includes(',')) {
    raw = !german && /^[-+]?\d{1,3}(,\d{3})+$/.test(raw) ? raw.replace(/,/g, '') : raw.replace(',', '.');
  } else if (german && /^[-+]?\d{1,3}(\.\d{3})+$/.test(raw)) raw = raw.replace(/\./g, '');
  const result = Number(raw);
  if (!Number.isFinite(result)) throw new Error(`Invalid numeric value: ${value}`);
  return result;
}

export function parseAdsCsv(text, fallbackPlatform) {
  for (const delimiter of ['\t', ';', ',']) {
    const { data } = Papa.parse(text, { delimiter, skipEmptyLines: 'greedy' });
    const headerIndex = data.findIndex(row => {
      const headers = row.map(normalize);
      return FIELDS.campaign.some(alias => headers.includes(alias)) &&
        ['spend', 'impressions', 'clicks'].filter(key => FIELDS[key].some(alias => headers.includes(alias))).length >= 2;
    });
    if (headerIndex < 0) continue;
    const headers = data[headerIndex].map(normalize);
    const has = (...values) => values.some(value => headers.includes(value));
    const platform = has('anzeigengruppen-id', 'campaign id') && has('gesamtausgaben', 'total spent') || has('virale impressions', 'viral impressions')
      ? 'LinkedIn' : has('anzeigengruppenstatus', 'conv.-rate', 'ad group status') ? 'Google' : fallbackPlatform;
    const german = has('kosten', 'gesamtausgaben', 'impressionen', 'name der anzeigengruppe');
    const indices = Object.fromEntries(Object.entries(FIELDS).map(([key, aliases]) => {
      // Preserve the existing combined Conversions / Leads field: LinkedIn lead exports prefer Leads.
      const priorities = key === 'conversions' && platform === 'LinkedIn' ? ['leads', ...aliases] : aliases;
      return [key, priorities.map(alias => headers.indexOf(alias)).find(index => index >= 0) ?? -1];
    }));
    const rows = data.slice(headerIndex + 1).filter(row => {
      const name = String(row[indices.campaign] ?? '').trim();
      return name && !/^(gesamt|total)(\s*[:：]|$)/i.test(name) &&
        !/^(gesamt|total)(\s*[:：]|$)/i.test(String(row[0] ?? '').trim()) &&
        !row.every((cell, i) => normalize(cell) === headers[i]);
    }).map(row => {
      if (row.length !== headers.length) throw new Error('A data row does not match the CSV header.');
      const item = { platform, date: '', campaign: '', spend: 0, impressions: 0, clicks: 0, conversions: 0 };
      for (const [key, index] of Object.entries(indices)) {
        if (index < 0) continue;
        item[key] = ['campaign', 'date'].includes(key) ? String(row[index] ?? '').trim()
          : numeric(row[index], ['impressions', 'clicks'].includes(key), german);
      }
      return item;
    });
    if (!rows.length) throw new Error('No campaign data rows found.');
    return { platform, rows };
  }
  throw new Error('Campaign and performance columns could not be found.');
}

export async function readAdsCsv(file, fallbackPlatform) {
  return parseAdsCsv(decodeAdsCsv(await file.arrayBuffer()), fallbackPlatform);
}
