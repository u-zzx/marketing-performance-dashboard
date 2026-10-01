'use client';

import React, { useEffect, useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, RefreshCw, Printer, Globe, Trash2, Pencil } from 'lucide-react';
import CampaignPlanning from '@/components/CampaignPlanning';
import Ga4LandingAnalysis from '@/components/Ga4LandingAnalysis';
import { parseGa4Csv } from '@/lib/ga4';
import { readAdsCsv } from '@/lib/adsCsv';

const PERFORMANCE_STORAGE_KEY = 'marketing-performance:v1';

const EMPTY_PERFORMANCE_STATE = {
  googleData: [],
  linkedInData: [],
  ga4TrafficData: [],
  commentMarketing: '',
  commentSales: '',
  meetingNotes: '',
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
      meetingNotes: typeof parsed?.meetingNotes === 'string' ? parsed.meetingNotes : '',
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
  const [meetingNotes, setMeetingNotes] = useState('');
  
  // 新增：编辑状态控制（默认处于编辑状态）
  const [isEditingMarketing, setIsEditingMarketing] = useState(true);
  const [isEditingSales, setIsEditingSales] = useState(true);
  const [isEditingMeeting, setIsEditingMeeting] = useState(true);
  
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const stored = loadPerformanceState();
    setGoogleData(stored.googleData);
    setLinkedInData(stored.linkedInData);
    setGa4TrafficData(stored.ga4TrafficData);
    setCommentMarketing(stored.commentMarketing);
    setCommentSales(stored.commentSales);
    setMeetingNotes(stored.meetingNotes);
    
    // 智能判断：如果缓存中有数据，直接进入“展示模式”；如果为空，则进入“编辑模式”
    setIsEditingMarketing(!stored.commentMarketing);
    setIsEditingSales(!stored.commentSales);
    setIsEditingMeeting(!stored.meetingNotes);
    
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
      meetingNotes,
    });
  }, [storageReady, googleData, linkedInData, ga4TrafficData, commentMarketing, commentSales, meetingNotes]);

  const handleResetData = () => {
    if (!window.confirm('Clear uploaded Google, LinkedIn, GA4 data, comments and meeting notes? Campaign Planning is not affected.')) {
      return;
    }
    setGoogleData([]);
    setLinkedInData([]);
    setGa4TrafficData([]);
    setCommentMarketing('');
    setCommentSales('');
    setMeetingNotes('');
    // 清空数据时，重置为编辑模式
    setIsEditingMarketing(true);
    setIsEditingSales(true);
    setIsEditingMeeting(true);
    setError('');
    window.localStorage.removeItem(PERFORMANCE_STORAGE_KEY);
  };

  const formatEngagementRate = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0.00%';
    return `${num.toFixed(2)}%`;
  };

  const handleParse = async (file, platform) => {
    try {
      const result = await readAdsCsv(file, platform);
      if (result.platform === 'Google') setGoogleData(result.rows);
      if (result.platform === 'LinkedIn') setLinkedInData(result.rows);
      setError('');
    } catch (err) {
      setError(`Failed to parse CSV. ${err.message}`);
    }
  };

  const handleParseGa4 = async (file) => {
    try {
      setGa4TrafficData(parseGa4Csv(await file.text()));
      setError('');
    } catch (err) {
      setError(`Failed to parse GA4 CSV. ${err.message}`);
    }
  };

  const allData = [...googleData, ...linkedInData];
  const hasAdsData = allData.length > 0;
  const hasGa4Data = ga4TrafficData.length > 0;
  const hasPerformanceData = hasAdsData || hasGa4Data;

  return (
    <div className="dashboard min-h-screen bg-background px-4 py-8 sm:px-8 lg:px-12 font-sans text-foreground print:bg-white print:p-0">
      <div className="dashboard-content max-w-[1440px] mx-auto space-y-10 print:max-w-none">
        
        {/* Dashboard header */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">eddyson Marketing Performance Dashboard</h1>
            <p className="text-sm text-muted mt-1 print:hidden">Data Visualization & Campaign Roadmap</p>
          </div>
          <div className="dashboard-actions flex flex-wrap gap-3 print:hidden">
            <label className="flex items-center gap-2      text-accent border border-line   px-5 py-2.5 rounded-control cursor-pointer text-sm font-medium transition-colors ">
              <Upload size={16} />
              {googleData.length > 0 ? 'Re-upload Google CSV' : 'Upload Google CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files[0] && handleParse(e.target.files[0], 'Google')} />
            </label>
            <label className="flex items-center gap-2      text-accent border border-line   px-5 py-2.5 rounded-control cursor-pointer text-sm font-medium transition-colors ">
              <Upload size={16} />
              {linkedInData.length > 0 ? 'Re-upload LinkedIn CSV' : 'Upload LinkedIn CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files[0] && handleParse(e.target.files[0], 'LinkedIn')} />
            </label>
            <label className="flex items-center gap-2      text-accent border border-line   px-5 py-2.5 rounded-control cursor-pointer text-sm font-medium transition-colors ">
              <Upload size={16} />
              {ga4TrafficData.length > 0 ? 'Re-upload GA4 Traffic CSV' : 'Upload GA4 Traffic CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files[0] && handleParseGa4(e.target.files[0])} />
            </label>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-surface hover:bg-raised text-muted border border-line   px-5 py-2.5 rounded-control cursor-pointer text-sm font-medium transition-colors "
            >
              <Printer size={16} />
              Export to PDF
            </button>
            <button
              type="button"
              onClick={handleResetData}
              className="flex items-center gap-2      text-danger border border-line   px-5 py-2.5 rounded-control cursor-pointer text-sm font-medium transition-colors "
            >
              <Trash2 size={16} />
              Reset / Clear Data
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-danger/10  text-danger p-4 rounded-control flex items-center gap-2 border border-danger/30 text-sm print:hidden ">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <CampaignPlanning />

        {hasPerformanceData ? (
          <div className="space-y-10">
            <div className="print:hidden">
              <h2 className="text-2xl font-normal text-foreground">Marketing Performance</h2>
              <p className="mt-1 text-sm text-muted">
                Kennzahlen aus hochgeladenen Google Ads-, LinkedIn- und GA4-CSV-Dateien.
              </p>
            </div>

            {hasAdsData && (
            <div className="bg-surface  border border-line  p-6 rounded-panel print:shadow-none print:border print:rounded-none print:break-inside-avoid">
               <h2 className="font-medium text-lg flex items-center gap-2 mb-4">
                <CheckCircle2 className="text-accent" size={20} />
                Raw Data Preview (Google: {googleData.length} | LinkedIn: {linkedInData.length})
              </h2>
              <div className="border border-line bg-surface rounded-control overflow-x-auto  ">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface text-foreground border-b border-line">
                    <tr>
                      <th className="p-4">Platform</th>
                      <th className="p-4">Campaign</th>
                      <th className="p-4">Spend</th>
                      <th className="p-4">Impressions</th>
                      <th className="p-4">Clicks</th>
                      <th className="p-4">CPC</th> 
                      <th className="p-4">Conversions / Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allData.map((row, i) => {
                      const cpc = row.clicks > 0 ? (row.spend / row.clicks) : 0;
                      return (
                      <tr key={`${row.platform}-${i}`} className="border-b border-line hover:bg-raised transition-colors last:border-0">
                        <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-medium  print:shadow-none border border-line print:border-slate-200 ${row.platform === 'Google' ? 'bg-raised print:bg-emerald-100 text-accent' : 'bg-raised print:bg-blue-100 text-accent'}`}>{row.platform}</span></td>
                        <td className="p-4 font-medium text-foreground">{row.campaign}</td>
                        <td className="p-4 text-foreground">€{row.spend.toFixed(2)}</td>
                        <td className="p-4 text-foreground">{row.impressions}</td>
                        <td className="p-4 text-foreground">{row.clicks}</td>
                        <td className="p-4 text-foreground">€{cpc.toFixed(2)}</td>
                        <td className="p-4 text-foreground">{row.conversions}</td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {hasGa4Data && (
            <div className="bg-surface  border border-line  p-6 rounded-panel print:shadow-none print:border print:rounded-none print:break-inside-auto">
              <h2 className="font-medium text-lg flex items-center gap-2 mb-4 text-foreground">
                <Globe className="text-accent" size={20} />
                GA4 Website Traffic Performance ({ga4TrafficData.length > 25 ? `first 25 of ${ga4TrafficData.length}` : ga4TrafficData.length} sources)
              </h2>
              <div className="border border-line bg-surface rounded-control overflow-x-auto overflow-y-auto max-h-[500px]   print:overflow-visible print:max-h-none custom-scrollbar">
                <table className="w-full text-sm text-left print:text-xs">
                  <thead className="bg-surface text-foreground sticky top-0 z-10   print:static print:shadow-none">
                    <tr>
                      <th className="p-4 whitespace-nowrap border-b border-line">Source / Channel</th>
                      <th className="p-4 border-b border-line">Page Path</th>
                      <th className="p-4 text-right border-b border-line">Sessions</th>
                      <th className="p-4 text-right border-b border-line">Engaged Sessions</th>
                      <th className="p-4 text-right border-b border-line">Engagement Rate</th>
                      <th className="p-4 text-right border-b border-line">Avg. Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ga4TrafficData.slice(0, 25).map((row, i) => (
                      <tr key={`${row.sourceMedium}-${i}`} className="border-b border-line hover:bg-raised transition-colors last:border-0">
                        <td className="p-4 font-medium text-foreground whitespace-nowrap">{row.sourceMedium}</td>
                        <td className="p-4 text-muted break-all min-w-[150px]">{row.pagePath || '—'}</td>
                        <td className="p-4 text-right tabular-nums text-foreground">{row.sessions.toLocaleString('de-DE')}</td>
                        <td className="p-4 text-right tabular-nums text-foreground">{row.engagedSessions.toLocaleString('de-DE')}</td>
                        <td className="p-4 text-right tabular-nums text-foreground">{formatEngagementRate(row.engagementRate)}</td>
                        <td className="p-4 text-right tabular-nums text-foreground">{row.avgEngagementTime || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Ga4LandingAnalysis rows={ga4TrafficData} />
            </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              
              {/* Marketing Comment Block */}
              <div className="bg-surface  border border-line  p-6 rounded-panel print:shadow-none print:border print:rounded-none">
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="comment-marketing" className="block text-lg font-medium text-foreground">
                    Performance Review - Marketing
                  </label>
                  {!isEditingMarketing && (
                    <button
                      type="button"
                      onClick={() => setIsEditingMarketing(true)}
                      className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface hover:bg-raised  px-3 py-1.5 text-xs font-medium text-muted  transition-colors print:hidden"
                    >
                      <Pencil size={14} /> Bearbeiten
                    </button>
                  )}
                </div>

                {isEditingMarketing && <div className="hidden whitespace-pre-wrap break-words print:block">{commentMarketing}</div>}
                {isEditingMarketing ? (
                  <div className="space-y-3 print:hidden">
                    <textarea
                      id="comment-marketing"
                      value={commentMarketing}
                      onChange={(e) => setCommentMarketing(e.target.value)}
                      placeholder="Marketing notes for this report…"
                      className="w-full min-h-40 rounded-control border border-line bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:bg-raised  transition-colors print:border-slate-300 placeholder:text-muted "
                    />
                    <div className="flex justify-end print:hidden">
                      <button
                        type="button"
                        onClick={() => setIsEditingMarketing(false)}
                        className="rounded-control bg-surface hover:bg-raised  border border-line px-4 py-2 text-sm font-medium text-foreground  transition-colors "
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full min-h-40 rounded-control border border-line bg-surface px-4 py-3 text-sm text-foreground  whitespace-pre-wrap break-words print:border-slate-300 print:bg-white print:text-slate-900 print:shadow-none">
                    {commentMarketing || <span className="text-muted italic">Keine Notizen vorhanden.</span>}
                  </div>
                )}
              </div>

              {/* Sales Comment Block */}
              <div className="bg-surface  border border-line  p-6 rounded-panel print:shadow-none print:border print:rounded-none">
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="comment-sales" className="block text-lg font-medium text-foreground">
                    Feedback - Sales
                  </label>
                  {!isEditingSales && (
                    <button
                      type="button"
                      onClick={() => setIsEditingSales(true)}
                      className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface hover:bg-raised  px-3 py-1.5 text-xs font-medium text-muted  transition-colors print:hidden"
                    >
                      <Pencil size={14} /> Bearbeiten
                    </button>
                  )}
                </div>

                {isEditingSales && <div className="hidden whitespace-pre-wrap break-words print:block">{commentSales}</div>}
                {isEditingSales ? (
                  <div className="space-y-3 print:hidden">
                    <textarea
                      id="comment-sales"
                      value={commentSales}
                      onChange={(e) => setCommentSales(e.target.value)}
                      placeholder="Sales notes for this report…"
                      className="w-full min-h-40 rounded-control border border-line bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:bg-raised  transition-colors print:border-slate-300 placeholder:text-muted "
                    />
                    <div className="flex justify-end print:hidden">
                      <button
                        type="button"
                        onClick={() => setIsEditingSales(false)}
                        className="rounded-control bg-surface hover:bg-raised  border border-line px-4 py-2 text-sm font-medium text-foreground  transition-colors "
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full min-h-40 rounded-control border border-line bg-surface px-4 py-3 text-sm text-foreground  whitespace-pre-wrap break-words print:border-slate-300 print:bg-white print:text-slate-900 print:shadow-none">
                    {commentSales || <span className="text-muted italic">Keine Notizen vorhanden.</span>}
                  </div>
                )}
              </div>
              {/* Meeting Notes Block */}
              <div className="bg-surface  border border-line  p-6 rounded-panel print:shadow-none print:border print:rounded-none">
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="meeting-notes" className="block text-lg font-medium text-foreground">
                    Campaign Planning Meeting – Decisions &amp; To-Dos
                  </label>
                  {!isEditingMeeting && (
                    <button
                      type="button"
                      onClick={() => setIsEditingMeeting(true)}
                      className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface hover:bg-raised  px-3 py-1.5 text-xs font-medium text-muted  transition-colors print:hidden"
                    >
                      <Pencil size={14} /> Bearbeiten
                    </button>
                  )}
                </div>

                {isEditingMeeting && <div className="hidden whitespace-pre-wrap break-words print:block">{meetingNotes}</div>}
                {isEditingMeeting ? (
                  <div className="space-y-3 print:hidden">
                    <textarea
                      id="meeting-notes"
                      value={meetingNotes}
                      onChange={(e) => setMeetingNotes(e.target.value)}
                      placeholder="Meeting decisions, owners and next steps…"
                      className="w-full min-h-40 rounded-control border border-line bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:bg-raised  transition-colors print:border-slate-300 placeholder:text-muted "
                    />
                    <div className="flex justify-end print:hidden">
                      <button
                        type="button"
                        onClick={() => setIsEditingMeeting(false)}
                        className="rounded-control bg-surface hover:bg-raised  border border-line px-4 py-2 text-sm font-medium text-foreground  transition-colors "
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full min-h-40 rounded-control border border-line bg-surface px-4 py-3 text-sm text-foreground  whitespace-pre-wrap break-words print:border-slate-300 print:bg-white print:text-slate-900 print:shadow-none">
                    {meetingNotes || <span className="text-muted italic">Keine Notizen vorhanden.</span>}
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div className="bg-surface  border border-line  p-12 rounded-panel text-center text-muted space-y-3 print:hidden">
            <RefreshCw size={40} className="mx-auto opacity-50 animate-spin-slow text-muted" />
            <p className="font-medium text-foreground text-lg">Waiting for CSV upload</p>
            <p className="text-sm text-muted">Supports raw CSV exports from Google Ads, LinkedIn Ads, and GA4</p>
          </div>
        )}

      </div>
    </div>
  );
}