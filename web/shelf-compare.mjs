import {compare, formatDecimal, shelfUnitPrice, UNITS} from './model.mjs';

const bases = {
  mass: {label: '100 g', units: ['g', 'kg', 'oz', 'lb']},
  volume: {label: 'litre', units: ['mL', 'L']},
  sheets: {label: 'sheet', units: ['each']},
};
const form = document.querySelector('#shelf-compare');
const basis = document.querySelector('#basis');
const template = document.querySelector('#package-fields');
const packages = document.querySelector('#packages');

for (const label of ['Package A', 'Package B', 'Package C (optional)']) {
  const card = template.content.cloneNode(true);
  card.querySelector('legend').textContent = label;
  packages.append(card);
}
const cards = Array.from(packages.querySelectorAll('fieldset'));
const rowsByBasis = new Map();
let activeBasis;

function showBasis() {
  if (activeBasis) {
    rowsByBasis.set(activeBasis, cards.map(card => ({
      price: card.elements.price.value, size: card.elements.size.value, unit: card.elements.unit.value,
    })));
  }
  activeBasis = basis.value;
  const saved = rowsByBasis.get(activeBasis);
  for (const [i, card] of cards.entries()) {
    const {size, price, unit} = card.elements;
    unit.replaceChildren(...bases[activeBasis].units.map(key => new Option(key === 'each' ? 'sheets' : UNITS[key].label, key)));
    unit.value = saved?.[i].unit ?? bases[activeBasis].units[0];
    size.value = saved?.[i].size ?? '';
    price.value = saved?.[i].price ?? '';
    size.inputMode = activeBasis === 'sheets' ? 'numeric' : 'decimal';
  }
  refresh();
}

function refresh() {
  const amounts = [];
  let unfinished = false;
  for (const [i, card] of cards.entries()) {
    const {price, size, unit} = card.elements;
    const output = card.querySelector('output');
    output.textContent = '';
    if (!price.value.trim() && !size.value.trim()) continue;
    if (!price.value.trim() || !size.value.trim()) {
      output.textContent = 'Enter both a price and a size.';
      unfinished = true;
      continue;
    }
    try {
      const rate = shelfUnitPrice(price.value, size.value, unit.value);
      output.textContent = '$' + formatDecimal(rate, 6, 2) + ' per ' + bases[activeBasis].label;
      amounts.push({label: 'Package ' + ['A', 'B', 'C'][i], rate});
    } catch (error) {
      output.textContent = error.message;
      unfinished = true;
    }
  }
  let verdict = 'Enter two packages to compare.';
  if (unfinished) {
    verdict = 'Complete or clear the unfinished package to compare prices.';
  } else if (amounts.length >= 2) {
    const lowest = amounts.reduce((best, item) => compare(item.rate, best) < 0 ? item.rate : best, amounts[0].rate);
    const winners = amounts.filter(item => compare(item.rate, lowest) === 0).map(item => item.label);
    verdict = winners.length === 1 ? winners[0] + ' has the lowest unit price.'
      : new Intl.ListFormat('en-CA').format(winners) + ' tie for the lowest unit price.';
  }
  document.querySelector('#verdict').textContent = verdict;
}

basis.addEventListener('change', showBasis);
packages.addEventListener('input', refresh);
form.addEventListener('submit', event => event.preventDefault());
showBasis();
form.hidden = false;
