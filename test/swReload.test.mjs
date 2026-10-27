import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * Service-worker reload safety across the bridge import (Jalur 2).
 *
 * Two independent claims are checked here:
 *
 *  1. shouldReloadOnControllerChange refuses to reload while a `#bridge=` hash
 *     is still in the URL, so a controllerchange cannot re-run the import.
 *  2. When a reload does happen, the zustand persist layer carries the imported
 *     schedule and `wizardStep: 3` back: the store rehydrates from localStorage
 *     with the rows and the step intact.
 *
 * The second claim is the one that used to be an assumption. The test drives the
 * real store, the real importer and the real persist storage, so a partialize or
 * merge change that dropped a field fails here instead of in the browser.
 */

// zustand/persist resolves its storage via window.localStorage; polyfill both.
const storage = new Map();
const ls = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, v),
  removeItem: (k) => storage.delete(k),
};
globalThis.localStorage = ls;
globalThis.window = { localStorage: ls };

const { useJadwalStore } = await import('../src/store/useJadwalStore.ts');
const { importScheduleFromHash } = await import('../src/utils/bridge.ts');
const { shouldReloadOnControllerChange } = await import('../src/utils/swReload.ts');

/** Encode exactly the way the userscript does: UTF-8 JSON -> URL-safe base64. */
function encodePayload(payload) {
  const utf8 = unescape(encodeURIComponent(JSON.stringify(payload)));
  return Buffer.from(utf8, 'binary')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const bridgePayload = () => ({
  version: 1,
  source: 'labkom.ubg.ac.id',
  generatedAt: '2026-10-28T00:00:00.000Z',
  theory: [
    {
      id: 'bridge-theory-0',
      KodeMK: 'IF184201',
      MataKuliah: 'Pemrograman Web',
      Kelas: 'A',
      SKS: '3',
      SMT: '3',
      DosenPengampuh: 'Dosen Satu',
      Hari: 'Senin',
      Jam: '08.00-09.40',
      Ruang: 'R.301',
      Keterangan: 'TEORI',
    },
  ],
  praktikum: [
    {
      id: 'bridge-lab-0',
      courseName: 'Praktikum Pemrograman Web',
      kelas: 'A1',
      keterangan: 'PRAKTIKUM - Kelompok A1',
      dosen: 'Asisten Satu',
      semester: '3',
      hari: 'Rabu',
      jam: '10.00-11.40',
      ruang: 'LABKOM 2',
      kodeMk: 'IF184201',
    },
  ],
});

/* ------------------------------------------- the controllerchange decision */

test('shouldReloadOnControllerChange skips the reload while a bridge hash is present', () => {
  assert.equal(shouldReloadOnControllerChange('#bridge=abc123', false), false);
  assert.equal(shouldReloadOnControllerChange('bridge=abc123', false), false);
});

test('shouldReloadOnControllerChange allows the reload once the hash is gone', () => {
  assert.equal(shouldReloadOnControllerChange('', false), true);
  assert.equal(shouldReloadOnControllerChange('#', false), true);
  assert.equal(shouldReloadOnControllerChange('#step=3', false), true);
  assert.equal(shouldReloadOnControllerChange(undefined, false), true);
});

test('shouldReloadOnControllerChange never reloads twice', () => {
  assert.equal(shouldReloadOnControllerChange('', true), false);
  assert.equal(shouldReloadOnControllerChange('#bridge=abc', true), false);
});

/* ------------------------------------ fresh import through the real store */

test('importing a bridge hash lands on step 3 with rows and a cleared hash', () => {
  storage.clear();
  useJadwalStore.setState({
    wizardStep: 1,
    dataTeoriMentah: [],
    jadwalTeoriTerpilih: [],
    selectedTheoryRowIds: [],
    praktikumCandidates: [],
    selectedCandidateIds: [],
    parsedCourseCodes: [],
    courseTheorySelections: {},
    courseLabGroupSelections: {},
  });

  const replaced = [];
  const environment = {
    location: {
      hash: '#bridge=' + encodePayload(bridgePayload()),
      pathname: '/',
      search: '',
    },
    history: { replaceState: (...args) => replaced.push(args) },
  };

  assert.equal(importScheduleFromHash(useJadwalStore, undefined, environment), true);
  const state = useJadwalStore.getState();
  assert.equal(state.wizardStep, 3);
  assert.equal(state.scheduleMode, 'auto-codes');
  assert.deepEqual(state.jadwalTeoriTerpilih.map((r) => r.id), ['bridge-theory-0']);
  assert.deepEqual(state.dataTeoriMentah.map((r) => r.id), ['bridge-theory-0']);
  assert.deepEqual(state.praktikumCandidates.map((c) => c.id), ['bridge-lab-0']);
  assert.deepEqual(state.selectedCandidateIds, ['bridge-lab-0']);
  assert.deepEqual(state.courseTheorySelections, { IF184201: ['bridge-theory-0'] });
  assert.deepEqual(state.courseLabGroupSelections, { IF184201: ['bridge-lab-0'] });

  // The reload guard above depends on this: the hash must be gone before the
  // service worker can ever fire controllerchange.
  assert.equal(replaced.length, 1);
  assert.equal(replaced[0][2], '/');

  const persisted = JSON.parse(storage.get('ubg-schedule-storage'));
  assert.equal(persisted.state.wizardStep, 3, 'persist must keep the wizard step');
  assert.deepEqual(persisted.state.jadwalTeoriTerpilih.map((r) => r.id), ['bridge-theory-0']);
  assert.deepEqual(
    persisted.state.courseTheorySelections,
    { IF184201: ['bridge-theory-0'] },
    'persist must keep the step-2 selection maps'
  );
});

test('a reload that drops the in-memory state rehydrates the import at step 3', async () => {
  // On a real reload nothing runs before hydration, so the localStorage entry is
  // exactly what the import left. setState here would write through persist and
  // clobber that entry, so snapshot it first and put it back before rehydrating.
  storage.clear();
  useJadwalStore.setState({ wizardStep: 1, jadwalTeoriTerpilih: [], praktikumCandidates: [] });
  const location = {
    hash: '#bridge=' + encodePayload(bridgePayload()),
    pathname: '/',
    search: '',
  };
  importScheduleFromHash(useJadwalStore, undefined, {
    location,
    history: { replaceState: () => {} },
  });
  const persistedEntry = storage.get('ubg-schedule-storage');
  assert.ok(persistedEntry, 'the import must have written the store to storage');

  // Wipe everything in memory the way a fresh page load would.
  useJadwalStore.setState({
    wizardStep: 1,
    dataTeoriMentah: [],
    jadwalTeoriTerpilih: [],
    selectedTheoryRowIds: [],
    praktikumCandidates: [],
    selectedCandidateIds: [],
    parsedCourseCodes: [],
    courseTheorySelections: {},
    courseLabGroupSelections: {},
  });
  assert.equal(useJadwalStore.getState().wizardStep, 1);

  // Restore the pre-reload entry, then let persist read it back.
  storage.set('ubg-schedule-storage', persistedEntry);
  await useJadwalStore.persist.rehydrate();

  const state = useJadwalStore.getState();
  assert.equal(state.wizardStep, 3, 'wizardStep 3 must survive the reload');
  assert.deepEqual(state.jadwalTeoriTerpilih.map((r) => r.id), ['bridge-theory-0']);
  assert.deepEqual(state.dataTeoriMentah.map((r) => r.id), ['bridge-theory-0']);
  assert.deepEqual(state.praktikumCandidates.map((c) => c.id), ['bridge-lab-0']);
  assert.deepEqual(state.selectedCandidateIds, ['bridge-lab-0']);
  assert.deepEqual(state.parsedCourseCodes, ['IF184201']);
  assert.deepEqual(state.courseTheorySelections, { IF184201: ['bridge-theory-0'] });
  assert.equal(state.scheduleMode, 'auto-codes');
});

/* ---------------------------------------------------- end to end with the SW */

test('a controllerchange after the import does not re-run the import', () => {
  /*
   * Reproduce the sequence the browser runs: boot with a bridge hash, import it
   * (which clears the hash), then the service worker takes control and fires
   * controllerchange. The guard must see an empty hash and be free to reload,
   * and a second import against the now-clean URL must be a no-op, so a reload
   * cannot resurrect the payload over the user's edits.
   */
  storage.clear();
  useJadwalStore.setState({ wizardStep: 1, jadwalTeoriTerpilih: [], praktikumCandidates: [] });

  const location = {
    hash: '#bridge=' + encodePayload(bridgePayload()),
    pathname: '/',
    search: '',
  };
  const history = { replaceState: (_s, _t, url) => { location.hash = ''; location.pathname = url || '/'; } };
  const environment = { location, history };

  assert.equal(importScheduleFromHash(useJadwalStore, undefined, environment), true);
  assert.equal(location.hash, '');
  assert.equal(shouldReloadOnControllerChange(location.hash, false), true);

  // The user edits after arriving: drop the imported practical row.
  useJadwalStore.getState().setSelectedCandidateIds([]);
  assert.deepEqual(useJadwalStore.getState().selectedCandidateIds, []);

  // A reload would re-read the (now empty) hash, so nothing is re-imported.
  assert.equal(importScheduleFromHash(useJadwalStore, undefined, environment), false);
  assert.deepEqual(useJadwalStore.getState().selectedCandidateIds, []);
  assert.equal(useJadwalStore.getState().wizardStep, 3);
});
