import { useEffect, useState } from 'react';

export interface PublicConfig {
  java: boolean;
  mode: 'direct' | 'proxy';
  judge0Url?: string;
  javaLanguageId: number;
  accessCodeRequired: boolean;
  engine: string;
}

/** Gdy aplikacja stoi na czysto statycznym hostingu (brak /api) – Judge0 wołany wprost z przeglądarki. */
export const STATIC_FALLBACK: PublicConfig = {
  java: true,
  mode: 'direct',
  judge0Url: 'https://ce.judge0.com',
  javaLanguageId: 62,
  accessCodeRequired: false,
  engine: 'ce.judge0.com',
};

let cached: Promise<PublicConfig | null> | null = null;

export function loadConfig(): Promise<PublicConfig | null> {
  cached ??= fetch('/api/config')
    .then((r) => (r.ok && r.headers.get('content-type')?.includes('json') ? (r.json() as Promise<PublicConfig>) : null))
    .catch(() => null);
  return cached;
}

/** undefined = ładowanie, null = brak backendu (statyczny hosting → STATIC_FALLBACK). */
export function useConfig() {
  const [config, setConfig] = useState<PublicConfig | null | undefined>(undefined);
  useEffect(() => {
    loadConfig().then(setConfig);
  }, []);
  return config;
}
