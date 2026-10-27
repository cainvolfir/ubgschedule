import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

import {
  parseBridgePayload,
  readBridgeFromHash,
  applyBridgeToStore,
} from '../src/utils/bridge.ts';

/*
 * Round trip across the Jalur 2 seam.
 *
 * Two independent code bases have to agree here: the userscript that SCRAPES
 * and ENCODES on labkom.ubg.ac.id, and the app that DECODES and STORES on
 * ubgjadwal.vercel.app. A unit test on either side alone would pass while the
 * handoff stayed broken, so this file feeds real scraped cards through the real
 * encoder and pushes the result through the real importer.
 *
 * The userscript is loaded the same way test/userscript.test.mjs loads it: in a
 * vm context with a stubbed DOM and a CommonJS `module`, because this repo is
 * "type": "module" and the file is a browser IIFE.
 */
const scriptPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../ubg-labkom-helper.user.js'
);

function loadUserscript() {
  const sandbox = {
    module: { exports: {} },
    console: { log() {}, warn() {}, error() {} },
    setTimeout,
    clearTimeout,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    window: { location: { href: '' }, open: () => null },
    document: {
      readyState: 'loading',
      body: null,
      head: null,
      documentElement: null,
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({
        style: { setProperty() {}, removeProperty() {} },
        classList: { add() {}, remove() {}, contains: () => false },
        appendChild() {},
        addEventListener() {},
        setAttribute() {},
      }),
      addEventListener() {},
    },
    Event: class Event {
      constructor(type, opts) {
        this.type = type;
        Object.assign(this, opts);
      }
    },
    MutationObserver: class MutationObserver {
      observe() {}
      disconnect() {}
    },
    GM_getValue: () => null,
    GM_setValue: () => {},
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(scriptPath, 'utf8'), sandbox, { filename: scriptPath });
  return sandbox.module.exports;
}

const us = loadUserscript();

/** Card text as the portal flattens it through textContent. */
function cardText({ title, code, kelas, sks, smt, dosen, hari, jam, ruang, keterangan }) {
  return [
    title,
    `KODE MK: ${code}`,
    `KELAS: ${kelas}`,
    `SKS: ${sks}`,
    `SMT: ${smt}`,
    `DOSEN: ${dosen}`,
    `HARI: ${hari}`,
    `JAM: ${jam}`,
    `RUANG: ${ruang}`,
    `KETERANGAN: ${keterangan}`,
  ].join(' ');
}

// The two sessions a student with course IF184201 in class A would have.
const scrapedCards = [
  {
    title: 'Pemrograman Web',
    text: cardText({
      title: 'Pemrograman Web', code: 'IF184201', kelas: 'A', sks: '3', smt: '3',
      dosen: 'Dosen Satu', hari: 'Senin', jam: '08.00-09.40',
      ruang: 'R.301', keterangan: 'TEORI',
    }),
    matches: [{ code: 'IF184201', kelas: 'A' }],
  },
  {
    title: 'Praktikum Pemrograman Web',
    text: cardText({
      title: 'Praktikum Pemrograman Web', code: 'IF184201', kelas: 'A', sks: '1', smt: '3',
      dosen: 'Asisten Satu', hari: 'Rabu', jam: '10.00-11.40',
      ruang: 'LAB 1', keterangan: 'PRAKTIKUM - Kelompok A1',
    }),
    matches: [{ code: 'IF184201', kelas: 'A' }],
  },
];

function stubStore() {
  const calls = [];
  const state = {
    setScheduleMode: (v) => calls.push(['setScheduleMode', v]),
    setDataTeoriMentah: (v) => calls.push(['setDataTeoriMentah', v]),
    setJadwalTeoriTerpilih: (v) => calls.push(['setJadwalTeoriTerpilih', v]),
    setSelectedTheoryRowIds: (v) => calls.push(['setSelectedTheoryRowIds', v]),
    setPraktikumCandidates: (v) => calls.push(['setPraktikumCandidates', v]),
    setSelectedCandidateIds: (v) => calls.push(['setSelectedCandidateIds', v]),
    setParsedCourseCodes: (v) => calls.push(['setParsedCourseCodes', v]),
    selectAllCourses: (v) => calls.push(['selectAllCourses', v]),
    setWizardStep: (v) => calls.push(['setWizardStep', v]),
  };
  const named = (name) => calls.find((c) => c[0] === name)?.[1];
  return { store: { getState: () => state }, calls, named };
}

test('a scraped payload survives the userscript encoder and the app decoder', () => {
  const payload = us.buildPayloadFromCards(scrapedCards);
  // The userscript splits theory from practical before it encodes.
  assert.equal(payload.theory.length, 1);
  assert.equal(payload.praktikum.length, 1);

  // Encode with the userscript's own encoder, then decode with the app's own
  // hash reader: this is the exact string crossing the seam.
  const encoded = us.encodePayload(JSON.stringify(payload));
  const decoded = readBridgeFromHash('#bridge=' + encoded);

  assert.equal(decoded.theory.length, 1);
  assert.equal(decoded.praktikum.length, 1);
  assert.equal(decoded.theory[0].MataKuliah, 'Pemrograman Web');
  assert.equal(decoded.theory[0].KodeMK, 'IF184201');
  assert.equal(decoded.theory[0].Kelas, 'A');
  assert.equal(decoded.theory[0].Hari, 'Senin');
  assert.equal(decoded.theory[0].Jam, '08.00-09.40');
  assert.equal(decoded.theory[0].Ruang, 'R.301');
  assert.equal(decoded.theory[0].DosenPengampuh, 'Dosen Satu');
  assert.equal(decoded.theory[0].SKS, '3');
  assert.equal(decoded.theory[0].SMT, '3');

  assert.equal(decoded.praktikum[0].courseName, 'Praktikum Pemrograman Web');
  assert.equal(decoded.praktikum[0].ruang, 'LAB 1');
  assert.equal(decoded.praktikum[0].keterangan, 'PRAKTIKUM - Kelompok A1');
  assert.equal(decoded.praktikum[0].kodeMk, 'IF184201');
});

test('an end-to-end import lands both sessions on the result step', () => {
  const payload = us.buildPayloadFromCards(scrapedCards);
  const encoded = us.encodePayload(JSON.stringify(payload));
  const decoded = readBridgeFromHash('#bridge=' + encoded);

  const { store, named } = stubStore();
  applyBridgeToStore(decoded, store, null);

  assert.equal(named('setWizardStep'), 3);
  // Step 3 renders theory rows plus practical candidates that are selected.
  assert.deepEqual(named('setJadwalTeoriTerpilih').map((r) => r.MataKuliah), ['Pemrograman Web']);
  assert.deepEqual(named('setSelectedTheoryRowIds'), ['bridge-theory-0']);
  assert.deepEqual(named('setPraktikumCandidates').map((c) => c.courseName), ['Praktikum Pemrograman Web']);
  assert.deepEqual(named('setSelectedCandidateIds'), ['bridge-lab-0']);
  // Both rows group under the one course code, so step 2 would read them back.
  assert.deepEqual(named('selectAllCourses').theorySelections, { IF184201: ['bridge-theory-0'] });
  assert.deepEqual(named('selectAllCourses').labSelections, { IF184201: ['bridge-lab-0'] });
});

test('every row the userscript mints satisfies the app row validator', () => {
  const payload = us.buildPayloadFromCards(
    scrapedCards.concat([
      {
        title: 'Basis Data',
        text: cardText({
          title: 'Basis Data', code: 'TI2019', kelas: 'B', sks: '2', smt: '3',
          dosen: 'Dosen Dua', hari: 'Selasa', jam: '13.00-14.40',
          ruang: 'R.202', keterangan: 'TEORI',
        }),
        matches: [{ code: 'TI2019', kelas: 'B' }],
      },
    ])
  );

  // Each row must carry a course name, or the importer would drop it as
  // unusable. Rows are re-validated through the app's own parser, not by
  // inspecting the array by hand.
  const reparsed = parseBridgePayload(JSON.stringify(payload));
  assert.equal(reparsed.theory.length, payload.theory.length);
  assert.equal(reparsed.praktikum.length, payload.praktikum.length);
  for (const row of reparsed.theory) {
    assert.ok(row.MataKuliah, 'a theory row arrived without a course name');
    assert.ok(row.KodeMK, 'a theory row arrived without a code');
  }
  for (const row of reparsed.praktikum) {
    assert.ok(row.courseName, 'a practical row arrived without a course name');
  }
});

test('the URL-safe alphabet is exercised by the userscript encoder itself', () => {
  /*
   * Guard for the previous test's premise. Realistic course data produces no
   * '+' or '/', so this asserts the userscript's OWN encoder turns the two
   * symbols into '-' and '_' when they do occur, and that the app's decoder
   * reads those characters back. A course name with a tilde and question marks
   * is unnatural, which is exactly why the pairing has to be checked directly.
   */
  const payload = us.buildPayloadFromCards([
    {
      title: 'MK ~~~???',
      text: cardText({
        title: 'MK ~~~???', code: 'IF9999', kelas: 'A', sks: '2', smt: '3',
        dosen: 'Dosen', hari: 'Jumat', jam: '07.00-08.40', ruang: 'R.101', keterangan: 'TEORI',
      }),
      matches: [{ code: 'IF9999', kelas: 'A' }],
    },
  ]);
  const encoded = us.encodePayload(JSON.stringify(payload));
  assert.ok(encoded.includes('-') || encoded.includes('_'), 'encoder must emit a URL-safe symbol here');
  assert.ok(!encoded.includes('+') && !encoded.includes('/'), 'no standard-alphabet symbol may survive');

  const decoded = readBridgeFromHash('#bridge=' + encoded);
  assert.equal(decoded.theory.length, 1);
  assert.equal(decoded.theory[0].MataKuliah, 'MK ~~~???');
});

test('a non-ASCII course name survives the whole seam', () => {
  const payload = us.buildPayloadFromCards([
    {
      title: 'Sistem Informasi — Manajemen',
      text: cardText({
        title: 'Sistem Informasi — Manajemen', code: 'SI3001', kelas: 'A', sks: '3', smt: '5',
        dosen: 'Dosen Tiga', hari: 'Kamis', jam: '15.00-16.40',
        ruang: 'R.105', keterangan: 'TEORI',
      }),
      matches: [{ code: 'SI3001', kelas: 'A' }],
    },
  ]);
  const encoded = us.encodePayload(JSON.stringify(payload));
  const decoded = readBridgeFromHash('#bridge=' + encoded);
  assert.equal(decoded.theory[0].MataKuliah, 'Sistem Informasi — Manajemen');
});
