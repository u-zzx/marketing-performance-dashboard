'use client';

import { useMemo, useState } from 'react';
import { aggregateLandingTraffic } from '@/lib/ga4';

const format = value => value.toLocaleString('de-DE');
const share = (value, total) => `${(total > 0 ? value / total * 100 : 0).toFixed(1)}%`;
const color = index => index < 8 ? `var(--chart-${index + 1})` : `hsl(${(260 + index * 137.508) % 360} 48% 67%)`;

function BarRow({ label, total, max, segments, colors, urls }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="chart-row relative grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_4rem] items-center gap-3 text-sm print:break-inside-avoid">
      <span className="truncate font-medium text-foreground" title={urls?.join('\n') || label}>{label}</span>
      <svg viewBox="0 0 600 32" preserveAspectRatio="none" className="h-8 w-full overflow-visible" role="group" aria-label={`${label}: ${format(total)} sessions`}>
        {segments.map((segment, index) => {
          const x = segments.slice(0, index).reduce((sum, previous) => sum + previous.sessions, 0) / max * 600;
          const width = segment.sessions / max * 600;
          const description = `${urls ? `Landing Page: ${label}\nOriginal URLs: ${urls.join(', ')}\n` : ''}Channel: ${segment.channel}\nSessions: ${format(segment.sessions)}\n${urls ? 'Share of Landing Page Traffic' : 'Share of Total Sessions'}: ${share(segment.sessions, segment.denominator)}`;
          return (
            <rect key={segment.channel} x={x} y="2" width={width} height="28" fill={colors.get(segment.channel)}
              tabIndex={0} role="img" aria-label={description} className="outline-offset-2 focus:outline-2 focus:outline-accent"
              onMouseEnter={() => setHovered(description)} onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(description)} onBlur={() => setHovered(null)}>
              <title>{description}</title>
            </rect>
          );
        })}
      </svg>
      <span className="text-right tabular-nums text-muted">{format(total)}</span>
      {hovered && <div role="tooltip" className="pointer-events-none absolute left-0 right-0 top-full z-20 rounded-control bg-raised p-3 text-xs text-foreground  whitespace-pre-wrap break-words print:hidden">{hovered}</div>}
    </div>
  );
}

function Axis({ max }) {
  return (
    <div className="chart-axis grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_4rem] gap-3 text-xs text-muted" aria-hidden="true">
      <span />
      <div className="border-t border-line pt-2">
        <div className="flex justify-between"><span>0</span><span>{format(Math.round(max / 2))}</span><span>{format(max)}</span></div>
        <p className="mt-1 text-center">Sessions</p>
      </div>
    </div>
  );
}

export default function Ga4LandingAnalysis({ rows }) {
  const [filter, setFilter] = useState('');
  const data = useMemo(() => aggregateLandingTraffic(rows, filter), [rows, filter]);
  const colors = new Map(data.channels.map((channel, index) => [channel, color(index)]));
  const total = data.sources.reduce((sum, row) => sum + row.sessions, 0);
  const sourceMax = Math.max(1, ...data.sources.map(row => row.sessions));
  const pageMax = Math.max(1, ...data.topPages.map(row => row.total));
  const card = 'rounded-control border border-line bg-surface p-4 sm:p-5 print:border-slate-200 print:bg-white print:break-inside-avoid';

  return (
    <section className="mt-6 space-y-5 border-t border-line pt-6" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} aria-labelledby="landing-analysis-title">
      <h3 id="landing-analysis-title" className="text-lg font-medium text-foreground">Landing Page Analysis</h3>
      {!data.channels.length ? (
        <p className="rounded-control border border-line bg-surface p-4 text-sm text-muted">
          Upload a GA4 CSV containing Landingpage + Abfragestring, Sitzung – primäre Channelgruppe (Standard-Channelgruppe), and Sitzungen to see landing page charts. Your existing traffic table remains available above.
        </p>
      ) : (
        <>
          <div>
            <label htmlFor="landing-page-filter" className="mb-2 block text-sm font-medium text-foreground">Landing Page Filter</label>
            <input id="landing-page-filter" type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Search landing page..."
              className="w-full rounded-control border border-line bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:bg-raised print:hidden" />
            <p className="mt-2 text-xs text-muted print:hidden">Matches any part of the landing page, ignoring case. Only Top 5 Landing Pages by Sessions is filtered.</p>
            <p className="hidden text-sm print:block">{filter || 'All landing pages'}</p>
          </div>
          <div className={card}>
            <h4 className="mb-1 font-medium text-foreground">All Traffics (Source / Channel)</h4>
            <p className="mb-4 text-xs text-muted">{format(total)} sessions · All Source / Channel</p>
            <div className="space-y-3">
                {data.sources.map(row => <BarRow key={row.channel} label={row.channel} total={row.sessions} max={sourceMax} colors={colors} segments={[{ ...row, denominator: total }]} />)}
                <Axis max={sourceMax} />
            </div>
          </div>
          <div className={card}>
            <h4 className="mb-1 font-medium text-foreground">Top 5 Landing Pages by Sessions</h4>
            <p className="mb-4 text-xs text-muted">{filter ? `Matching “${filter}”` : 'Complete uploaded dataset'} · query strings grouped by landing page path</p>
            {data.matches === 0 ? <p role="status" className="py-8 text-center text-sm text-muted">{filter ? 'No landing pages match this filter.' : 'Upload a CSV with landing page and channel fields to see the Top 5.'}</p> : <div className="space-y-3">
              {data.topPages.map(page => <BarRow key={page.path} label={page.path} total={page.total} max={pageMax} colors={colors} urls={[...page.urls]}
                segments={data.channels.filter(channel => page.channels.has(channel)).map(channel => ({ channel, sessions: page.channels.get(channel), denominator: page.total }))} />)}
              <Axis max={pageMax} />
            </div>}
            <ul aria-label="Traffic channel legend" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
              {data.channels.map(channel => <li key={channel} className="flex items-center gap-2"><svg width="12" height="12" aria-hidden="true"><rect width="12" height="12" rx="2" fill={colors.get(channel)} /></svg>{channel}</li>)}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
