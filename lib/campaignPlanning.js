export const PLANNING_STORAGE_KEY = 'campaign-planning:v1';

export const DEFAULT_CURRENT_CAMPAIGNS = [
  {
    id: 'current-lieferanten',
    name: 'Lieferanten',
    laufzeit: '01.09.2026 – 30.09.2026',
    budget: 2500,
  },
  {
    id: 'current-sap-iuser',
    name: 'SAP IUser',
    laufzeit: '01.09.2026 – 31.10.2026',
    budget: 2500,
  },
];

export const DEFAULT_PLANNED_CAMPAIGNS = [
  {
    id: 'planned-ms-dynamics',
    name: 'Microsoft Dynamics Migration',
    plannedStart: '01.10.2026',
    budget: 2000,
  },
  {
    id: 'planned-erechnung',
    name: 'E-Rechnung Q4',
    plannedStart: '15.10.2026',
    budget: 3500,
  },
];

export const EMPTY_PLANNING_STATE = {
  current: DEFAULT_CURRENT_CAMPAIGNS,
  planned: DEFAULT_PLANNED_CAMPAIGNS,
};

export function createCampaignId(kind) {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseBudgetInput(value) {
  if (value === '' || value == null) return null;
  const cleaned = String(value).trim().replace(/\s/g, '').replace(/€/g, '');
  if (!cleaned) return null;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized = cleaned;

  if (hasComma && hasDot) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalized = cleaned.replace(',', '.');
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, '');
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export function formatBudget(amount) {
  const formatted = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
  return `€${formatted}`;
}

function isCurrentCampaign(item) {
  return (
    item &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.laufzeit === 'string' &&
    typeof item.budget === 'number'
  );
}

function isPlannedCampaign(item) {
  return (
    item &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.plannedStart === 'string' &&
    typeof item.budget === 'number'
  );
}

export function loadPlanningState() {
  if (typeof window === 'undefined') {
    return EMPTY_PLANNING_STATE;
  }

  try {
    const raw = window.localStorage.getItem(PLANNING_STORAGE_KEY);
    if (!raw) return EMPTY_PLANNING_STATE;

    const parsed = JSON.parse(raw);
    const current = Array.isArray(parsed?.current)
      ? parsed.current.filter(isCurrentCampaign)
      : EMPTY_PLANNING_STATE.current;
    const planned = Array.isArray(parsed?.planned)
      ? parsed.planned.filter(isPlannedCampaign)
      : EMPTY_PLANNING_STATE.planned;

    return { current, planned };
  } catch {
    return EMPTY_PLANNING_STATE;
  }
}

export function savePlanningState(state) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(state));
}
