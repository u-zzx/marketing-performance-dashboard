import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeAdsCsv, parseAdsCsv, readAdsCsv } from '../lib/adsCsv.js';

const google = 'Anzeigengruppenbericht\n17. September 2026 - 1. Oktober 2026\nAnzeigengruppenstatus\tAnzeigengruppe\tImpressionen\tKosten\tKlicks\tConversions\nAktiviert\tExample\t6.111\t"275,35"\t419\t"1,50"\nGesamt: Kampagne\t\t6.111\t"275,35"\t419\t"1,50"';
const linkedIn = 'Bericht zur Performance\nStartdatum des Berichts: today\n\nStartdatum (in UTC)\tName der Kampagne\tName der Anzeigengruppe\tAnzeigengruppen-ID\tGesamtausgaben\tImpressions\tKlicks\tConversions\tLeads\n1.10.2026\tParent\tAd group\t123\t"330,51"\t4197\t17\t9\t2';

test('UTF-16 original Google export: metadata, tabs, German numbers, totals', async () => {
  const file = new Blob([Buffer.from('\ufeff' + google, 'utf16le')]);
  const result = await readAdsCsv(file, 'LinkedIn');
  assert.equal(result.platform, 'Google');
  assert.deepEqual(result.rows, [{platform:'Google',date:'',campaign:'Example',spend:275.35,impressions:6111,clicks:419,conversions:1.5}]);
});
test('LinkedIn original export: autodetection and explicit duplicate-column priorities', () => {
  const result = parseAdsCsv(linkedIn, 'Google');
  assert.equal(result.platform, 'LinkedIn');
  assert.equal(result.rows[0].campaign, 'Ad group');
  assert.equal(result.rows[0].conversions, 2);
  assert.equal(result.rows[0].spend, 330.51);
  assert.equal(result.rows[0].date, '1.10.2026');
});
test('Existing UTF-8 comma and semicolon files still work', () => {
  const simple = 'campaign,spend,impressions,clicks,conversions\n"Test, campaign",12.34,"1,234",12,2';
  const result = parseAdsCsv(decodeAdsCsv(new TextEncoder().encode(simple)), 'Google');
  assert.equal(result.rows[0].impressions,1234);
  assert.equal(result.rows[0].spend,12.34);
  assert.equal(result.rows[0].campaign,'Test, campaign');
  assert.equal(parseAdsCsv('Kampagne;Kosten;Impressionen;Klicks\nBeispiel;1.234,56;1.234;12','Google').rows[0].spend,1234.56);
});
test('Invalid files fail rather than silently replacing data with empty rows', () => {
  assert.throws(() => parseAdsCsv('not a report','Google'));
  assert.throws(() => parseAdsCsv('campaign,spend,clicks\na,bad,4','Google'), /numeric/);
});
