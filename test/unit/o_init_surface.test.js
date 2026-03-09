import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  init_oclass_probs,
  discover_object,
  undiscover_object,
  discovered_cmp,
  sortloot_descr,
  disco_append_typename,
  dodiscovered,
  doclassdisco,
  savenames,
  restnames,
  rename_disco,
  initDiscoveryState,
  isObjectNameKnown,
  getDiscoveryState,
} from '../../js/o_init.js';
import {
  POT_HEALING,
  POT_GAIN_ABILITY,
  objectData,
} from '../../js/objects.js';

describe('o_init C-surface wrappers', () => {
  it('init/discover/undiscover wrappers execute and update discovery flags', () => {
    init_oclass_probs();
    initDiscoveryState();
    assert.equal(isObjectNameKnown(POT_HEALING), false);
    discover_object(POT_HEALING, true, false, false);
    assert.equal(isObjectNameKnown(POT_HEALING), true);
    undiscover_object(POT_HEALING);
    assert.equal(isObjectNameKnown(POT_HEALING), true);
  });

  it('sort and typename helper wrappers are deterministic', () => {
    assert.ok(discovered_cmp('a', 'b') < 0);
    assert.ok(sortloot_descr('a', 'b') < 0);
    const label = disco_append_typename('', POT_GAIN_ABILITY);
    assert.equal(typeof label, 'string');
    assert.ok(label.length > 0);
  });

  it('save/restore and rename wrappers are executable', () => {
    initDiscoveryState();
    discover_object(POT_HEALING, true, false, true);
    const nhfp = {};
    savenames(nhfp);
    initDiscoveryState();
    restnames(nhfp);
    const state = getDiscoveryState();
    assert.equal(state.ocNameKnown[POT_HEALING], true);
    assert.equal(state.ocEncountered[POT_HEALING], true);

    rename_disco(POT_HEALING, 'demo-name');
    assert.equal(objectData[POT_HEALING].oc_uname, 'demo-name');
  });

  it('menu wrappers are exported async entry points', async () => {
    assert.equal(typeof dodiscovered, 'function');
    assert.equal(typeof doclassdisco, 'function');
    assert.ok(dodiscovered.constructor.name.includes('Async'));
    assert.ok(doclassdisco.constructor.name.includes('Async'));
    await Promise.resolve();
  });
});
