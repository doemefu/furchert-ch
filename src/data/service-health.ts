// Scope of the ADMIN-only service-health page (issue #47). The namespaces are
// joined into the PromQL namespace matcher in `lib/metrics/services.ts`; the
// exclude list is applied in TS by `buildServiceHealthReport`, so the query
// strings stay static.
export const SERVICE_HEALTH_NAMESPACES = ['apps', 'homeassistant'] as const;

// Workloads that are not user-facing services (D3). Exact match on namespace + name; no globs, no regex.
export const SERVICE_HEALTH_EXCLUDE: ReadonlyArray<{ namespace: string; name: string }> = [
  { namespace: 'apps', name: 'mosquitto-exporter' },
];
