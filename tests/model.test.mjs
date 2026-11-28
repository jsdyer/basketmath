import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,compare,decimal,rational,quantity,amountIn,cents,money,formatDecimal,validateState,sample,shelfUnitPrice} from '../web/model.mjs';
const goal=(extra={})=>({quantity:'1',unit:'kg',tax:'0',taxBasis:'after',allowExtra:true,takeFree:true,...extra});
const option=(extra={})=>({id:'x',name:'Item',price:'3.49',quantity:'500',unit:'g',inner:'1',deal:'regular',dealCount:'2',dealPrice:'',buy:'1',free:'1',coupon:'0',couponScope:'none',...extra});
test('whole retail packs satisfy the target and preserve exact surplus',()=>{
 const x=calculate(option({quantity:'750'}),goal());assert.equal(x.count,2n);assert.deepEqual(x.purchased,rational(1500n));assert.deepEqual(x.extra,rational(500n));assert.equal(x.total,698n);
});
test('money preserves cent precision and rounds tax half-up only once',()=>{
 assert.equal(cents('0.29'),29n);assert.equal(money(123456789123456789n),'$1,234,567,891,234,567.89');
 const x=calculate(option({price:'0.10'}),goal({quantity:'500',unit:'g',tax:'5'}));assert.equal(x.tax,1n);assert.equal(x.total,11n);
});
test('equivalent metric and exact avoirdupois quantities match',()=>{
 assert.deepEqual(quantity('16','oz'),quantity('1','lb'));
 assert.deepEqual(quantity('453.59237','g'),quantity('1','lb'));
 assert.deepEqual(quantity('1000','mL'),quantity('1','L'));
});
test('fractional package content is not rounded before counting packs',()=>{
 const x=calculate(option({price:'1',quantity:'0.1',unit:'g'}),goal({quantity:'0.3',unit:'g'}));assert.equal(x.count,3n);assert.deepEqual(x.extra,rational(0n));
});
test('multipack counts are retail packs, including partial target surplus',()=>{
 const x=calculate(option({quantity:'355',unit:'mL',inner:'6',price:'4.99'}),goal({quantity:'3',unit:'L'}));assert.equal(x.count,2n);assert.equal(x.total,998n);assert.deepEqual(x.purchased,rational(4260n));assert.equal(formatDecimal(amountIn(x.extra,'L')), '1.26');
});
test('bundle leftovers pay regular price and complete groups pay bundle total',()=>{
 const x=calculate(option({quantity:'1',unit:'each',price:'3',deal:'bundle',dealCount:'2',dealPrice:'5'}),goal({quantity:'3',unit:'each',allowExtra:false}));assert.equal(x.count,3n);assert.equal(x.subtotal,800n);
});
test('cheaper extra bundle is considered, and disabling it preserves minimum packs',()=>{
 const o=option({quantity:'1',unit:'each',price:'3',deal:'bundle',dealCount:'3',dealPrice:'5'});
 const x=calculate(o,goal({quantity:'2',unit:'each'}));assert.equal(x.count,3n);assert.equal(x.total,500n);assert.equal(x.extraToSave,1n);
 assert.equal(calculate(o,goal({quantity:'2',unit:'each',allowExtra:false})).total,600n);
});
test('threshold price applies to every qualifying pack, never a partial qualifying count',()=>{
 const o=option({quantity:'1',unit:'each',price:'4',deal:'threshold',dealCount:'3',dealPrice:'2'});
 assert.equal(calculate(o,goal({quantity:'2',unit:'each',allowExtra:false})).total,800n);
 const x=calculate(o,goal({quantity:'2',unit:'each'}));assert.equal(x.count,3n);assert.equal(x.total,600n);
 assert.equal(calculate(o,goal({quantity:'4',unit:'each'})).total,800n);
});
test('BOGO includes free packs by default and offers a minimum-quantity alternative',()=>{
 const o=option({quantity:'1',unit:'each',price:'4',deal:'bogo'});
 const x=calculate(o,goal({quantity:'1',unit:'each'}));assert.equal(x.count,2n);assert.equal(x.freeIncluded,1n);assert.equal(x.free,1n);assert.equal(x.total,400n);assert.deepEqual(x.unitCost,rational(2n));
 const y=calculate(o,goal({quantity:'1',unit:'each',takeFree:false}));assert.equal(y.count,1n);assert.equal(y.samePriceExtra,1n);assert.deepEqual(y.unitCost,rational(4n));
});
test('buy two get one handles incomplete groups and repeated groups',()=>{
 const o=option({quantity:'1',unit:'each',price:'3',deal:'bogo',buy:'2',free:'1'});
 const x=calculate(o,goal({quantity:'4',unit:'each'}));assert.equal(x.count,4n);assert.equal(x.paid,3n);assert.equal(x.free,1n);assert.equal(x.total,900n);
 const y=calculate(o,goal({quantity:'5',unit:'each'}));assert.equal(y.count,6n);assert.equal(y.paid,4n);assert.equal(y.total,1200n);
});
test('per-pack coupons apply to paid packs and do not create a credit',()=>{
 const x=calculate(option({quantity:'1',unit:'each',price:'3',deal:'bogo',couponScope:'pack',coupon:'1'}),goal({quantity:'2',unit:'each'}));assert.equal(x.discount,100n);assert.equal(x.total,200n);
 assert.equal(calculate(option({couponScope:'pack',coupon:'99'}),goal()).total,0n);
});
test('unused coupon value cannot move from remainder packs into a bundle',()=>{
 const o=option({quantity:'1',unit:'each',price:'1',deal:'bundle',dealCount:'3',dealPrice:'7',couponScope:'pack',coupon:'2'});
 const x=calculate(o,goal({quantity:'3',unit:'each'}));assert.equal(x.count,3n);assert.equal(x.total,100n);
 assert.equal(calculate(o,goal({quantity:'4',unit:'each'})).total,100n);
});
test('purchase coupon applies once and taxes can use either disclosed basis',()=>{
 const o=option({price:'5',couponScope:'order',coupon:'3'});
 const x=calculate(o,goal({tax:'5'}));assert.equal(x.subtotal,1000n);assert.equal(x.discount,300n);assert.equal(x.tax,35n);assert.equal(x.total,735n);
 const y=calculate(o,goal({tax:'5',taxBasis:'before'}));assert.equal(y.tax,50n);assert.equal(y.total,750n);
});
test('no coupon ignores an inactive empty amount',()=>assert.equal(calculate(option({coupon:''}),goal()).total,698n));
test('free prices remain legitimate and zero quantity does not',()=>{
 assert.equal(calculate(option({price:'0'}),goal()).total,0n);
 assert.throws(()=>calculate(option({quantity:'0'}),goal()),/greater than zero/);
});
test('weight, volume and indivisible item counts remain separate',()=>{
 assert.throws(()=>calculate(option({unit:'mL'}),goal()),/cannot be compared/);
 assert.throws(()=>calculate(option({quantity:'0.5',unit:'each'}),goal({unit:'each'})),/whole number/);
});
test('invalid or oversized inputs fail instead of returning old results',()=>{
 for(const value of ['-1','NaN','Infinity','1e6','1,00',''])assert.throws(()=>cents(value));
 assert.throws(()=>cents('1.001'));
 assert.throws(()=>calculate(option(),goal({tax:'101'})),/between/);
 assert.throws(()=>calculate(option({quantity:'0.000001'}),goal({quantity:'1000000000'})),/1,000,000/);
 assert.throws(()=>calculate(option({deal:'bogo',buy:'0'}),goal()),/whole number/);
});
test('ranking compares exact rational unit costs, not displayed rounding',()=>{
 assert.equal(compare(decimal('0.12341'),decimal('0.12342')),-1);
 const x=calculate(option({price:'0.01',quantity:'10000000'}),goal());assert.equal(formatDecimal(x.unitCost,4,2),'0.00');assert.ok(x.unitCost.n>0n);
});
test('saved comparisons round-trip and accept more than the starter options',()=>{
 const s=sample();s.options.push(option({name:'Third choice'}));const restored=validateState(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.options.length,3);assert.equal(restored.options[2].name,'Third choice');assert.deepEqual(restored.goal,s.goal);
 assert.throws(()=>validateState({version:1,goal:s.goal,options:[]}));assert.throws(()=>validateState({...s,options:[{name:'missing fields'}]}));
 assert.equal(validateState({...s,options:[option({name:'<img src=x onerror=alert(1)>'})]}).options[0].name,'<img src=x onerror=alert(1)>');
});

test('coupon-funded extra paid packs are never labelled BOGO freebies',()=>{
 const o=option({quantity:'1',unit:'each',price:'1',deal:'bogo',buy:'2',free:'2',couponScope:'order',coupon:'2'});
 const x=calculate(o,goal({quantity:'1',unit:'each'}));assert.equal(x.count,1n);assert.equal(x.freeIncluded,0n);assert.equal(x.samePriceExtra,0n);assert.equal(x.total,0n);
});

test('shelf prices use exact rates per 100 g, litre or individual sheet', () => {
  assert.deepEqual(shelfUnitPrice('4.50','750','g'), shelfUnitPrice('6.00','1','kg'));
  assert.deepEqual(shelfUnitPrice('1.50','500','mL'), rational(3n));
  assert.deepEqual(shelfUnitPrice('4.50','1.5','L'), rational(3n));
  assert.deepEqual(shelfUnitPrice('3.00','480','each'), rational(1n,160n));
  assert.deepEqual(shelfUnitPrice('0','40','each'), rational(0n));
  assert.throws(() => shelfUnitPrice('3.00','0','L'), /greater than zero/);
  assert.throws(() => shelfUnitPrice('3.00','1.5','each'), /whole number/);
});
