import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal storage polyfill so zustand/persist stops warning about a missing backend.
const storage = new Map();
const ls = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, v),
  removeItem: (k) => storage.delete(k),
};
globalThis.localStorage = ls;
globalThis.window = { localStorage: ls };

const { normalizeSelectionMap, useJadwalStore } = await import('../src/store/useJadwalStore.ts');

test('normalizeSelectionMap converts legacy strings to single-item arrays', () => {
  assert.deepEqual(normalizeSelectionMap({ IF1234: 'lab-1', TI201: ['a', 'b'] }), {
    IF1234: ['lab-1'],
    TI201: ['a', 'b'],
  });
  assert.deepEqual(normalizeSelectionMap({ X: '', Y: [] }), { Y: [] });
  assert.deepEqual(normalizeSelectionMap(undefined), {});
  assert.deepEqual(normalizeSelectionMap('nonsense'), {});
});

test('store multi-select actions add, toggle and clear per course', () => {
  const s = () => useJadwalStore.getState();
  s().deselectAllCourses();

  s().setCourseTheorySelections('IF1234', ['t1', 't2']);
  s().setCourseLabGroupSelections('IF1234', ['l1']);
  assert.deepEqual(s().courseTheorySelections.IF1234, ['t1', 't2']);
  assert.deepEqual(s().courseLabGroupSelections.IF1234, ['l1']);

  s().toggleCourseTheorySelection('IF1234', 't1');
  s().toggleCourseLabGroupSelection('IF1234', 'l2');
  assert.deepEqual(s().courseTheorySelections.IF1234, ['t2']);
  assert.deepEqual(s().courseLabGroupSelections.IF1234, ['l1', 'l2']);

  // Legacy single-group setter writes a one-item array.
  s().setCourseLabGroupSelection('TI201', 'lab-9');
  assert.deepEqual(s().courseLabGroupSelections.TI201, ['lab-9']);

  s().selectAllForCourse('EK2201', ['e1'], ['el1', 'el2']);
  assert.deepEqual(s().courseTheorySelections.EK2201, ['e1']);
  assert.deepEqual(s().courseLabGroupSelections.EK2201, ['el1', 'el2']);

  s().deselectAllForCourse('EK2201');
  assert.equal(s().courseTheorySelections.EK2201, undefined);
  assert.equal(s().courseLabGroupSelections.EK2201, undefined);
  assert.equal(s().courseClassSelections.EK2201, undefined);

  s().selectAllCourses({
    theorySelections: { A: ['a1'], B: ['b1'] },
    labSelections: { A: ['la1'] },
  });
  assert.deepEqual(s().courseTheorySelections, { A: ['a1'], B: ['b1'] });
  assert.deepEqual(s().courseLabGroupSelections, { A: ['la1'] });

  s().deselectAllCourses();
  assert.deepEqual(s().courseTheorySelections, {});
  assert.deepEqual(s().courseLabGroupSelections, {});

  // clearAutoCodesState wipes both selection maps.
  s().selectAllCourses({ theorySelections: { A: ['a1'] }, labSelections: { A: ['la1'] } });
  s().clearAutoCodesState();
  assert.deepEqual(s().courseTheorySelections, {});
  assert.deepEqual(s().courseLabGroupSelections, {});
});
