/**
 * Pakowanie projektu z ideProject.ts do ZIP-a i pobranie go w przeglądarce.
 */
import { strToU8, zipSync, type Zippable } from 'fflate';
import { buildIdeProject, ideProjectName, type IdeAssets, type IdeFile } from './ideProject';
import type { Task, TaskFile } from './task';

const UNIX = 3; // „system plików” w nagłówku ZIP – dzięki temu zachowuje się bit wykonywalności gradlew
const MODE_FILE = 0o100644;
const MODE_EXEC = 0o100755;

/** ZIP z jednym katalogiem głównym `rootDir/`. */
export function zipIdeProject(files: IdeFile[], rootDir: string): Uint8Array {
  const entries: Zippable = {};
  for (const f of files) {
    const data = typeof f.content === 'string' ? strToU8(f.content) : f.content;
    entries[`${rootDir}/${f.path}`] = [data, { os: UNIX, attrs: (f.executable ? MODE_EXEC : MODE_FILE) * 0x10000 }];
  }
  return zipSync(entries, { level: 6 });
}

let wrapperJar: Promise<Uint8Array> | undefined;

/** gradle-wrapper.jar jest plikiem statycznym (public/ide/) – pobierany dopiero, gdy ktoś generuje paczkę Java. */
export function loadGradleWrapperJar(): Promise<Uint8Array> {
  wrapperJar ??= fetch(`${import.meta.env.BASE_URL}ide/gradle-wrapper.jar`)
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    })
    .catch((e) => {
      wrapperJar = undefined;
      throw new Error(`Nie udało się pobrać gradle-wrapper.jar: ${(e as Error).message}`);
    });
  return wrapperJar;
}

/** Buduje projekt z bieżących plików i zapisuje go u użytkownika jako `<tytuł>-<język>.zip`. */
export async function downloadIdeProject(task: Task, files: TaskFile[] = task.files): Promise<void> {
  const assets: IdeAssets = task.language === 'java' ? { gradleWrapperJar: await loadGradleWrapperJar() } : {};
  const name = ideProjectName(task);
  const zip = zipIdeProject(buildIdeProject(task, files, assets), name);
  const url = URL.createObjectURL(new Blob([zip.slice().buffer], { type: 'application/zip' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${name}.zip` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
