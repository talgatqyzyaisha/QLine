import {
  api
}
from './api.js';
import {
  services,localDate
}
from './data.js';
import {
  L,lang,dateLabel,timeLabel,money,statusLabel
}
from './i18n.js';
import {
  esc,icon,field,formError,clearErrors,errorText,toast
}
from './ui.js';
import {
  phone
}
from '/shared/domain.js';
import {
  serviceName,clinicAddress,doctorName,priceLabel
}
from './public.js';
export async function booking(ctx,slug){
  const c=await api('/clinics/'+encodeURIComponent(slug)),p=new URLSearchParams(location.search);
  let step=1,service=c.services.includes(p.get('service'))?p.get('service'):c.services[0],dentist=c.doctors.some(d=>d.id===p.get('dentist'))?p.get('dentist'):'',date=localDate(1),slot=null,slots=[],details={
    name:ctx.user?.name||'',phone:ctx.user?.phone||'',comment:'',consent:false
  },key=crypto.randomUUID(),pending=false;
  const summary=()=>`<aside class="panel summary"><h3>${esc(c.name)}</h3><div class="address">${icon('pin')}${esc(clinicAddress(c))}</div><div class="summary-line"><small>${L('Услуга','Қызмет')}</small><span>${esc(serviceName(service))}</span><strong>${priceLabel(c,service)}</strong></div><div class="summary-line"><small>${L('Специалист','Маман')}</small><span>${dentist?esc(doctorName(c.doctors.find(d=>d.id===dentist))):L('Любой доступный врач','Кез келген бос дәрігер')}</span></div><div class="summary-line"><small>${L('Дата и время','Күні мен уақыты')}</small><span>${slot?dateLabel(slot.starts_at)+' · '+timeLabel(slot.starts_at):L('Ещё не выбраны','Әлі таңдалмады')}</span></div></aside>`;
  const steps=()=>[L('Услуга','Қызмет'),L('Врач','Дәрігер'),L('Время','Уақыт'),L('Ваши данные','Деректеріңіз'),L('Подтверждение','Растау')].map((v,i)=>`<div role="listitem" class="stepper-item ${step===i+1?'active':step>i+1?'done':''}" ${step===i+1?'aria-current="step"':''}><b>${step>i+1?'✓':i+1}</b><span>${v}</span></div>`).join('');
  const content=()=>{
    if(step===1)return `<h2>${L('С какой услугой помочь?','Қандай қызмет қажет?')}</h2><div class="choice-list">${c.services.map(id=>`<button type="button" class="choice ${service===id?'selected':''}" data-service="${id}" aria-pressed="${service===id}"><span>${esc(serviceName(id))}<small>${services.find(s=>s.id===id)?.duration||30} ${L('минут','минут')}</small></span><strong>${priceLabel(c,id)}</strong>${service===id?icon('check'):''}</button>`).join('')}</div>`;
    if(step===2)return `<h2>${L('Выберите специалиста','Маманды таңдаңыз')}</h2><div class="choice-list"><button type="button" class="choice ${!dentist?'selected':''}" data-dentist="" aria-pressed="${!dentist}"><span>${L('Любой доступный врач','Кез келген бос дәрігер')}<small>${L('Подберём свободное время','Бос уақытты табамыз')}</small></span>${!dentist?icon('check'):icon('user')}</button>${c.doctors.filter(d=>!d.services||d.services.includes(service)).map(d=>`<button type="button" class="choice ${dentist===d.id?'selected':''}" data-dentist="${esc(d.id)}" aria-pressed="${dentist===d.id}"><span>${esc(doctorName(d))}<small>${esc(serviceName(d.specialty))}</small></span>${dentist===d.id?icon('check'):icon('user')}</button>`).join('')}</div>`;
    if(step===3)return `<h2>${L('Когда вам удобно?','Қай уақыт ыңғайлы?')}</h2>${field('booking-date',L('Дата приёма','Қабылдау күні'),{type:'date',min:localDate(),value:date})}<p class="muted spaced"><small>${L('Время Алматы (UTC+5)','Алматы уақыты (UTC+5)')}</small></p><div class="slots">${slots.map(s=>`<button type="button" class="slot ${slot?.id===s.id?'selected':''}" data-slot="${esc(s.id)}" aria-pressed="${slot?.id===s.id}">${timeLabel(s.starts_at)}${!dentist?`<br><small>${esc(doctorName(c.doctors.find(d=>d.id===s.dentist_id)))}</small>`:''}</button>`).join('')}</div>${!slots.length?`<div class="notice">${L('На эту дату нет свободного времени. Выберите другую дату или другого врача.','Бұл күнге бос уақыт жоқ. Басқа күнді немесе дәрігерді таңдаңыз.')}</div>`:''}`;
    if(step===4)return `<h2>${L('Познакомимся?','Танысайық?')}</h2>${!ctx.user?`<div class="notice">${L('Чтобы сохранить запись в личном кабинете, сначала войдите.','Жазылуды жеке кабинетте сақтау үшін алдымен кіріңіз.')}</div><a class="btn primary spaced" href="/login?return=${encodeURIComponent('/book/'+slug+'?service='+service)}">${L('Войти и продолжить','Кіру және жалғастыру')}</a>`:`<div class="form-grid">${field('name',L('Ваше имя','Атыңыз'),{required:true,value:details.name,autocomplete:'given-name',placeholder:L('Как к вам обращаться?','Сізге қалай жүгінуге болады?')})}${field('phone',L('Номер телефона','Телефон нөмірі'),{type:'tel',required:true,value:details.phone,autocomplete:'tel',placeholder:'+7 (7__) ___ __ __'})}${field('comment',L('Комментарий (необязательно)','Пікір (міндетті емес)'),{type:'textarea',value:details.comment,help:L('Не указывайте диагнозы и другие медицинские сведения.','Диагноздар мен басқа медициналық мәліметтерді жазбаңыз.')})}<label class="checkbox"><input id="consent" name="consent" type="checkbox" ${details.consent?'checked':''} aria-describedby="consent-error"><span>${L('Согласен на обработку данных для записи.','Жазылу үшін деректерді өңдеуге келісемін.')} <a class="link" href="/legal/privacy">${L('Условия обработки','Өңдеу шарттары')}</a></span></label><span class="field-error" id="consent-error"></span></div>`}`;
    return `<h2>${L('Всё верно?','Барлығы дұрыс па?')}</h2><div class="summary-line"><small>${L('Клиника','Клиника')}</small><strong>${esc(c.name)}</strong><span>${esc(clinicAddress(c))}</span></div><div class="summary-line"><small>${L('Услуга и врач','Қызмет және дәрігер')}</small><strong>${esc(serviceName(service))}</strong><span>${esc(doctorName(c.doctors.find(d=>d.id===slot?.dentist_id)))}</span></div><div class="summary-line"><small>${L('Дата и время','Күні мен уақыты')}</small><strong>${dateLabel(slot.starts_at)} · ${timeLabel(slot.starts_at)}</strong></div><div class="summary-line"><small>${L('Пациент','Пациент')}</small><span>${esc(details.name)} · ${esc(details.phone)}</span></div><div class="notice spaced">${L('После отправки заявка будет ожидать подтверждения клиники. Следите за статусом в личном кабинете.','Жіберілгеннен кейін өтінім клиниканың растауын күтеді. Күйін жеке кабинеттен бақылаңыз.')}</div>`;
  };
  async function loadSlots(){
    slots=await api('/slots?'+new URLSearchParams({
      clinic:c.id,service,dentist,date
    }));
    if(!slots.some(s=>s.id===slot?.id))slot=null;
  }
  function saveDetails(){
    const form=document.querySelector('#booking-form');
    if(form.querySelector('#name'))details={
      name:form.elements.namedItem('name').value,phone:form.phone.value,comment:form.comment.value,consent:form.consent.checked
    };
  }
  function draw(){
    document.querySelector('#booking-root').innerHTML=`<div class="stepper" role="list" aria-label="${L('Этапы записи','Жазылу кезеңдері')}">${steps()}</div><div class="booking-layout"><form class="panel booking-content" id="booking-form" novalidate>${content()}<p class="form-error" role="alert"></p><div class="booking-nav"><button class="btn" type="button" id="previous" ${step===1?'disabled':''}>${L('Назад','Артқа')}</button><button class="btn primary" type="submit" ${step===4&&!ctx.user?'disabled':''}>${step===5?L('Отправить заявку','Өтінімді жіберу'):L('Продолжить','Жалғастыру')}${icon('arrow')}</button></div></form>${summary()}</div>`;
    bind();
  }
  function bind(){
    const form=document.querySelector('#booking-form');
    form.querySelector('#previous').onclick=()=>{
      saveDetails();
      step--;
      draw();
    };
    form.querySelectorAll('[data-service]').forEach(b=>b.onclick=()=>{
      service=b.dataset.service;if(dentist&&!c.doctors.find(d=>d.id===dentist)?.services?.includes(service))dentist='';slot=null;draw();
    });
    form.querySelectorAll('[data-dentist]').forEach(b=>b.onclick=()=>{
      dentist=b.dataset.dentist;slot=null;draw();
    });
    form.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{
      slot=slots.find(s=>s.id===b.dataset.slot);draw();
    });
    const dateInput=form.querySelector('#booking-date');
    if(dateInput)dateInput.onchange=async()=>{
      date=dateInput.value;
      slot=null;
      try{
        await loadSlots();
        draw();
      }catch(e){
        form.querySelector('.form-error').textContent=errorText(e);
      }
    };
    form.onsubmit=async e=>{
      e.preventDefault();
      if(pending)return;
      clearErrors(form);
      saveDetails();
      if(step===3&&!slot){
        form.querySelector('.form-error').textContent=L('Выберите свободное время.','Бос уақытты таңдаңыз.');
        return;
      }
      if(step===4){
        if(!details.name.trim())return formError(form,'name',L('Укажите имя.','Атыңызды жазыңыз.'));
        if(!phone(details.phone))return formError(form,'phone',L('Введите номер: +7 и 10 цифр.','Нөмірді енгізіңіз: +7 және 10 сан.'));
        if(!details.consent)return formError(form,'consent',L('Подтвердите согласие для записи.','Жазылу үшін келісімді растаңыз.'));
      }
      const submit=form.querySelector('[type=submit]');
      pending=true;
      submit.disabled=true;
      submit.setAttribute('aria-busy','true');
      try{
        if(step===5){
          const a=await api('/appointments',{
            method:'POST',body:{
              slot_id:slot.id,...details,idempotency_key:key
            }
          });
          ctx.go('/booking-success/'+a.id);
          return;
        }
        if(step===2)await loadSlots();
        step++;
        draw();
        document.querySelector('#booking-form h2').setAttribute('tabindex','-1');
        document.querySelector('#booking-form h2').focus();
      }catch(error){
        if(error.code==='CONFLICT'){
          step=3;
          slot=null;
          await loadSlots();
          draw();
          document.querySelector('#booking-form .form-error').textContent=errorText(error);
        }else if(error.code==='UNAUTHORIZED'){
          ctx.go('/login?return='+encodeURIComponent('/book/'+slug));
        }else form.querySelector('.form-error').textContent=errorText(error);
      }finally{
        pending=false;
        if(submit.isConnected){
          submit.disabled=false;
          submit.removeAttribute('aria-busy');
        }
      }
    };
  }
  return {
    html:`<div class="booking-shell"><div class="booking-top"><a href="/clinics/${esc(c.slug)}" class="link">← ${L('Вернуться к клинике','Клиникаға оралу')}</a><h1>${L('Вы на шаг ближе к улыбке','Күлкіге бір қадам жақындадыңыз')}</h1></div><p class="muted booking-clinic-name">${esc(c.name)} · ${esc(clinicAddress(c))}</p><div id="booking-root"></div></div>`,bind:draw
  };
}
export async function success(ctx,id){
  const all=await api('/appointments'),a=all.find(x=>x.id===id);
  if(!a)throw {
    code:'NOT_FOUND'
  };
  const c=await api('/clinics').then(cs=>cs.find(c=>c.id===a.clinic_id)||a.clinic_snapshot);
  return {
    html:`<div class="content-narrow"><div class="success-heading"><div class="success-icon">${icon('check')}</div><h1>${L('Заявка отправлена','Өтінім жіберілді')}</h1><p>${L('Клиника проверит заявку. Подтверждение появится в личном кабинете.','Клиника өтінімді тексереді. Растау жеке кабинетте пайда болады.')}</p></div><div class="panel"><span class="badge ${esc(a.status)}">${statusLabel(a.status)}</span><h2 class="spaced">${esc(c?.name||L('Клиника','Клиника'))}</h2><div class="summary-line"><small>${L('Услуга','Қызмет')}</small><strong>${esc(serviceName(a.service_id))}</strong></div><div class="summary-line"><small>${L('Когда','Қашан')}</small><strong>${dateLabel(a.starts_at)} · ${timeLabel(a.starts_at)}</strong></div><div class="summary-line"><small>${L('Врач','Дәрігер')}</small><span>${esc(doctorName(c?.doctors.find(d=>d.id===a.dentist_id)))}</span></div><div class="summary-line"><small>${L('Адрес','Мекенжай')}</small><span>${esc(c?clinicAddress(c):'—')}</span></div><a class="btn primary full spaced" href="/my-appointments">${L('Мои записи','Менің жазылуларым')}${icon('arrow')}</a></div></div>`,bind(){
    }
  };
}
