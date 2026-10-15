import {
  L,errors
}
from './i18n.js';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}
[c]));
const paths={
  search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',arrow:'M4 12h16m-6-6 6 6-6 6',chevron:'m9 5 7 7-7 7',calendar:'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM7 14h3m4 0h3m-10 4h3',check:'m5 12 4 4L19 6',clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',tooth:'M12 5c-3-3-8-3-8 3 0 3 2 5 2 9 0 5 3 5 4 0l2-4 2 4c1 5 4 5 4 0 0-4 2-6 2-9 0-6-5-6-8-3Z',sparkles:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Zm8 0v4m-2-2h4',sun:'M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0ZM12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',align:'M3 6h18M3 18h18M5 9v6m7-6v6m7-6v6M2 12h20',implant:'M8 3h8l2 5H6l2-5Zm0 8 8 2m-8 2 8 2m-7 2 6 2M9 8v12l3 3 3-3V8',shield:'M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6L12 2Zm-5 10 3 3 7-7',smile:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM8 9h.01M16 9h.01M7 14s2 4 5 4 5-4 5-4',chat:'M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4ZM8 10h8m-8 4h5',user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 22v-3a8 8 0 0 1 16 0v3',building:'M4 22V5h16v17M2 22h20M8 9h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2M10 22v-3h4v3',grid:'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',chart:'M4 3v18h18M8 17v-5m5 5V7m5 10V4',settings:'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM10 2h4l1 3 3 1 3 2v4l-3 1-1 3-2 5h-4l-1-3-3-1-4-2v-4l3-1 1-3 3-1 1-4',bell:'M5 17h14l-2-4V8a5 5 0 0 0-10 0v5l-2 4Zm5 4h4',close:'m6 6 12 12M6 18 18 6',menu:'M3 6h18M3 12h18M3 18h18',filter:'M3 5h18M6 12h12M9 19h6',logout:'M10 3H4v18h6m4-15 6 6-6 6m-6-6h12',heart:'M12 21S2 15 2 8a5 5 0 0 1 10-2A5 5 0 0 1 22 8c0 7-10 13-10 13Z',info:'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'
};
export const icon=(name,cls='')=>`<svg class="icon ${cls}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.tooth}"/></svg>`;
export const logo=()=>`<a href="/" class="logo" aria-label="QLine"><svg width="36" height="36" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="currentColor"/><circle cx="18" cy="18" r="9" stroke="white" stroke-width="3.5" fill="none"/><path d="m23 24 5 6h7" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round"/></svg><span>QLine<span class="logo-dot">.</span></span></a>`;
export const field=(id,label,{
  type='text',value='',options,placeholder='',required=false,min='',max='',autocomplete='',help=''
}
={
})=>`<div class="field"><label for="${id}">${label}${required?' <span aria-hidden="true">*</span>':''}</label>${options?`<select id="${id}" name="${id}" ${required?'required':''}>${options.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`).join('')}</select>`:type==='textarea'?`<textarea class="resize-none" id="${id}" name="${id}" rows="3" maxlength="500" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`:`<input id="${id}" name="${id}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required?'required':''} ${min?`min="${esc(min)}"`:''} ${max?`max="${esc(max)}"`:''} ${autocomplete?`autocomplete="${autocomplete}"`:''} aria-describedby="${id}-error" ${type==='tel'?'inputmode="tel" maxlength="20"':''}>`}<small>${help}</small><span class="field-error" id="${id}-error"></span></div>`;
export function formError(form,id,message){
  const el=form.querySelector(`#${id}`);
  if(el){
    el.setAttribute('aria-invalid','true');
    el.setAttribute('aria-describedby',`${id}-error`);
    form.querySelector(`#${id}-error`).textContent=message;
    el.focus();
  }
}
export function clearErrors(form){
  form.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));
  form.querySelectorAll('.field-error,.form-error').forEach(e=>e.textContent='');
}
let toastTimer;
export function toast(message){
  const el=document.querySelector('#toast');
  el.textContent=message;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('visible'),4500);
}
export const errorText=e=>(errors[e.code]||errors.SERVER)();
export const errorView=e=>`<div class="empty" role="alert">${icon('info')}<h2>${L('Не удалось загрузить данные','Деректер жүктелмеді')}</h2><p>${errorText(e)}</p>${e.code==='UNAUTHORIZED'?`<a class="btn primary" href="/login?return=${encodeURIComponent(location.pathname+location.search)}">${L('Войти','Кіру')}</a>`:''}<button class="btn primary" data-action="retry">${L('Повторить','Қайталау')}</button></div>`;
export function ask(title,description,action){
  const dialog=document.querySelector('#dialog');
  dialog.innerHTML=`<div class="dialog-body"><h2 id="dialog-title">${esc(title)}</h2><p>${esc(description)}</p><div class="actions"><button class="btn" data-cancel autofocus>${L('Назад','Артқа')}</button><button class="btn danger" data-accept>${esc(action)}</button></div></div>`;
  dialog.showModal();
  return new Promise(resolve=>{
    const cancel=()=>{
      dialog.close();resolve(false);
    };dialog.querySelector('[data-cancel]').onclick=cancel;dialog.oncancel=()=>resolve(false);dialog.querySelector('[data-accept]').onclick=()=>{
      dialog.close();resolve(true);
    };
  });
}
export const skeleton=()=>`<div class="container section" aria-busy="true" aria-label="${L('Загрузка','Жүктелуде')}"><div class="skeleton sk-title"></div><div class="cards">${Array(3).fill('<div class="skeleton sk-card"></div>').join('')}</div></div>`;

/** Shared table markup. On phones each row reflows into a labelled card.
 * Cell values are trusted application templates; escape user data at the caller.
 */
export function dataTable(label, columns, rows, emptyMessage) {
  const head = columns.map(column => `<th scope="col" role="columnheader">${esc(column)}</th>`).join('');
  const body = rows.length
    ? rows.map(row => `<tr role="row">${row.map((value, index) => `<td role="cell"><span class="cell-label" aria-hidden="true">${esc(columns[index])}</span><div class="cell-value">${value}</div></td>`).join('')}</tr>`).join('')
    : `<tr role="row"><td role="cell" colspan="${columns.length}" class="text-center muted">${esc(emptyMessage)}</td></tr>`;
  return `<div class="table-wrap" role="region" tabindex="0" aria-label="${esc(label)}"><table role="table" aria-label="${esc(label)}"><thead role="rowgroup"><tr role="row">${head}</tr></thead><tbody role="rowgroup">${body}</tbody></table></div>`;
}
