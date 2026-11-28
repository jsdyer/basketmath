// Decimal inputs, currency and unit conversions stay rational until display.
const gcd = (a,b) => b ? gcd(b,a%b) : a;
export function rational(n,d=1n) {
  n=BigInt(n); d=BigInt(d); if(d<=0n) throw Error('Invalid denominator');
  const g=gcd(n<0n?-n:n,d); return {n:n/g,d:d/g};
}
const add=(a,b)=>rational(a.n*b.d+b.n*a.d,a.d*b.d);
const mul=(a,b)=>rational(a.n*b.n,a.d*b.d);
const div=(a,b)=>{if(b.n<=0n)throw Error('Division requires a positive quantity');return rational(a.n*b.d,a.d*b.n);};
export const compare=(a,b)=>a.n*b.d < b.n*a.d ? -1 : a.n*b.d > b.n*a.d ? 1 : 0;
const ceil=a=>(a.n+a.d-1n)/a.d;
const round=a=>(a.n*2n+a.d)/(a.d*2n);
export function decimal(value,label='Number',places=6) {
  const s=String(value??'').trim();
  if(!new RegExp('^\\d{1,10}(?:\\.\\d{1,'+places+'})?$').test(s)) throw Error(label+' needs a nonnegative number using a decimal point (up to '+places+' decimal places).');
  const [whole,fraction='']=s.split('.');return rational(BigInt(whole+fraction),10n**BigInt(fraction.length));
}
export function cents(value,label='Price') { const a=decimal(value,label,2);return a.n*100n/a.d; }
export function integer(value,label,max=1000000) {
  if(!/^\d+$/.test(String(value))||BigInt(value)<1n||BigInt(value)>BigInt(max))throw Error(label+' must be a whole number from 1 to '+max+'.');
  return BigInt(value);
}
export function formatDecimal(a,places=3,minimum=0) {
  const scaled=round(mul(a,rational(10n**BigInt(places))));
  const whole=scaled/(10n**BigInt(places));let fraction=(scaled%(10n**BigInt(places))).toString().padStart(places,'0');
  while(fraction.length>minimum&&fraction.endsWith('0'))fraction=fraction.slice(0,-1);
  return whole.toLocaleString('en-CA')+(fraction?'.'+fraction:'');
}
export const money=value=>'$'+formatDecimal(rational(value,100n),2,2);
export const UNITS={
  g:{label:'g',kind:'mass',factor:rational(1n)},kg:{label:'kg',kind:'mass',factor:rational(1000n)},
  oz:{label:'oz (weight)',kind:'mass',factor:decimal('28.349523125','Unit',12)},
  lb:{label:'lb',kind:'mass',factor:decimal('453.59237','Unit',12)},
  mL:{label:'mL',kind:'volume',factor:rational(1n)},L:{label:'L',kind:'volume',factor:rational(1000n)},
  each:{label:'items',kind:'count',factor:rational(1n)}
};
export function quantity(value,unit,label='Quantity') {
  if(!UNITS[unit])throw Error('Choose a supported unit.');
  const a=decimal(value,label);if(a.n===0n)throw Error(label+' must be greater than zero.');
  if(unit==='each'&&a.d!==1n)throw Error(label+' in items must be a whole number.');
  return mul(a,UNITS[unit].factor);
}
// Shelf rates use the full package price and quantity, before promotions or whole-pack targets.
export function shelfUnitPrice(price, size, unit) {
  const contents = quantity(size, unit, 'Package size');
  const basis = {mass: 100n, volume: 1000n, count: 1n}[UNITS[unit].kind];
  return div(rational(cents(price) * basis, 100n), contents);
}
export function amountIn(base,unit){return div(base,UNITS[unit].factor);}
export function validateGoal(goal) {
  const required=quantity(goal.quantity,goal.unit,'Amount needed');
  const rate=decimal(goal.tax,'Estimated tax rate',3);
  if(compare(rate,rational(100n))>0)throw Error('Tax rate must be between 0 and 100%.');
  if(!['after','before'].includes(goal.taxBasis))throw Error('Choose a tax basis.');
  return {required,rate,unit:goal.unit,kind:UNITS[goal.unit].kind,taxBasis:goal.taxBasis,allowExtra:goal.allowExtra===true,takeFree:goal.takeFree===true};
}
function dealConfig(option) {
  const price=cents(option.price),coupon=option.couponScope==='none'?0n:cents(option.coupon,'Coupon amount');
  if(!['none','pack','order'].includes(option.couponScope))throw Error('Choose a coupon scope.');
  if(!['regular','bundle','threshold','bogo'].includes(option.deal))throw Error('Choose a promotion.');
  let size=1n,buy=1n,free=0n,promo=0n;
  if(option.deal==='bundle') {size=integer(option.dealCount,'Packs per bundle',1000);promo=cents(option.dealPrice,'Bundle price');}
  if(option.deal==='threshold') {size=integer(option.dealCount,'Qualifying pack count',1000);promo=cents(option.dealPrice,'Qualifying price per pack');}
  if(option.deal==='bogo') {buy=integer(option.buy,'Packs to pay for',1000);free=integer(option.free,'Free packs',1000);size=buy+free;}
  return {price,coupon,scope:option.couponScope,deal:option.deal,size,buy,free,promo};
}
function checkout(count,cfg,goal) {
  let subtotal=count*cfg.price,paid=count;
  if(cfg.deal==='bundle')subtotal=count/cfg.size*cfg.promo+count%cfg.size*cfg.price;
  if(cfg.deal==='threshold'&&count>=cfg.size)subtotal=count*cfg.promo;
  if(cfg.deal==='bogo'){paid=count/cfg.size*cfg.buy+(count%cfg.size<cfg.buy?count%cfg.size:cfg.buy);subtotal=paid*cfg.price;}
  const capped=(a,b)=>a<b?a:b;
  let discount=0n;
  if(cfg.scope==='order')discount=capped(cfg.coupon,subtotal);
  if(cfg.scope==='pack'){
    if(cfg.deal==='bundle')discount=count/cfg.size*capped(cfg.coupon*cfg.size,cfg.promo)+count%cfg.size*capped(cfg.coupon,cfg.price);
    else discount=paid*capped(cfg.coupon,cfg.deal==='threshold'&&count>=cfg.size?cfg.promo:cfg.price);
  }
  const after=subtotal-discount;
  const tax=round(mul(rational(goal.taxBasis==='after'?after:subtotal),div(goal.rate,rational(100n))));
  return {subtotal,discount,tax,total:after+tax,paid,free:count-paid};
}
export function calculate(option,settings) {
  const goal=validateGoal(settings),unit=UNITS[option.unit];
  if(!unit||unit.kind!==goal.kind)throw Error('Use '+goal.kind+' units to match the amount needed; weight, volume and items cannot be compared.');
  const content=quantity(option.quantity,option.unit,'Content in each inner unit');
  const inner=integer(option.inner,'Inner units per retail pack');
  const pack=mul(content,rational(inner));
  const minimum=ceil(div(goal.required,pack));
  if(minimum>1000000n)throw Error('This comparison needs over 1,000,000 packs. Check the quantities and units.');
  const cfg=dealConfig(option);
  let count=minimum,result=checkout(count,cfg,goal);
  // Only a bundle boundary or qualifying threshold can lower checkout total.
  const boundary=cfg.deal==='bundle'?ceil(rational(minimum,cfg.size))*cfg.size:cfg.deal==='threshold'?cfg.size:minimum;
  if(goal.allowExtra&&boundary>minimum&&boundary<=1000000n){const candidate=checkout(boundary,cfg,goal);if(candidate.total<result.total){count=boundary;result=candidate;}}
  let samePriceExtra=0n,freeIncluded=0n;
  if(cfg.deal==='bogo'){
    const next=ceil(rational(count,cfg.size))*cfg.size;
    const candidate=next<=1000000n?checkout(next,cfg,goal):null;
    if(next>count&&candidate&&candidate.total===result.total&&candidate.paid===result.paid){
      if(goal.takeFree){freeIncluded=next-count;count=next;result=checkout(count,cfg,goal);}
      else samePriceExtra=next-count;
    }
  }
  const purchased=mul(pack,rational(count)),extra=add(purchased,rational(-goal.required.n,goal.required.d));
  const benchmark=goal.kind==='count'?1n:100n;
  const unitCost=div(mul(rational(result.total,100n),rational(benchmark)),purchased);
  return {...result,count,minimum,pack,inner,purchased,extra,unitCost,samePriceExtra,freeIncluded,extraToSave:count-minimum-freeIncluded,
    benchmarkLabel:goal.kind==='mass'?'100 g':goal.kind==='volume'?'100 mL':'item',quantityUnit:goal.unit};
}
export function newOption(index=1) {
  return {id:crypto.randomUUID(),name:'Option '+index,price:'',quantity:'',unit:'g',inner:'1',deal:'regular',dealCount:'2',dealPrice:'',buy:'1',free:'1',couponScope:'none',coupon:'0'};
}
export function sample() {
  return {version:1,goal:{quantity:'1',unit:'kg',tax:'0',taxBasis:'after',allowExtra:true,takeFree:true},options:[
    {...newOption(1),name:'Sample 500 g bag',price:'3.49',quantity:'500'},
    {...newOption(2),name:'Sample 750 g bag · 2 for $8',price:'4.49',quantity:'750',deal:'bundle',dealCount:'2',dealPrice:'8.00'}
  ]};
}
export function validateState(value) {
  if(!value||value.version!==1||!value.goal||!Array.isArray(value.options)||value.options.length<1||value.options.length>100)throw Error('Choose a Basket Math v1 file with 1–100 options.');
  const fields=['name','price','quantity','unit','inner','deal','dealCount','dealPrice','buy','free','couponScope','coupon'];
  const goal={};for(const key of ['quantity','unit','tax','taxBasis']){if(typeof value.goal[key]!=='string'||value.goal[key].length>40)throw Error('Invalid saved comparison settings.');goal[key]=value.goal[key];}
  for(const key of ['allowExtra','takeFree']){if(typeof value.goal[key]!=='boolean')throw Error('Invalid extra-pack setting.');goal[key]=value.goal[key];}
  const options=value.options.map((row,i)=>{const result={id:'import-'+i};for(const key of fields){if(typeof row[key]!=='string'||row[key].length>(key==='name'?160:40))throw Error('Invalid saved option field.');result[key]=row[key];}return result;});
  return {version:1,goal,options};
}
