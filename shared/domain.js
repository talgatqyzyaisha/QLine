/** Shared validation. Authorization and transactional invariants are enforced in PostgreSQL. */
export class AppError extends Error {
  constructor(code,status=400){
    super(code);
    this.code=code;
    this.status=status;
  }
}
export const fail=(code,status)=>{
  throw new AppError(code,status);
};
export function phone(value){
  const digits=String(value||'').replace(/\D/g,'');
  const n=digits.startsWith('8')?'7'+digits.slice(1):digits;
  return /^7\d{10}$/.test(n)?'+'+n:null;
}
export function bookingInput(value){
  if(!value||!value.slot_id||!value.idempotency_key||!String(value.name||'').trim()||String(value.name).length>100||!phone(value.phone)||value.consent!==true||String(value.comment||'').length>500)fail('INVALID',422);
  return {
    ...value,name:value.name.trim(),phone:phone(value.phone),comment:String(value.comment||'')
  };
}
export const transitionAllowed=(a,b)=>({
  pending:['confirmed','cancelled'],confirmed:['cancelled','completed','no_show'],cancelled:[],completed:[],no_show:[]
})[a]?.includes(b)||false;
export const overlaps=(a,b)=>new Date(a.starts_at)<new Date(b.ends_at)&&new Date(b.starts_at)<new Date(a.ends_at);
export const active=a=>['pending','confirmed'].includes(a.status);
export const staff=(user,clinic)=>user&&user.clinic_id===clinic&&['owner','administrator'].includes(user.role);

export const normalizeEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
export const emailValid = value => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const passwordValid = value => typeof value === 'string' && value.length >= 12 && value.length <= 128;
export function safeReturn(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/my-appointments';
  const result = new URL(value, 'https://qline.invalid');
  return result.origin === 'https://qline.invalid' ? result.pathname + result.search : '/my-appointments';
}
