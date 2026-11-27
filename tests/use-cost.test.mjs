import test from 'node:test';
import assert from 'node:assert/strict';
import {costForUses} from '../web/use-cost.mjs';
import {rational} from '../web/model.mjs';

test('different detergent concentrations can reverse the checkout and cost-per-load rankings', () => {
  const regular = costForUses({price:'8.40',size:'1.2',unit:'L',dose:'40'}, '30');
  const concentrate = costForUses({price:'5.00',size:'600',unit:'mL',dose:'25'}, '30');
  assert.equal(regular.checkout,840n);
  assert.equal(concentrate.checkout,1000n);
  assert.deepEqual(regular.costPerUse,rational(28n,100n));
  assert.deepEqual(concentrate.costPerUse,rational(5n,24n));
  assert.deepEqual(concentrate.remainder,rational(450n));
});

test('different bag units share the grams-per-day basis', () => {
  for (const [unit, size] of [['kg','2'],['g','2000']]) {
    const result = costForUses({price:'10.00',size,unit,dose:'100'},'30');
    assert.equal(result.packs,2n);
    assert.deepEqual(result.costPerUse,rational(1n,2n));
    assert.deepEqual(result.remainder,rational(1000n));
  }
  assert.deepEqual(costForUses({price:'12',size:'1',unit:'lb',dose:'25'},'10'),
                   costForUses({price:'12',size:'16',unit:'oz',dose:'25'},'10'));
});

test('whole pods compare on actual washes, including two pods for one load', () => {
  const result = costForUses({price:'12',size:'24',unit:'each',dose:'2'},'13');
  assert.deepEqual(result.costPerUse,rational(1n));
  assert.equal(result.checkout,2400n);
  assert.deepEqual(result.remainder,rational(22n));
  assert.throws(() => costForUses({price:'12',size:'24',unit:'each',dose:'0.5'},'13'));
  assert.throws(() => costForUses({price:'12',size:'24',unit:'each',dose:'0'},'13'));
});
