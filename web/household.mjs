import {formatDecimal, money, UNITS} from './model.mjs';
import {costForUses, doseUnits} from './use-cost.mjs';

const form = document.querySelector('#use-comparison');
const use = form.dataset.use;
const unitText = unit => unit === 'each' ? 'pieces' : unit;
function refreshOption(card, target) {
  const inputs = Object.fromEntries(Array.from(card.querySelectorAll('input,select'), input => [input.name, input.value]));
  const doseUnit = doseUnits[UNITS[inputs.unit].kind];
  card.querySelector('[data-dose-unit]').textContent = unitText(doseUnit) + ' per ' + use;
  const output = card.querySelector('output');
  try {
    const {costPerUse, checkout, packs, remainder} = costForUses(inputs, target);
    const checkoutText = document.createElement('strong');
    checkoutText.textContent = money(checkout) + ' at checkout';
    const details = document.createElement('span');
    details.textContent = packs + (packs === 1n ? ' package' : ' packages') + ' · $' +
      formatDecimal(costPerUse, 4, 2) + ' per ' + use + ' · ' + formatDecimal(remainder, 4) + ' ' +
      unitText(doseUnit) + ' left after ' + target + ' ' + (target === '1' ? use : use + 's') + '.';
    output.replaceChildren(checkoutText, details);
  } catch (error) {
    output.textContent = error.message;
  }
}
function refresh() {
  for (const card of form.querySelectorAll('fieldset')) refreshOption(card, form.elements.target.value);
}
form.addEventListener('input', refresh);
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('reset', () => requestAnimationFrame(refresh));
refresh();
form.hidden = false;
