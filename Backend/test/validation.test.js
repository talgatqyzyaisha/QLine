import test from 'node:test';
import assert from 'node:assert/strict';
import {phone,bookingInput} from '../../shared/domain.js';

test('contact numbers normalize Kazakhstan +7 and 8 formats',()=>{
 assert.equal(phone('8 (700) 123-45-67'),'+77001234567');assert.equal(phone('+7 700 123 45 67'),'+77001234567');assert.equal(phone('+1 700 123 45 67'),null);assert.equal(phone('7700'),null);
});
test('server booking validation rejects missing consent and excess medical-comment input',()=>{
 const valid={slot_id:crypto.randomUUID(),name:' Synthetic ',phone:'87001234567',comment:'',consent:true,idempotency_key:crypto.randomUUID()};
 assert.equal(bookingInput(valid).name,'Synthetic');assert.equal(bookingInput(valid).phone,'+77001234567');
 for(const change of [{consent:false},{name:''},{phone:'123'},{comment:'x'.repeat(501)},{slot_id:null},{idempotency_key:null}])assert.throws(()=>bookingInput({...valid,...change}),e=>e.code==='INVALID');
});
