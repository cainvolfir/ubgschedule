import type { DataTeoriMentah, PraktikumCandidate } from '../store/useJadwalStore';

/**
 * Jalur 2: import a schedule handed over by the Labkom userscript.
 *
 * The userscript (ubg-labkom-helper.user.js) scrapes the filtered schedule
 * cards off labkom.ubg.ac.id, encodes them as URL-safe base64 JSON and opens
 * this app at `#bridge=<payload>`. The payload carries the two shapes the store
 * already uses:
 *
 *   {
 *     version: 1,
 *     source: 'labkom.ubg.ac.id',
 *     generatedAt: '<ISO string>',
 *     theory:    DataTeoriMentah[],
 *     praktikum: PraktikumCandidate[]
 *   }
 *
 * Everything here is pure so the node suite can drive it without a browser.
 */

export const BRIDGE_HASH_PREFIX = '#bridge=';
export const BRIDGE_VERSION = 1;

export interface BridgePayload {
  version: number;
  source: string;
  generatedAt: string;
  theory: DataTeoriMentah[];
  praktikum: PraktikumCandidate[];
}

/** Read one field as a trimmed string; undefined and null become ''. */
function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  return '';
}

/**
 * Decode URL-safe base64 back to text.
 * The encoder strips '=' padding and swaps '+'/'-' and '/'/'_'; both are undone
 * here so the base64 decoder always sees a complete, standard alphabet.
 */
export function base64UrlDecode(encoded: string): string {
  const normalised = String(encoded || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/\s+/g, '');
  if (!normalised) return '';
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalised)) {
    throw new Error('Payload bridge bukan base64 yang valid.');
  }
  const padded = normalised + '='.repeat((4 - (normalised.length % 4)) % 4);

  // atob is absent under Node, where the tests run; Buffer is absent in the
  // browser, where the feature runs. Support whichever is present.
  if (typeof atob === 'function') {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  const buffer = (globalThis as { Buffer?: { from(s: string, enc: string): { toString(enc: string): string } } })
    .Buffer;
  if (buffer) return buffer.from(padded, 'base64').toString('utf8');
  throw new Error('Tidak ada decoder base64 yang tersedia.');
}

/**
 * Normalise one theory row. Returns null when the row carries no course name,
 * because a nameless row cannot be rendered or exported.
 * Missing optional fields become '' rather than undefined so the rest of the
 * app can keep using plain string operations.
 */
export function normalizeTheoryRow(raw: unknown): DataTeoriMentah | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const MataKuliah = readString(source, 'MataKuliah');
  if (!MataKuliah) return null;
  const KodeMK = readString(source, 'KodeMK');
  const id = readString(source, 'id') || `bridge-theory-${KodeMK || MataKuliah}`;

  const row: DataTeoriMentah = {
    id,
    KodeMK,
    MataKuliah,
    Kelas: readString(source, 'Kelas'),
    SKS: readString(source, 'SKS'),
    SMT: readString(source, 'SMT'),
    DosenPengampuh: readString(source, 'DosenPengampuh'),
    Hari: readString(source, 'Hari'),
    Jam: readString(source, 'Jam'),
    Ruang: readString(source, 'Ruang'),
    Keterangan: readString(source, 'Keterangan'),
  };
  return row;
}

/** Normalise one practical candidate. Returns null without a course name. */
export function normalizePraktikumRow(raw: unknown): PraktikumCandidate | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const courseName = readString(source, 'courseName');
  if (!courseName) return null;
  const kodeMk = readString(source, 'kodeMk');
  const id = readString(source, 'id') || `bridge-lab-${kodeMk || courseName}`;

  const candidate: PraktikumCandidate = {
    id,
    courseName,
    kelas: readString(source, 'kelas'),
    keterangan: readString(source, 'keterangan'),
    dosen: readString(source, 'dosen'),
    semester: readString(source, 'semester'),
    hari: readString(source, 'hari'),
    jam: readString(source, 'jam'),
    ruang: readString(source, 'ruang'),
    kodeMk,
  };
  return candidate;
}

/**
 * Drop rows that share an id, keeping the first. The userscript mints ids by
 * index within each array, so a payload that merges two sources can repeat one.
 */
function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

/**
 * Drop rows that describe the same session, keeping the first.
 *
 * A user's own selection can list one session once, but nothing stops a broken
 * or hand-edited payload from carrying it twice under different ids. Two
 * identical rows would then render as two boxes on the result step and, worse,
 * collide with each other (same day, same time) and inflate the 'bertabrakan'
 * count. The key is content, not identity: a session is unique when its course
 * code, class, day, time and room all match. Two genuinely different meetings
 * always differ in at least one of those, so no real row is ever merged.
 */
function dedupeByContent<T>(rows: T[], key: (row: T) => string): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const id = key(row).toUpperCase();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** Content key for a theory row: code + class + day + time + room. */
function theoryContentKey(row: DataTeoriMentah): string {
  return [row.KodeMK, row.Kelas, row.Hari, row.Jam, row.Ruang].join('|');
}

/** Content key for a practical row: code + class + day + time + room. */
function praktikumContentKey(row: PraktikumCandidate): string {
  return [row.kodeMk || row.courseName, row.kelas, row.hari, row.jam, row.ruang].join('|');
}

/**
 * Parse a decoded bridge payload.
 * Throws a message fit to show the user when the JSON is malformed or carries
 * no usable rows at all; individual bad rows are dropped, not fatal.
 */
export function parseBridgePayload(jsonText: string): BridgePayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Payload bridge bukan JSON yang valid.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Payload bridge tidak berisi objek jadwal.');
  }
  const source = parsed as Record<string, unknown>;

  const rawTheory = Array.isArray(source.theory) ? source.theory : [];
  const rawPraktikum = Array.isArray(source.praktikum) ? source.praktikum : [];

  const theory = dedupeByContent(
    dedupeById(rawTheory.map(normalizeTheoryRow).filter((row): row is DataTeoriMentah => row !== null)),
    theoryContentKey
  );
  const praktikum = dedupeByContent(
    dedupeById(
      rawPraktikum.map(normalizePraktikumRow).filter((row): row is PraktikumCandidate => row !== null)
    ),
    praktikumContentKey
  );

  if (theory.length === 0 && praktikum.length === 0) {
    throw new Error('Payload bridge tidak berisi jadwal yang bisa dipakai.');
  }

  const version = typeof source.version === 'number' ? source.version : BRIDGE_VERSION;
  return {
    version,
    source: readString(source, 'source') || 'labkom.ubg.ac.id',
    generatedAt: readString(source, 'generatedAt'),
    theory,
    praktikum,
  };
}

/** Decode then parse a raw `#bridge=` value. */
export function decodeBridgeHash(hashValue: string): BridgePayload {
  const encoded = String(hashValue || '').replace(/^#?bridge=/, '');
  if (!encoded) throw new Error('Payload bridge kosong.');
  return parseBridgePayload(base64UrlDecode(encoded));
}

/**
 * Read the bridge payload out of a URL hash, or null when the hash carries none.
 * Accepts the whole hash ('#bridge=...') as well as the bare value.
 */
export function readBridgeFromHash(hash: string): BridgePayload | null {
  const raw = String(hash || '');
  if (!raw.includes('bridge=')) return null;
  const match = raw.match(/[#&]?bridge=([^\s&]+)/);
  if (!match) return null;
  const encoded = match[1];
  if (!encoded) return null;
  return decodeBridgeHash(encoded);
}

/**
 * Clear the hash without adding a history entry.
 *
 * This matters because the PWA registers a service worker that reloads on
 * `controllerchange`: a hash left in the URL would be re-imported on that
 * reload and silently overwrite whatever the user had since changed.
 */
export function clearBridgeHash(
  location: Pick<Location, 'pathname' | 'search'>,
  history: Pick<History, 'replaceState'>
): void {
  const clean = location.pathname + location.search;
  try {
    history.replaceState(null, '', clean);
  } catch {
    // An embedded browser can refuse replaceState; leaving the hash in place is
    // survivable because the import only runs once per page load.
  }
}

/**
 * The slice of the store the importer drives. Typed structurally so the module
 * does not import the store and create a cycle (the store owns the row types).
 */
export interface BridgeStoreState {
  setScheduleMode: (mode: 'auto-codes' | 'manual') => void;
  setDataTeoriMentah: (rows: DataTeoriMentah[]) => void;
  setJadwalTeoriTerpilih: (rows: DataTeoriMentah[]) => void;
  setSelectedTheoryRowIds: (ids: string[]) => void;
  setPraktikumCandidates: (rows: PraktikumCandidate[]) => void;
  setSelectedCandidateIds: (ids: string[]) => void;
  setParsedCourseCodes: (codes: string[]) => void;
  selectAllCourses: (selections: {
    theorySelections: Record<string, string[]>;
    labSelections: Record<string, string[]>;
  }) => void;
  setWizardStep: (step: 1 | 2 | 3) => void;
}

/**
 * The browser bits the import touches. Injected so node tests can drive the
 * importer without a DOM and so the module never reads an ambient global.
 */
export interface BridgeEnvironment {
  location: Pick<Location, 'hash' | 'pathname' | 'search'>;
  history: Pick<History, 'replaceState'>;
}

/** Resolve the real browser environment, or null when there is none. */
function browserEnvironment(): BridgeEnvironment | null {
  const win = (globalThis as { window?: Window }).window;
  if (!win || !win.location || !win.history) return null;
  return { location: win.location, history: win.history };
}

/**
 * Apply a decoded payload to the store and land the user on the result step.
 *
 * The store is read straight from `useJadwalStore.getState()` rather than a
 * hook, because this runs once at boot before any component mounts and must not
 * be tied to a render.
 *
 * Shape notes:
 *  - `jadwalTeoriTerpilih` and `selectedTheoryRowIds` are the theory rows and
 *    their ids, so the result step renders them immediately.
 *  - `dataTeoriMentah` is set too: the picker and the exporters read the raw
 *    rows, so a schedule that skipped this would go blank if the user stepped
 *    back from step 3.
 *  - `praktikumCandidates` is the full practical pool and
 *    `selectedCandidateIds` marks every row from the payload as chosen. The
 *    bridge exists to carry a finished selection, so nothing is left unselected.
 *  - `scheduleMode` is 'auto-codes' because that is the mode whose step 2 reads
 *    these maps; landing on step 3 with 'manual' would break the back button.
 */
export function applyBridgeToStore(
  payload: BridgePayload,
  store: { getState: () => BridgeStoreState },
  environment?: BridgeEnvironment | null
): void {
  const state = store.getState();
  const theory = payload.theory;
  const praktikum = payload.praktikum;

  state.setScheduleMode('auto-codes');
  state.setDataTeoriMentah(theory);
  state.setJadwalTeoriTerpilih(theory);
  state.setSelectedTheoryRowIds(theory.map((row) => row.id));
  state.setPraktikumCandidates(praktikum);
  state.setSelectedCandidateIds(praktikum.map((row) => row.id));

  // Step 2 reads one selection map per course; populate them so stepping back
  // from the result shows the same schedule instead of an empty picker.
  const theorySelections: Record<string, string[]> = {};
  for (const row of theory) {
    const code = row.KodeMK || row.MataKuliah;
    if (!code) continue;
    (theorySelections[code] ||= []).push(row.id);
  }
  const labSelections: Record<string, string[]> = {};
  for (const row of praktikum) {
    const code = row.kodeMk || row.courseName;
    if (!code) continue;
    (labSelections[code] ||= []).push(row.id);
  }

  // selectAllCourses replaces both maps wholesale, which is what a fresh import
  // wants: nothing from a previous session may survive into this one.
  state.setParsedCourseCodes(Object.keys(theorySelections));
  state.selectAllCourses({ theorySelections, labSelections });
  state.setWizardStep(3);

  // Clear the hash last: the schedule is already in the store, so a reload that
  // happens between these two lines cannot lose it.
  const env = environment === undefined ? browserEnvironment() : environment;
  if (env) clearBridgeHash(env.location, env.history);
}

/**
 * Boot-time entry point: import a schedule from the URL hash when one is
 * present. Returns true when a payload was applied and false when the hash
 * carried none. A malformed payload is reported through `onError` rather than
 * thrown, so a broken link can never blank the app.
 */
export function importScheduleFromHash(
  store: { getState: () => BridgeStoreState },
  onError?: (message: string) => void,
  environment?: BridgeEnvironment | null
): boolean {
  const env = environment === undefined ? browserEnvironment() : environment;
  if (!env) return false;
  try {
    const payload = readBridgeFromHash(env.location.hash);
    if (!payload) return false;
    applyBridgeToStore(payload, store, env);
    return true;
  } catch (error) {
    onError?.(error instanceof Error ? error.message : String(error));
    clearBridgeHash(env.location, env.history);
    return false;
  }
}
