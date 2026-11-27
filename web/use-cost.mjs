import {cents, integer, quantity, rational, UNITS} from './model.mjs';

export const doseUnits = {mass: 'g', volume: 'mL', count: 'each'};

// The price per use is proportional to the dose. Checkout requires whole packages.
export function costForUses({price, size, unit, dose}, target) {
  const priceCents = cents(price);
  const uses = integer(target, 'Number of uses');
  const doseUnit = doseUnits[UNITS[unit]?.kind];
  if (!doseUnit) throw Error('Choose a package unit.');
  const contents = quantity(size, unit, 'Package size');
  const used = quantity(dose, doseUnit, 'Amount per use');
  const needed = used.n * uses * contents.d;
  const onePack = used.d * contents.n;
  const packs = (needed + onePack - 1n) / onePack;
  if (packs > 1000000n) throw Error('Choose a smaller target or a larger package (up to 1,000,000 packages).');
  return {
    costPerUse: rational(priceCents * used.n * contents.d, 100n * onePack),
    checkout: packs * priceCents,
    packs,
    remainder: rational(packs * contents.n * used.d - needed, contents.d * used.d),
    doseUnit,
  };
}
