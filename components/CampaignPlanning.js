'use client';

import { useEffect, useState } from 'react';
import { CalendarRange, Pencil, Trash2 } from 'lucide-react';
import {
  createCampaignId,
  formatBudget,
  loadPlanningState,
  parseBudgetInput,
  savePlanningState,
} from '@/lib/campaignPlanning';

const EMPTY_CURRENT_FORM = { name: '', laufzeit: '', budget: '' };
const EMPTY_PLANNED_FORM = { name: '', plannedStart: '', budget: '' };

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
    />
  );
}

function CampaignForm({ kind, values, onChange, onSubmit, onCancel, submitLabel }) {
  const isCurrent = kind === 'current';

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      <div className={`grid gap-3 ${isCurrent ? 'sm:grid-cols-3' : 'sm:grid-cols-3'}`}>
        <Field label="Kampagne">
          <TextInput
            value={values.name}
            onChange={(event) => onChange({ ...values, name: event.target.value })}
            placeholder="Kampagnenname"
            required
          />
        </Field>
        {isCurrent ? (
          <Field label="Laufzeit">
            <TextInput
              value={values.laufzeit}
              onChange={(event) => onChange({ ...values, laufzeit: event.target.value })}
              placeholder="01.09.2026 – 30.09.2026"
              required
            />
          </Field>
        ) : (
          <Field label="Geplanter Start">
            <TextInput
              value={values.plannedStart}
              onChange={(event) => onChange({ ...values, plannedStart: event.target.value })}
              placeholder="01.10.2026"
              required
            />
          </Field>
        )}
        <Field label={isCurrent ? 'Monthly Budget' : 'Budget'}>
          <TextInput
            value={values.budget}
            onChange={(event) => onChange({ ...values, budget: event.target.value })}
            placeholder="2500"
            inputMode="decimal"
            required
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function PlanningTable({ columns, rows, emptyLabel, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`p-3 font-medium ${column.align === 'right' ? 'text-right' : ''}`}
              >
                {column.label}
              </th>
            ))}
            <th className="p-3 text-right font-medium print:hidden">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="p-6 text-center text-slate-400">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`p-3 ${column.align === 'right' ? 'text-right tabular-nums' : ''} ${
                      column.key === 'name' ? 'font-medium text-slate-800' : 'text-slate-700'
                    }`}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
                <td className="p-3 print:hidden">
                  <div className="flex justify-end gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil size={12} />
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={12} />
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function CampaignPlanning() {
  const [hydrated, setHydrated] = useState(false);
  const [current, setCurrent] = useState([]);
  const [planned, setPlanned] = useState([]);
  const [formError, setFormError] = useState('');

  const [currentMode, setCurrentMode] = useState(null);
  const [plannedMode, setPlannedMode] = useState(null);
  const [currentForm, setCurrentForm] = useState(EMPTY_CURRENT_FORM);
  const [plannedForm, setPlannedForm] = useState(EMPTY_PLANNED_FORM);

  useEffect(() => {
    const stored = loadPlanningState();
    setCurrent(stored.current);
    setPlanned(stored.planned);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePlanningState({ current, planned });
  }, [hydrated, current, planned]);

  const resetCurrentForm = () => {
    setCurrentMode(null);
    setCurrentForm(EMPTY_CURRENT_FORM);
    setFormError('');
  };

  const resetPlannedForm = () => {
    setPlannedMode(null);
    setPlannedForm(EMPTY_PLANNED_FORM);
    setFormError('');
  };

  const submitCurrent = () => {
    const name = currentForm.name.trim();
    const laufzeit = currentForm.laufzeit.trim();
    const budget = parseBudgetInput(currentForm.budget);

    if (!name || !laufzeit || budget == null) {
      setFormError('Bitte Kampagne, Laufzeit und ein gültiges Budget eingeben.');
      return;
    }

    if (currentMode?.type === 'edit') {
      setCurrent((rows) =>
        rows.map((row) =>
          row.id === currentMode.id ? { ...row, name, laufzeit, budget } : row
        )
      );
    } else {
      setCurrent((rows) => [...rows, { id: createCampaignId('current'), name, laufzeit, budget }]);
    }

    resetCurrentForm();
  };

  const submitPlanned = () => {
    const name = plannedForm.name.trim();
    const plannedStart = plannedForm.plannedStart.trim();
    const budget = parseBudgetInput(plannedForm.budget);

    if (!name || !plannedStart || budget == null) {
      setFormError('Bitte Kampagne, geplanten Start und ein gültiges Budget eingeben.');
      return;
    }

    if (plannedMode?.type === 'edit') {
      setPlanned((rows) =>
        rows.map((row) =>
          row.id === plannedMode.id ? { ...row, name, plannedStart, budget } : row
        )
      );
    } else {
      setPlanned((rows) => [
        ...rows,
        { id: createCampaignId('planned'), name, plannedStart, budget },
      ]);
    }

    resetPlannedForm();
  };

  const deleteCurrent = (row) => {
    if (!window.confirm(`„${row.name}“ wirklich löschen?`)) return;
    setCurrent((rows) => rows.filter((item) => item.id !== row.id));
    if (currentMode?.id === row.id) resetCurrentForm();
  };

  const deletePlanned = (row) => {
    if (!window.confirm(`„${row.name}“ wirklich löschen?`)) return;
    setPlanned((rows) => rows.filter((item) => item.id !== row.id));
    if (plannedMode?.id === row.id) resetPlannedForm();
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Campaign Planning</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manuell gepflegte Kampagnenplanung — unabhängig von hochgeladenen Performance-Daten.
        </p>
      </div>

      {formError && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
          {formError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <CalendarRange className="text-emerald-500" size={20} />
                Current Campaigns
              </h3>
              <p className="mt-1 text-xs text-slate-500">Laufende Kampagnen mit Budget und Laufzeit.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetPlannedForm();
                setFormError('');
                setCurrentMode({ type: 'add' });
                setCurrentForm(EMPTY_CURRENT_FORM);
              }}
              className="inline-flex shrink-0 items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 print:hidden"
            >
              + Kampagne hinzufügen
            </button>
          </div>

          <PlanningTable
            columns={[
              { key: 'name', label: 'Kampagne' },
              { key: 'laufzeit', label: 'Laufzeit' },
              { key: 'budget', label: 'Monthly Budget', align: 'right', render: (row) => formatBudget(row.budget) },
            ]}
            rows={current}
            emptyLabel="Keine aktuellen Kampagnen"
            onEdit={(row) => {
              resetPlannedForm();
              setFormError('');
              setCurrentMode({ type: 'edit', id: row.id });
              setCurrentForm({
                name: row.name,
                laufzeit: row.laufzeit,
                budget: String(row.budget),
              });
            }}
            onDelete={deleteCurrent}
          />

          {currentMode && (
            <CampaignForm
              kind="current"
              values={currentForm}
              onChange={setCurrentForm}
              onSubmit={submitCurrent}
              onCancel={resetCurrentForm}
              submitLabel={currentMode.type === 'edit' ? 'Änderungen speichern' : 'Kampagne speichern'}
            />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <CalendarRange className="text-purple-500" size={20} />
                Planned Campaigns
              </h3>
              <p className="mt-1 text-xs text-slate-500">Geplante Kampagnen mit Starttermin und Budget.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetCurrentForm();
                setFormError('');
                setPlannedMode({ type: 'add' });
                setPlannedForm(EMPTY_PLANNED_FORM);
              }}
              className="inline-flex shrink-0 items-center rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 print:hidden"
            >
              + Kampagne hinzufügen
            </button>
          </div>

          <PlanningTable
            columns={[
              { key: 'name', label: 'Kampagne' },
              { key: 'plannedStart', label: 'Geplanter Start' },
              { key: 'budget', label: 'Budget', align: 'right', render: (row) => formatBudget(row.budget) },
            ]}
            rows={planned}
            emptyLabel="Keine geplanten Kampagnen"
            onEdit={(row) => {
              resetCurrentForm();
              setFormError('');
              setPlannedMode({ type: 'edit', id: row.id });
              setPlannedForm({
                name: row.name,
                plannedStart: row.plannedStart,
                budget: String(row.budget),
              });
            }}
            onDelete={deletePlanned}
          />

          {plannedMode && (
            <CampaignForm
              kind="planned"
              values={plannedForm}
              onChange={setPlannedForm}
              onSubmit={submitPlanned}
              onCancel={resetPlannedForm}
              submitLabel={plannedMode.type === 'edit' ? 'Änderungen speichern' : 'Kampagne speichern'}
            />
          )}
        </div>
      </div>
    </section>
  );
}
