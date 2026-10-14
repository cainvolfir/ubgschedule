import test from 'node:test';
import assert from 'node:assert/strict';

// zustand/persist resolves its storage via window.localStorage; polyfill both.
const storage = new Map();
const ls = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, v),
  removeItem: (k) => storage.delete(k),
};
globalThis.localStorage = ls;
globalThis.window = { localStorage: ls };

// v3 payload: single-string lab group selections, no courseTheorySelections.
// It also carries Keterangan values poisoned with the stale whole-cohort tail
// that the v5 migration must strip.
storage.set(
  'ubg-schedule-storage',
  JSON.stringify({
    state: {
      scheduleMode: 'auto-codes',
      courseLabGroupSelections: { IF1234: 'lab-a1', TI201: 'lab-b1' },
      parsedCourseCodes: ['IF1234', 'TI201'],
      courseClassSelections: { IF1234: 'A' },
      dataTeoriMentah: [
        {
          id: 'r1',
          KodeMK: 'HK1101',
          MataKuliah: 'Hukum Perdata',
          Kelas: 'A',
          SKS: '2',
          SMT: '3',
          DosenPengampuh: 'Dosen',
          Hari: 'Senin',
          Jam: '08.00-09.40',
          Ruang: 'R.301',
          Keterangan: 'TEORI - Jadwal Teori (2T) dari Akademik - Kelompok Semua Mhs',
        },
      ],
      jadwalTeoriTerpilih: [
        {
          id: 'r2',
          KodeMK: 'HK1102',
          MataKuliah: 'Hukum Acara',
          Kelas: 'A',
          SKS: '2',
          SMT: '3',
          DosenPengampuh: 'Dosen',
          Hari: 'Selasa',
          Jam: '08.00-09.40',
          Ruang: 'R.302',
          Keterangan: 'TEORI - MKWK - Semua Mhs',
        },
      ],
      praktikumCandidates: [
        {
          id: 'c1',
          courseName: 'Praktikum Basis Data',
          kelas: 'A',
          keterangan: 'PRAKTIKUM LAB - - - Kelompok A1',
          dosen: 'Asisten',
          semester: '3',
          hari: 'Rabu',
          jam: '10.00-11.40',
          ruang: 'LAB 1',
        },
      ],
    },
    version: 3,
  })
);

const { useJadwalStore } = await import('../src/store/useJadwalStore.ts');
// Hydration resolves asynchronously after the module evaluates.
await new Promise((resolve) => setTimeout(resolve, 50));
const s = () => useJadwalStore.getState();

test('v3 persisted string lab selections migrate to arrays', () => {
  assert.deepEqual(s().courseLabGroupSelections, { IF1234: ['lab-a1'], TI201: ['lab-b1'] });
  assert.deepEqual(s().courseTheorySelections, {});
  assert.deepEqual(s().parsedCourseCodes, ['IF1234', 'TI201']);
});

test('migrated selections are usable by the multi-select actions', () => {
  s().toggleCourseLabGroupSelection('IF1234', 'lab-a2');
  assert.deepEqual(s().courseLabGroupSelections.IF1234, ['lab-a1', 'lab-a2']);
  s().setCourseTheorySelections('IF1234', ['t1']);
  assert.deepEqual(s().courseTheorySelections.IF1234, ['t1']);
});

test('hydration strips the stale whole-cohort tail from persisted Keterangan', () => {
  const rows = s().dataTeoriMentah;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].Keterangan, 'TEORI - Jadwal Teori (2T) dari Akademik');
  assert.ok(!/semua\s*mhs/i.test(rows[0].Keterangan));

  const selected = s().jadwalTeoriTerpilih;
  assert.equal(selected[0].Keterangan, 'TEORI - MKWK');
});

test('hydration leaves a real praktikum sub-group label untouched', () => {
  assert.equal(s().praktikumCandidates[0].keterangan, 'PRAKTIKUM LAB - - - Kelompok A1');
});
