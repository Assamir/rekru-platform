/**
 * Format pliku zadania (jeden plik .md = jedno zadanie):
 *
 * ---
 * title: Koszyk – testy jednostkowe
 * language: java            # java | typescript
 * duration: 45              # minuty (opcjonalnie)
 * level: mid                # opcjonalnie, dowolny tekst
 * author: Zespół QA         # opcjonalnie
 * ---
 *
 * Opis zadania w Markdown...
 *
 * ```java file=Cart.java readonly
 * ...kod widoczny, tylko do odczytu...
 * ```
 *
 * ```java file=CartTest.java
 * ...kod edytowalny przez kandydata...
 * ```
 *
 * Bloki kodu z atrybutem `file=` stają się plikami w edytorze.
 * Flagi: `readonly` (tylko do odczytu), `hidden` (niewidoczny, ale uruchamiany).
 * Można dołączyć pliki budowania: build.gradle / pom.xml (Java), package.json /
 * tsconfig.json (TypeScript) oraz pliki z danymi (.json, .csv, .txt…).
 * Pozostałe bloki kodu zostają w opisie.
 */

export type Language = 'java' | 'typescript';

export interface TaskFile {
  path: string;
  content: string;
  readonly: boolean;
  hidden: boolean;
}

export interface Task {
  title: string;
  language: Language;
  durationMin?: number;
  level?: string;
  author?: string;
  meta: Record<string, string>;
  description: string;
  files: TaskFile[];
}

export class TaskParseError extends Error {}

const LANGUAGE_ALIASES: Record<string, Language> = {
  java: 'java',
  typescript: 'typescript',
  ts: 'typescript',
};

function parseFrontmatter(src: string): { meta: Record<string, string>; body: string } {
  const normalized = src.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const m = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(normalized);
  if (!m) return { meta: {}, body: normalized };
  const meta: Record<string, string> = {};
  for (const rawLine of m[1].split('\n')) {
    const line = rawLine.replace(/\s+#.*$/, '').trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    let value = line.slice(idx + 1).trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    meta[key] = value;
  }
  return { meta, body: normalized.slice(m[0].length) };
}

interface FenceInfo {
  lang: string;
  attrs: Record<string, string | true>;
}

function parseFenceInfo(info: string): FenceInfo {
  const tokens = info.trim().match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const attrs: Record<string, string | true> = {};
  let lang = '';
  tokens.forEach((tok, i) => {
    const eq = tok.indexOf('=');
    if (eq > 0) {
      attrs[tok.slice(0, eq).toLowerCase()] = tok.slice(eq + 1).replace(/^"|"$/g, '');
    } else if (i === 0) {
      lang = tok.toLowerCase();
    } else {
      attrs[tok.toLowerCase()] = true;
    }
  });
  return { lang, attrs };
}

function guessLanguage(files: TaskFile[]): Language | undefined {
  if (files.some((f) => /\.java$|(^|\/)(build\.gradle(\.kts)?|pom\.xml)$/.test(f.path))) return 'java';
  if (files.some((f) => /\.(ts|tsx)$|(^|\/)(package|tsconfig)\.json$/.test(f.path))) return 'typescript';
  return undefined;
}

export function parseTask(src: string, fileName = 'zadanie.md'): Task {
  const { meta, body } = parseFrontmatter(src);
  const lines = body.split('\n');
  const descLines: string[] = [];
  const files: TaskFile[] = [];

  let i = 0;
  while (i < lines.length) {
    const open = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(lines[i]);
    if (!open) {
      descLines.push(lines[i]);
      i++;
      continue;
    }
    const fence = open[1];
    const fenceChar = fence[0];
    const closeRe = new RegExp(`^ {0,3}\\${fenceChar}{${fence.length},}\\s*$`);
    const content: string[] = [];
    let j = i + 1;
    while (j < lines.length && !closeRe.test(lines[j])) {
      content.push(lines[j]);
      j++;
    }
    const info = parseFenceInfo(open[2]);
    const file = info.attrs['file'];
    if (typeof file === 'string' && file.length > 0) {
      const path = file.replace(/^\.?\//, '');
      if (files.some((f) => f.path === path)) {
        throw new TaskParseError(`Plik „${path}” jest zdefiniowany więcej niż raz.`);
      }
      files.push({
        path,
        content: content.join('\n') + '\n',
        readonly: info.attrs['readonly'] === true,
        hidden: info.attrs['hidden'] === true,
      });
    } else {
      descLines.push(...lines.slice(i, Math.min(j + 1, lines.length)));
    }
    i = j + 1;
  }

  const description = descLines.join('\n').trim();
  const titleFromHeading = /^#\s+(.+)$/m.exec(description)?.[1];
  const title = meta['title'] || titleFromHeading || fileName.replace(/\.[^.]+$/, '');

  const langRaw = (meta['language'] || meta['lang'] || '').toLowerCase();
  const language = LANGUAGE_ALIASES[langRaw] ?? guessLanguage(files);
  if (!language) {
    throw new TaskParseError(
      'Nie rozpoznano języka zadania. Dodaj w nagłówku „language: java” albo „language: typescript”.',
    );
  }
  if (files.length === 0) {
    throw new TaskParseError(
      'Zadanie nie zawiera żadnego pliku z kodem. Dodaj blok kodu z atrybutem file=…, np. ```java file=Main.java',
    );
  }
  const wrong = files.find((f) => fileRole(language, f.path) === 'invalid');
  if (wrong) {
    throw new TaskParseError(
      `Plik „${wrong.path}” nie pasuje do języka zadania (${language}). ` +
        (language === 'java'
          ? 'Dozwolone: .java oraz pliki konfiguracyjne (build.gradle, pom.xml, .properties, .xml, .json, .csv, .txt, .md).'
          : 'Dozwolone: .ts/.tsx oraz pliki konfiguracyjne (package.json, tsconfig.json, .json, .csv, .txt, .md).'),
    );
  }
  if (!files.some((f) => fileRole(language, f.path) === 'code')) {
    throw new TaskParseError(`Zadanie nie zawiera żadnego pliku z kodem (${language === 'java' ? '.java' : '.ts'}).`);
  }
  if (files.every((f) => f.hidden)) {
    throw new TaskParseError('Wszystkie pliki są ukryte – kandydat nie miałby czego edytować.');
  }

  const duration = meta['duration'] ? parseInt(meta['duration'], 10) : NaN;

  return {
    title,
    language,
    durationMin: Number.isFinite(duration) && duration > 0 ? duration : undefined,
    level: meta['level'],
    author: meta['author'],
    meta,
    description,
    files,
  };
}

export type FileRole = 'code' | 'config' | 'data' | 'invalid';

const DATA_EXT = /\.(json|csv|txt|md|ya?ml|properties|xml|env)$/i;

/** code = kompilowany; config = plik budowania (gradle/pom/package.json/tsconfig); data = pozostałe. */
export function fileRole(language: Language, path: string): FileRole {
  const name = path.split('/').pop() ?? path;
  if (language === 'java') {
    if (/\.java$/.test(name)) return 'code';
    if (/^(build|settings)\.gradle(\.kts)?$|^gradle\.properties$|^pom\.xml$/.test(name)) return 'config';
    if (DATA_EXT.test(name)) return 'data';
    return 'invalid';
  }
  if (/\.(ts|tsx)$/.test(name)) return 'code';
  if (/^(package|tsconfig)\.json$/.test(name)) return 'config';
  if (DATA_EXT.test(name)) return 'data';
  return 'invalid';
}

export function isTestFile(task: Pick<Task, 'language'>, file: Pick<TaskFile, 'path' | 'content'>): boolean {
  if (fileRole(task.language, file.path) !== 'code') return false;
  if (task.language === 'typescript') return /\.(test|spec)\.tsx?$/.test(file.path);
  return /@(Test|ParameterizedTest|RepeatedTest)\b/.test(file.content);
}

function fenceLang(path: string): string {
  if (path.endsWith('.java')) return 'java';
  if (/\.tsx?$/.test(path)) return 'typescript';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.kts')) return 'kotlin';
  if (path.endsWith('.gradle')) return 'groovy';
  if (path.endsWith('.xml')) return 'xml';
  if (/\.ya?ml$/.test(path)) return 'yaml';
  return 'text';
}

/** Zapisuje zadanie (np. z rozwiązaniem kandydata) z powrotem do formatu .md. */
export function serializeTask(task: Task, files: TaskFile[], extraMeta: Record<string, string> = {}): string {
  const meta = { ...task.meta, title: task.title, language: task.language, ...extraMeta };
  const front = Object.entries(meta)
    .map(([k, v]) => `${k}: ${/[:#]/.test(v) ? JSON.stringify(v) : v}`)
    .join('\n');
  const blocks = files.map((f) => {
    const longest = Math.max(2, ...(f.content.match(/`+/g) ?? []).map((m) => m.length));
    const fence = '`'.repeat(longest + 1);
    const flags = [f.readonly ? 'readonly' : '', f.hidden ? 'hidden' : ''].filter(Boolean).join(' ');
    const body = f.content.endsWith('\n') ? f.content : f.content + '\n';
    return `${fence}${fenceLang(f.path)} file=${f.path}${flags ? ' ' + flags : ''}\n${body}${fence}`;
  });
  return `---\n${front}\n---\n\n${task.description}\n\n${blocks.join('\n\n')}\n`;
}
