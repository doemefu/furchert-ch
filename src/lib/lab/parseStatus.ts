// Client-safe helpers for the live status block: strict parsing of the
// `/api/homelab-status` response and the one-line summary. Anything that does
// not look right becomes "unknown"; the page never shows an error text.
import { LAB_SERVICE_IDS, type LabServiceId } from '@/data/homelab-lab';

export type LiveStatus = 'up' | 'down' | 'unknown';
export interface LiveRow {
  status: LiveStatus;
  uptime: number | null;
}
export type LabSummary = 'allUp' | 'someDown' | 'unknown';

const STATUSES: readonly string[] = ['up', 'down', 'unknown'];

export function parseLabStatus(json: unknown): Map<LabServiceId, LiveRow> {
  const rows = new Map<LabServiceId, LiveRow>();
  if (typeof json !== 'object' || json === null) return rows;
  const services = (json as { services?: unknown }).services;
  if (!Array.isArray(services)) return rows;
  for (const item of services) {
    if (typeof item !== 'object' || item === null) continue;
    const { id, status, uptime } = item as { id?: unknown; status?: unknown; uptime?: unknown };
    if (typeof id !== 'string' || !(LAB_SERVICE_IDS as readonly string[]).includes(id)) continue;
    rows.set(id as LabServiceId, {
      status: typeof status === 'string' && STATUSES.includes(status) ? (status as LiveStatus) : 'unknown',
      uptime: typeof uptime === 'number' && Number.isFinite(uptime) && uptime >= 0 && uptime <= 100 ? uptime : null,
    });
  }
  return rows;
}

export function summarize(rows: ReadonlyMap<LabServiceId, LiveRow>): LabSummary {
  const statuses = LAB_SERVICE_IDS.map((id) => rows.get(id)?.status ?? 'unknown');
  if (statuses.includes('down')) return 'someDown';
  if (statuses.every((s) => s === 'up')) return 'allUp';
  return 'unknown';
}
