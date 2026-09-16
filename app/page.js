'use client';

import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { Upload, CheckCircle2, AlertCircle, RefreshCw, Printer, Globe, Trash2 } from 'lucide-react';
import CampaignPlanning from '@/components/CampaignPlanning';

const COLUMN_MAPPING = {
  date: ['date', 'datum', 'day', 'tag', 'startdatum (in utc)', 'startdatum'],
  campaign: ['campaign', 'kampagne', 'campaign name', 'kampagnenname', 'name der kampagne', 'anzeigengruppe', 'name der anzeigengruppe'],
  spend: ['spend', 'cost', 'kosten', 'amount spent', 'ausgaben', 'gesamtausgaben'],
  impressions: ['impressions', 'impressionen'],
  clicks: ['clicks', 'klicks'],
  conversions: ['conversions', 'abschlüsse', 'leads', 'kontakte']
};

const GA4_COLUMN_MAPPING = {
  sourceMedium: [
    'sitzung - primäre channelgruppe (standard-channelgruppe)', // 完全匹配新表格的第一列
    'sitzung - primäre channelgruppe',
    'sitzung - quelle / medium',
    'source / medium',
    'quelle/medium',
    'session source / medium',
    'session default channel group',
    'default channel grouping'
  ],
  pagePath: [
    'seitenpfad und bildschirmklasse', // 完全匹配新表格的第二列
    'page path and screen class',
    'seitenpfad',
    'page path',
    'landing page',
    'zielseite'
  ],
  sessions: ['sitzungen', 'sessions'],
  engagedSessions: ['sitzungen mit interaktionen', 'engaged sessions'],
  engagementRate: ['engagement-rate', 'engagement rate'],
  avgEngagementTime: [
    'durchschnittliche interaktionsdauer pro sitzung',
    'average engagement time',
    'durchschn. interaktionsdauer pro sitzung',
  ],
};

function normalizeHeader(rawCol) {
  return String(rawCol ?? '')
    .toLowerCase()
    .replace(/\uFEFF/g, '')
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactHeader(rawCol) {
  return normalizeHeader(rawCol)
    .replace(/['"]/g, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*-\s*/g, '-');
}

function getMappedKey(rawCol, mapping) {
  const lower = normalizeHeader(rawCol);
  for (const [key, aliases] of Object.entries(mapping)) {
    if (aliases.includes(lower)) return key;
  }
  return null;
}

function getGa4MappedKey(rawCol) {
  const compact = compactHeader(rawCol);
  if (!compact) return null;

  const rankedAliases = Object.entries(GA4_COLUMN_MAPPING)
    .flatMap(([key, aliases]) => aliases.map((alias) => ({ key, alias: compactHeader(alias) })))
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const { key, alias } of rankedAliases) {
    if (compact === alias) return key;
  }

  for (const { key, alias } of rankedAliases) {
    if (alias.length >= 10 && compact.includes(alias)) return key;
  }

  return null;
}

function isGa4HeaderRow(cells) {
  const mapped = cells.map((cell) => getGa4MappedKey(cell));
  return mapped.includes('sourceMedium') && mapped.includes('sessions');
}

const PERFORMANCE_STORAGE_KEY = 'marketing-performance:v1';

const EMPTY_PERFORMANCE_STATE = {
  googleData: [],
  linkedInData: [],
  ga4TrafficData: [],
  commentMarketing: '',
  commentSales: '',
};

function loadPerformanceState() {
  if (typeof window === 'undefined') return EMPTY_PERFORMANCE_STATE;

  try {
    const raw = window.localStorage.getItem(PERFORMANCE_STORAGE_KEY);
    if (!raw) return EMPTY_PERFORMANCE_STATE;

    const parsed = JSON.parse(raw);
    return {
      googleData: Array.isArray(parsed?.googleData) ? parsed.googleData : [],
      linkedInData: Array.isArray(parsed?.linkedInData) ? parsed.linkedInData : [],
      ga4TrafficData: Array.isArray(parsed?.ga4TrafficData) ? parsed.ga4TrafficData : [],
      commentMarketing: typeof parsed?.commentMarketing === 'string' ? parsed.commentMarketing : '',
      commentSales: typeof parsed?.commentSales === 'string' ? parsed.commentSales : '',
    };
  } catch {
    return EMPTY_PERFORMANCE_STATE;
  }
}

function savePerformanceState(state) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PERFORMANCE_STORAGE_KEY, JSON.stringify(state));
}

export default function Home() {
  const [googleData, setGoogleData] = useState([]);
  const [linkedInData, setLinkedInData] = useState([]);
  const [ga4TrafficData, setGa4TrafficData] = useState([]);
  const [error, setError] = useState('');
  const [commentMarketing, setCommentMarketing] = useState('');
  const [commentSales, setCommentSales] = useState('');
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const stored = loadPerformanceState();
    setGoogleData(stored.googleData);
    setLinkedInData(stored.linkedInData);
    setGa4TrafficData(stored.ga4TrafficData);
    setCommentMarketing(stored.commentMarketing);
    setCommentSales(stored.commentSales);
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    savePerformanceState({
      googleData,
      linkedInData,
      ga4TrafficData,
      commentMarketing,
      commentSales,
    });
  }, [storageReady, googleData, linkedInData, ga4TrafficData, commentMarketing, commentSales]);

  const handleResetData = () => {
    if (!window.confirm('Clear uploaded Google, LinkedIn, GA4 data and comments? Campaign Planning is not affected.')) {
      return;
    }
    setGoogleData([]);
    setLinkedInData([]);
    setGa4TrafficData([]);
    setCommentMarketing('');
    setCommentSales('');
    setError('');
    window.localStorage.removeItem(PERFORMANCE_STORAGE_KEY);
  };

  const parseNumber = (val) => {
    if (!val) return 0;
    let str = val.toString().trim();
    
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(',', '.');
    }
    
    let clean = str.replace(/[^0-9.-]+/g, "");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const parseEngagementRate = (val) => {
    if (val === '' || val == null) return 0;
    const raw = val.toString().trim();
    const hasPercent = raw.includes('%');
    const num = parseNumber(raw);
    if (!Number.isFinite(num)) return 0;
    if (hasPercent) return num;
    return num <= 1 ? num * 100 : num;
  };

  const parseEngagementTime = (val) => {
    if (val === '' || val == null) return '';
    const raw = String(val).trim();
    if (!raw) return '';
    if (raw.includes(':') || /[a-zA-Z]/.test(raw)) return raw;
    const seconds = parseNumber(raw);
    if (!Number.isFinite(seconds)) return raw;
    const total = Math.round(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  const formatEngagementRate = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0.00%';
    return `${num.toFixed(2)}%`;
  };

  const handleParse = (file, platform) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsed = results.data.map(row => {
            let item = { platform, date: '', campaign: '', spend: 0, impressions: 0, clicks: 0, conversions: 0 };
            Object.keys(row).forEach(rawCol => {
              const stdKey = getMappedKey(rawCol, COLUMN_MAPPING);
              if (stdKey) {
                if (['date', 'campaign'].includes(stdKey)) {
                  item[stdKey] = row[rawCol];
                } else {
                  item[stdKey] = parseNumber(row[rawCol]);
                }
              }
            });
            return item;
          }).filter(item => item.campaign);

          if (platform === 'Google') setGoogleData(parsed);
          if (platform === 'LinkedIn') setLinkedInData(parsed);
          setError('');
        } catch (err) {
          setError(`Failed to parse ${platform} CSV. Please check the file format.`);
        }
      }
    });
  };

  const handleParseGa4 = (file) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: 'greedy',
      delimiter: '',
      complete: (results) => {
        try {
          const rows = (results.data || [])
            .map((row) => (Array.isArray(row) ? row : Object.values(row)).map((cell) => String(cell ?? '').replace(/\uFEFF/g, '').trim()))
            .filter((row) => row.some((cell) => cell && !cell.startsWith('#')));

          const headerIndex = rows.findIndex(isGa4HeaderRow);
          if (headerIndex === -1) {
            setError('Failed to parse GA4 CSV. Please check that Source / Medium and Sessions columns are present.');
            return;
          }

          const headerCells = rows[headerIndex];
          const columnKeys = headerCells.map((cell) => getGa4MappedKey(cell));

          const parsed = rows.slice(headerIndex + 1).map((row) => {
            const item = {
              sourceMedium: '',
              pagePath: '', // 确保初始化新字段
              sessions: 0,
              engagedSessions: 0,
              engagementRate: 0,
              avgEngagementTime: '',
            };
            columnKeys.forEach((stdKey, index) => {
              if (!stdKey) return;
              const value = row[index];
              if (stdKey === 'sourceMedium') {
                item.sourceMedium = String(value ?? '').trim();
              } else if (stdKey === 'pagePath') {
                item.pagePath = String(value ?? '').trim(); // 提取页面路径
              } else if (stdKey === 'avgEngagementTime') {
                item.avgEngagementTime = parseEngagementTime(value);
              } else if (stdKey === 'engagementRate') {
                item.engagementRate = parseEngagementRate(value);
              } else {
                item[stdKey] = parseNumber(value);
              }
            });
            return item;
          }).filter((item) => item.sourceMedium && !/^(gesamt|total)$/i.test(item.sourceMedium));

          if (parsed.length === 0) {
            setError('Failed to parse GA4 CSV. Please check that Source / Medium and Sessions columns are present.');
            return;
          }

          setGa4TrafficData(parsed);
          setError('');
        } catch (err) {
          setError('Failed to parse GA4 CSV. Please check the file format.');
        }
      }
    });
  };

  const allData = [...googleData, ...linkedInData];
  const hasAdsData = allData.length > 0;
  const hasGa4Data = ga4TrafficData.length > 0;
  const hasPerformanceData = hasAdsData || hasGa4Data;

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800 print:bg-white print:p-0">
      <div className="max-w-7xl mx-auto space-y-6 print:max-w-none">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4 print:shadow-none print:border-0 print:rounded-none print:p-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">eddyson Marketing Performance Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1 print:hidden">Data Visualization & Campaign Roadmap</p>
          </div>
          <div className="flex flex-wrap gap-3 print:hidden">
            <label className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors">
              <Upload size={16} />
              {googleData.length > 0 ? 'Re-upload Google CSV' : 'Upload Google CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files[0] && handleParse(e.target.files[0], 'Google')} />
            </label>
            <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors">
              <Upload size={16} />
              {linkedInData.length > 0 ? 'Re-upload LinkedIn CSV' : 'Upload LinkedIn CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files[0] && handleParse(e.target.files[0], 'LinkedIn')} />
            </label>
            <label className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors">
              <Upload size={16} />
              {ga4TrafficData.length > 0 ? 'Re-upload GA4 Traffic CSV' : 'Upload GA4 Traffic CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files[0] && handleParseGa4(e.target.files[0])} />
            </label>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Printer size={16} />
              Export to PDF
            </button>
            <button
              type="button"
              onClick={handleResetData}
              className="flex items-center gap-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Trash2 size={16} />
              Reset / Clear Data
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 border border-red-100 text-sm print:hidden">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <CampaignPlanning />

        {hasPerformanceData ? (
          <div className="space-y-6">
            <div className="print:hidden">
              <h2 className="text-xl font-bold text-slate-900">Marketing Performance</h2>
              <p className="mt-1 text-sm text-slate-500">
                Kennzahlen aus hochgeladenen Google Ads-, LinkedIn- und GA4-CSV-Dateien.
              </p>
            </div>

            {hasAdsData && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border print:rounded-none print:break-inside-avoid">
               <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
                <CheckCircle2 className="text-emerald-500" size={20} />
                Raw Data Preview (Google: {googleData.length} | LinkedIn: {linkedInData.length})
              </h2>
              <div className="border border-slate-100 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3">Platform</th>
                      <th className="p-3">Campaign</th>
                      <th className="p-3">Spend</th>
                      <th className="p-3">Impressions</th>
                      <th className="p-3">Clicks</th>
                      <th className="p-3">Conversions / Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allData.map((row, i) => (
                      <tr key={`${row.platform}-${i}`} className="border-t border-slate-100">
                        <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${row.platform === 'Google' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>{row.platform}</span></td>
                        <td className="p-3 font-medium">{row.campaign}</td>
                        <td className="p-3">€{row.spend.toFixed(2)}</td>
                        <td className="p-3">{row.impressions}</td>
                        <td className="p-3">{row.clicks}</td>
                        <td className="p-3">{row.conversions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {hasGa4Data && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border print:rounded-none print:break-inside-avoid">
              <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
                <Globe className="text-purple-500" size={20} />
                GA4 Website Traffic Performance ({ga4TrafficData.length > 25 ? `first 25 of ${ga4TrafficData.length}` : ga4TrafficData.length} sources)
              </h2>
              <div className="border border-slate-100 rounded-lg overflow-x-auto overflow-y-auto max-h-[500px] print:overflow-visible print:max-h-none">
                <table className="w-full text-sm text-left print:text-xs">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10 shadow-sm print:static print:shadow-none">
                    <tr>
                      <th className="p-3 whitespace-nowrap">Source / Channel</th>
                      <th className="p-3">Page Path</th> {/* 新增表头 */}
                      <th className="p-3 text-right">Sessions</th>
                      <th className="p-3 text-right">Engaged Sessions</th>
                      <th className="p-3 text-right">Engagement Rate</th>
                      <th className="p-3 text-right">Avg. Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ga4TrafficData.slice(0, 25).map((row, i) => (
                      <tr key={`${row.sourceMedium}-${i}`} className="border-t border-slate-100 bg-white hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium text-slate-800 whitespace-nowrap">{row.sourceMedium}</td>
                        <td className="p-3 text-slate-500 break-all min-w-[150px]">{row.pagePath || '—'}</td> {/* 新增数据列 */}
                        <td className="p-3 text-right tabular-nums">{row.sessions.toLocaleString('de-DE')}</td>
                        <td className="p-3 text-right tabular-nums">{row.engagedSessions.toLocaleString('de-DE')}</td>
                        <td className="p-3 text-right tabular-nums">{formatEngagementRate(row.engagementRate)}</td>
                        <td className="p-3 text-right tabular-nums">{row.avgEngagementTime || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}

<div className="grid grid-cols-1 gap-6 print:break-inside-avoid">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border print:rounded-none">
                <label htmlFor="comment-marketing" className="block text-lg font-semibold text-slate-800 mb-3">
                  Comment - Marketing
                </label>
                <textarea
                  id="comment-marketing"
                  value={commentMarketing}
                  onChange={(e) => setCommentMarketing(e.target.value)}
                  placeholder="Marketing notes for this report…"
                  className="w-full min-h-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400 print:border-slate-300"
                />
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border print:rounded-none">
                <label htmlFor="comment-sales" className="block text-lg font-semibold text-slate-800 mb-3">
                  Comment - Sales
                </label>
                <textarea
                  id="comment-sales"
                  value={commentSales}
                  onChange={(e) => setCommentSales(e.target.value)}
                  placeholder="Sales notes for this report…"
                  className="w-full min-h-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400 print:border-slate-300"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center text-slate-400 space-y-2 print:hidden">
            <RefreshCw size={36} className="mx-auto opacity-30 animate-spin-slow" />
            <p className="font-medium text-slate-600">Waiting for CSV upload</p>
            <p className="text-xs">Supports raw CSV exports from Google Ads, LinkedIn Ads, and GA4</p>
          </div>
        )}

      </div>
    </div>
  );
}
