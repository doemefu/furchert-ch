import { describe, expect, it } from 'vitest';
import de from '@/i18n/messages/de.json';
import en from '@/i18n/messages/en.json';
import { LAB_SERVICES, LAB_SERVICE_IDS, LAB_SHOWCASE } from './homelab-lab';

// Guard for the public homelab block: nothing an attacker could use may slip
// into the copy (versions, IPs, ports, internal hostnames, node names,
// internal services), and DE/EN stay in step.
const texts = [
  ...Object.values(de.pages.lab),
  ...Object.values(en.pages.lab),
  ...Object.values(LAB_SERVICES).flatMap((l) => [l.de.label, l.de.desc, l.en.label, l.en.desc]),
  ...LAB_SHOWCASE.flatMap((i) => [i.i18n.de.title, i.i18n.de.text, i.i18n.en.title, i.i18n.en.text]),
];

// Public GitHub repositories (visibility checked 2026-11-03).
const PUBLIC_REPOS = new Set([
  'homelab',
  'homelab-auth-service',
  'homelab-device-service',
  'homelab-data-service',
  'furchert-ch',
  'Terra1',
]);

describe('homelab public copy', () => {
  it('has the same message keys in DE and EN', () => {
    expect(Object.keys(en.pages.lab).sort()).toEqual(Object.keys(de.pages.lab).sort());
  });

  it('contains no versions, IPs, ports, hostnames or node names', () => {
    for (const text of texts) {
      expect(text).not.toMatch(/\b\d+\.\d+\.\d+(\.\d+)?\b/); // versions and IPv4
      expect(text).not.toMatch(/:\d{2,5}\b/); // ports
      expect(text).not.toMatch(/\b[a-z0-9-]+\.(furchert\.ch|svc|local|internal|cluster)\b/i);
      expect(text).not.toMatch(/\b(raspi|mba)[0-9]\b|\bv\d+\.\d+/i);
      expect(text).not.toMatch(/https?:\/\//);
    }
  });

  it('does not name internal services or third-party products in the status rows', () => {
    for (const id of LAB_SERVICE_IDS) {
      for (const l of ['de', 'en'] as const) {
        const row = `${LAB_SERVICES[id][l].label} ${LAB_SERVICES[id][l].desc}`;
        expect(row).not.toMatch(/n8n|grafana|prometheus|open ?webui|litellm|flux|longhorn|postgres|influx|mosquitto|data-service/i);
      }
    }
  });

  it('links only to public repositories of the owner', () => {
    for (const item of LAB_SHOWCASE) {
      for (const repo of item.repos) {
        const m = /^https:\/\/github\.com\/doemefu\/([A-Za-z0-9._-]+)$/.exec(repo.href);
        expect(m, repo.href).not.toBeNull();
        expect(PUBLIC_REPOS.has(m![1]), repo.href).toBe(true);
      }
    }
  });

  it('lists exactly the public service ids, each with both locales', () => {
    expect(Object.keys(LAB_SERVICES).sort()).toEqual([...LAB_SERVICE_IDS].sort());
    for (const id of LAB_SERVICE_IDS) {
      expect(LAB_SERVICES[id].de.label).not.toBe('');
      expect(LAB_SERVICES[id].en.label).not.toBe('');
    }
  });
});
