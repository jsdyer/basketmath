import {UNITS,sample,newOption,validateState,calculate,validateGoal,money,formatDecimal,amountIn,compare} from './model.mjs';
const $=id=>document.getElementById(id),KEY='coolcode:basketmath:comparison';
function startingComparison() {
  const state = sample();
  const preset = document.getElementById('case-inputs');
  if (preset) {
    const inputs = JSON.parse(preset.textContent);
    Object.assign(state.goal, inputs.goal);
    state.options = inputs.options.map((row, i) => ({...newOption(i + 1), ...row}));
  }
  return state;
}
let state = startingComparison();
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const units=()=>Object.entries(UNITS).map(([value,u])=>[value,u.label]);
function options(select,list,value){for(const [v,label] of list){const o=el('option',label);o.value=v;select.append(o);}select.value=value;}
options($('need-unit'),units(),state.goal.unit);
function changed(){ $('sample-notice').hidden=true; renderResults(); }
for(const [id,key] of [['need-quantity','quantity'],['need-unit','unit'],['tax','tax'],['tax-basis','taxBasis']]){
  $(id).addEventListener('input',()=>{state.goal[key]=$(id).value;changed();});
}
for(const [id,key] of [['extra','allowExtra'],['take-free','takeFree']])$(id).addEventListener('change',()=>{state.goal[key]=$(id).checked;changed();});
function field(row,key,label,list=null,wide=false){
  const wrap=el('label',label,wide?'field-wide':'');const input=el(list?'select':'input');input.dataset.field=key;
  if(list)options(input,list,row[key]);else{input.value=row[key];input.type='text';input.maxLength=key==='name'?160:24;input.inputMode=key==='name'?'text':'decimal';input.autocomplete='off';}
  input.addEventListener('input',()=>{row[key]=input.value;changed();});wrap.append(input);return wrap;
}
function renderOptions(){
  const container=$('options');container.replaceChildren();
  state.options.forEach((row,i)=>{
    const card=el('article',undefined,'option-card');card.dataset.option=String(i);
    const head=el('div',undefined,'option-title');head.append(el('h3','Option '+(i+1)));
    const remove=el('button','Remove');remove.type='button';remove.disabled=state.options.length===1;remove.setAttribute('aria-label','Remove option '+(i+1));
    remove.addEventListener('click',()=>{state.options.splice(i,1);renderOptions();changed();});head.append(remove);card.append(head);
    const fields=el('div',undefined,'fields');
    fields.append(field(row,'name','Option name',null,true),field(row,'price','Regular price per retail pack'),field(row,'inner','Inner units per retail pack'));
    fields.append(field(row,'quantity','Content in each inner unit'),field(row,'unit','Content unit',units()));
    fields.append(field(row,'deal','Promotion',[
      ['regular','Regular price'],['bundle','X packs for a total'],['threshold','Each when buying X or more'],['bogo','Buy X, get Y free']
    ],true));card.append(fields);
    const promo=el('div',undefined,'promotion'),promoFields=el('div',undefined,'fields');
    const groupField=field(row,'dealCount','Packs to qualify'),priceField=field(row,'dealPrice','Offer amount');
    const buyField=field(row,'buy','Packs to pay for'),freeField=field(row,'free','Free packs');
    promoFields.append(groupField,priceField,buyField,freeField);promo.append(promoFields);
    const promoNote=el('p','', 'promotion-note');promo.append(promoNote);card.append(promo);
    const coupon=el('details');coupon.open=row.couponScope!=='none';coupon.append(el('summary','Coupon'));
    const cf=el('div',undefined,'fields'),cs=field(row,'couponScope','Apply coupon', [['none','No coupon'],['pack','For each paid pack'],['order','Once per purchase']]),ca=field(row,'coupon','Coupon amount');
    cf.append(cs,ca);coupon.append(cf,el('p','Assumes the coupon can be combined with this offer. Amounts cannot reduce prices below zero.','hint'));card.append(coupon);
    const warning=el('p','','error');warning.id='option-error-'+i;warning.setAttribute('role','status');card.append(warning);
    const updateVisibility=()=>{
      promo.hidden=row.deal==='regular';groupField.hidden=priceField.hidden=!['bundle','threshold'].includes(row.deal);buyField.hidden=freeField.hidden=row.deal!=='bogo';
      priceField.firstChild.textContent=row.deal==='bundle'?'Total price for the bundle':'Price per qualifying pack';
      groupField.firstChild.textContent=row.deal==='bundle'?'Packs per complete bundle':'Minimum packs to qualify';
      promoNote.textContent=row.deal==='bundle'?'Only complete bundles receive this total; remaining packs use the regular price.':row.deal==='threshold'?'Every pack receives this per-pack price once the minimum count is met.':'All packs have the same size and regular price. Free packs must be added to the cart.';
      ca.hidden=row.couponScope==='none';
    };
    fields.querySelector('[data-field="deal"]').addEventListener('input',updateVisibility);cs.querySelector('select').addEventListener('input',updateVisibility);updateVisibility();container.append(card);
  });
  $('add').disabled=state.options.length>=100;
}
function quantityText(base,unit){return formatDecimal(amountIn(base,unit),6)+' '+UNITS[unit].label;}
function renderResults(){
  const container=$('results');container.replaceChildren();$('goal-error').textContent='';
  let goalError='';try{validateGoal(state.goal);}catch(e){goalError=e.message;$('goal-error').textContent=goalError;}
  const results=state.options.map((row,i)=>{const warn=$('option-error-'+i);warn.textContent='';if(goalError)return null;try{return {row,index:i,value:calculate(row,state.goal)};}catch(e){warn.textContent=e.message;return null;}}).filter(Boolean);
  $('result-count').textContent=results.length+' of '+state.options.length+' options ready';
  if(!results.length){container.append(el('p',goalError?'Correct the target settings above to calculate.':'Enter a price, size and matching unit for at least one option.','empty'));return;}
  const cheapest=results.reduce((a,b)=>a.value.total<=b.value.total?a:b).value.total;
  const lowestRate=results.reduce((a,b)=>compare(a.value.unitCost,b.value.unitCost)<=0?a:b).value.unitCost;
  const grid=el('div',undefined,'results-grid');
  for(const {row,index,value:v} of results){
    const winner=v.total===cheapest,card=el('article',undefined,'result'+(winner?' winner':''));card.dataset.result=String(index);
    card.append(el('h3',row.name.trim()||'Option '+(index+1)));
    const badges=el('div',undefined,'badges');if(results.length>1&&winner)badges.append(el('span','Lowest checkout','badge'));if(results.length>1&&compare(v.unitCost,lowestRate)===0)badges.append(el('span','Lowest unit price','badge'));card.append(badges);
    const total=el('div',money(v.total),'total');total.append(el('small','checkout estimate'));card.append(total);
    card.append(el('p','$'+formatDecimal(v.unitCost,4,2)+' / '+v.benchmarkLabel+' purchased','rate'));
    const dl=el('dl',undefined,'breakdown');
    const rows=[['Retail packs to take',v.count.toString()],['Quantity purchased',quantityText(v.purchased,state.goal.unit)],['Extra beyond your need',quantityText(v.extra,state.goal.unit)],['Promotion subtotal',money(v.subtotal)],['Coupon savings',money(v.discount)],['Estimated tax',money(v.tax)]];
    for(const [label,value] of rows)dl.append(el('dt',label),el('dd',value));card.append(dl);
    if(v.extraToSave>0n)card.append(el('p','Includes '+v.extraToSave+' extra retail pack'+(v.extraToSave===1n?'':'s')+' because the qualifying offer lowers your checkout total.','result-note'));
    if(v.freeIncluded>0n)card.append(el('p','Includes '+v.freeIncluded+' additional free pack'+(v.freeIncluded===1n?'':'s')+' at the same total. Remember to take them.','result-note'));
    if(v.samePriceExtra>0n)card.append(el('p',v.samePriceExtra+' more free pack'+(v.samePriceExtra===1n?' is':'s are')+' available at the same total. Turn on “Include additional free BOGO packs” to count them in quantity and unit price.','result-note'));
    if(v.free>0n)card.append(el('p',v.paid+' paid + '+v.free+' free retail packs.','hint'));
    grid.append(card);
  }container.append(grid);
}
function render(){
  for(const [id,key] of [['need-quantity','quantity'],['need-unit','unit'],['tax','tax'],['tax-basis','taxBasis']])$(id).value=state.goal[key];
  $('extra').checked=state.goal.allowExtra;$('take-free').checked=state.goal.takeFree;renderOptions();renderResults();
}
function status(message){$('storage-status').textContent=message;}
$('add').addEventListener('click',()=>{if(state.options.length>=100)return;const row=newOption(state.options.length+1);row.unit=state.goal.unit;state.options.push(row);renderOptions();changed();$('options').lastElementChild.querySelector('input').focus();});
$('sample').addEventListener('click',()=>{state=startingComparison();$('sample-notice').hidden=false;render();status('Loaded invented example prices. Your saved comparison was not changed.');});
$('blank').addEventListener('click',()=>{state={version:1,goal:{quantity:'1',unit:'kg',tax:'0',taxBasis:'after',allowExtra:true,takeFree:true},options:[newOption(1),newOption(2)]};$('sample-notice').hidden=true;render();status('Started an empty comparison. Your saved comparison was not changed.');});
$('save').addEventListener('click',()=>{try{localStorage.setItem(KEY,JSON.stringify(state));status('Saved on this device. Later edits are not saved until you select Save again.');}catch{status('Browser storage is unavailable. Export a JSON file instead.');}});
$('load').addEventListener('click',()=>{try{const saved=localStorage.getItem(KEY);if(!saved)return status('No comparison saved in this browser.');state=validateState(JSON.parse(saved));$('sample-notice').hidden=true;render();status('Loaded the saved comparison.');}catch(e){status('Could not load: '+e.message);}});
$('forget').addEventListener('click',()=>{try{localStorage.removeItem(KEY);status('Removed the saved comparison from this browser. The current page is unchanged.');}catch{status('Browser storage is unavailable.');}});
$('export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)+'\n'],{type:'application/json'}));const link=el('a');link.href=url;link.download='basketmath-comparison.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Exported your inputs. Reopen them with Import JSON.');});
$('import').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>512000)throw Error('File is over 500 KiB.');const next=validateState(JSON.parse(await file.text()));state=next;$('sample-notice').hidden=true;render();status('Imported '+state.options.length+' options. Nothing was saved in browser storage.');}catch(e){status('Import failed: '+e.message+' Your current comparison is unchanged.');}finally{event.target.value='';}});
render();
