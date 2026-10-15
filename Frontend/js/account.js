import {
  api
}
from './api.js';
import {
  L,lang,dateLabel,timeLabel,statusLabel
}
from './i18n.js';
import {
  esc,icon,field,formError,clearErrors,errorText,toast,ask
}
from './ui.js';
import {
  phone
}
from '/shared/domain.js';
import {
  serviceName,clinicAddress,doctorName
}
from './public.js';
export const protectedView=()=>({
  html:`<div class="content-narrow"><div class="empty">${icon('user')}<h1>${L('Войдите в личный кабинет','Жеке кабинетке кіріңіз')}</h1><p>${L('Ваши записи доступны после входа.','Жазылуларыңыз кіргеннен кейін қолжетімді.')}</p><a class="btn primary" href="/login?return=${encodeURIComponent(location.pathname+location.search)}">${L('Войти','Кіру')}</a></div></div>`,bind(){
  }
});
export { login } from './auth.js';
export function appointmentCard(a,c,staff=false){
  return `<article class="appointment-card"><div><span class="badge ${esc(a.status)}">${statusLabel(a.status)}</span>${a.reschedule_requested?` <span class="badge pending">${L('Запрошен перенос','Уақытты ауыстыру сұралды')}</span>`:''}<h3>${esc(c?.name||L('Клиника','Клиника'))} · ${esc(serviceName(a.service_id))}</h3><div class="appointment-meta"><span>${icon('calendar')}${dateLabel(a.starts_at)} · ${timeLabel(a.starts_at)}</span><span>${icon('user')}${esc(doctorName(c?.doctors.find(d=>d.id===a.dentist_id)))}</span></div><div class="address">${icon('pin')}${esc(c?clinicAddress(c):'')}</div>${staff?`<p class="muted spaced"><small>${esc(a.name)} · ${esc(a.phone)}</small></p>`:''}</div><div class="appointment-actions">${['pending','confirmed'].includes(a.status)&&new Date(a.starts_at)>new Date()?`${!a.reschedule_requested?`<button class="btn small" data-reschedule="${esc(a.id)}">${L('Перенести','Уақытын ауыстыру')}</button>`:''}<button class="btn small" data-cancel="${esc(a.id)}">${L('Отменить','Бас тарту')}</button>`:c?`<a class="btn small" href="/book/${esc(c.slug)}?service=${esc(a.service_id)}">${L('Записаться снова','Қайта жазылу')}</a>`:''}</div></article>`;
}
export function bindAppointmentActions(ctx){
  document.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=async()=>{
    if(!await ask(L('Отменить запись?','Жазылудан бас тартасыз ба?'),L('Заявка будет отменена, а время станет доступно другим пациентам.','Өтінімнен бас тартылады, уақыт басқа пациенттерге қолжетімді болады.'),L('Отменить запись','Жазылудан бас тарту')))return;b.disabled=true;try{
      await api('/appointments/'+b.dataset.cancel,{
        method:'PATCH',body:{
          status:'cancelled'
        }
      });toast(L('Запись отменена','Жазылудан бас тартылды'));ctx.render();
    }catch(e){
      toast(errorText(e));b.disabled=false;
    }
  });
  document.querySelectorAll('[data-reschedule]').forEach(b=>b.onclick=async()=>{
    b.disabled=true;try{
      await api('/appointments/'+b.dataset.reschedule,{
        method:'PATCH',body:{
          reschedule_request:true
        }
      });toast(L('Запрос отправлен. Исходное время сохраняется до согласования.','Сұрау жіберілді. Бастапқы уақыт келісілгенше сақталады.'));ctx.render();
    }catch(e){
      toast(errorText(e));b.disabled=false;
    }
  });
}
export async function appointments(ctx){
  if(!ctx.user)return protectedView();
  const[all,clinics]=await Promise.all([api('/appointments'),api('/clinics')]);
  const p=new URLSearchParams(location.search),history=p.get('tab')==='history';
  const upcoming=all.filter(a=>['pending','confirmed'].includes(a.status)&&new Date(a.starts_at)>new Date());
  const rows=(history?all.filter(a=>!upcoming.includes(a)):upcoming);
  const page=Math.max(1,+p.get('page')||1);
  return {
    html:`<div class="container page-heading"><div class="eyebrow">${L('ЛИЧНЫЙ КАБИНЕТ','ЖЕКЕ КАБИНЕТ')}</div><h1>${L('Мои записи','Менің жазылуларым')}</h1><p>${L('Всё о предстоящих визитах и истории посещений','Алдағы қабылдаулар мен келу тарихы туралы')}</p></div><div class="container section" style="padding-top:0"><div class="toolbar"><div class="segmented"><a class="${!history?'active':''}" href="/my-appointments">${L('Предстоящие','Алдағы')} (${upcoming.length})</a><a class="${history?'active':''}" href="/my-appointments?tab=history">${L('История','Тарих')}</a></div><a class="link" href="/profile">${icon('settings')}${L('Профиль','Профиль')}</a></div>${rows.length?rows.slice((page-1)*20,page*20).map(a=>appointmentCard(a,clinics.find(c=>c.id===a.clinic_id)||a.clinic_snapshot)).join(''):`<div class="empty">${icon('calendar')}<h2>${history?L('Здесь появится история визитов','Қабылдаулар тарихы осында пайда болады'):L('Пока нет предстоящих записей','Алдағы жазылулар әзірге жоқ')}</h2><p>${L('Выберите клинику и удобное время — остальное подскажет QLine.','Клиниканы және ыңғайлы уақытты таңдаңыз — қалғанын QLine көрсетеді.')}</p><a class="btn primary" href="/clinics">${L('Найти клинику','Клиника табу')}</a></div>`}${rows.length>20?`<div class="pagination">${page>1?`<a class="btn" href="/my-appointments?tab=${history?'history':''}&page=${page-1}">←</a>`:''}<span>${page}</span>${page*20<rows.length?`<a class="btn" href="/my-appointments?tab=${history?'history':''}&page=${page+1}">→</a>`:''}</div>`:''}</div>`,bind(){
      bindAppointmentActions(ctx);
    }
  };
}
export async function profile(ctx){
  if(!ctx.user)return protectedView();
  return {
    html:`<div class="container page-heading"><h1>${L('Мой профиль','Менің профилім')}</h1></div><div class="container section" style="padding-top:0"><div class="profile-grid"><nav class="profile-nav"><a class="active" href="/profile">${L('Личные данные','Жеке деректер')}</a><a href="/my-appointments">${L('Мои записи','Менің жазылуларым')}</a></nav><div class="panel"><form class="form-grid" id="profile-form" novalidate>${field('name',L('Имя','Аты'),{value:ctx.user.name||'',required:true,autocomplete:'given-name'})}${field('phone',L('Контактный телефон','Байланыс телефоны'),{type:'tel',value:ctx.user.phone,required:true,autocomplete:'tel',help:L('Изменение контакта не меняет номер для входа.','Байланыс нөмірін өзгерту кіру нөмірін өзгертпейді.')})}<p class="form-error" role="alert"></p><button class="btn primary" type="submit">${L('Сохранить изменения','Өзгерістерді сақтау')}</button></form></div></div></div>`,bind(){
      const f=document.querySelector('#profile-form');
      f.onsubmit=async e=>{
        e.preventDefault();
        clearErrors(f);
        if(!f.elements.namedItem('name').value.trim())return formError(f,'name',L('Укажите имя.','Атыңызды жазыңыз.'));
        if(!phone(f.phone.value))return formError(f,'phone',L('Проверьте номер телефона.','Телефон нөмірін тексеріңіз.'));
        const b=f.querySelector('button');
        b.disabled=true;
        try{
          await api('/profile',{
            method:'PATCH',body:Object.fromEntries(new FormData(f))
          });
          await ctx.refreshUser();
          toast(L('Изменения сохранены','Өзгерістер сақталды'));
        }catch(e){
          f.querySelector('.form-error').textContent=errorText(e);
        }finally{
          b.disabled=false;
        }
      };
    }
  };
}
export async function clinicRegister(ctx){
  if(!ctx.user)return protectedView();
  return {
    html:`<div class="content-narrow"><div class="eyebrow">${L('БОЛЬШЕ ЗАПИСЕЙ. МЕНЬШЕ РУТИНЫ.','ЖАЗЫЛУ КӨП. ӘУРЕ АЗ.')}</div><h1>${L('Ваша клиника — в QLine','Клиникаңыз — QLine-да')}</h1><p>${L('Расскажите о клинике. После проверки карточки вы сможете принимать онлайн-заявки.','Клиника туралы айтыңыз. Карточка тексерілгеннен кейін онлайн өтінімдерді қабылдай аласыз.')}</p><div class="panel"><form id="register-clinic" class="form-grid" novalidate>${field('name',L('Название клиники','Клиника атауы'),{required:true})}${field('city',L('Город','Қала'),{options:[['almaty','Алматы'],['astana','Астана']]})}${field('address',L('Адрес','Мекенжай'),{required:true})}${field('phone',L('Контактный телефон','Байланыс телефоны'),{type:'tel',required:true,placeholder:'+7 (7__) ___ __ __'})}<label class="checkbox"><input type="checkbox" id="clinic-consent" aria-describedby="clinic-consent-error"><span>${L('Согласен передать контактные данные для рассмотрения заявки.','Өтінімді қарау үшін байланыс деректерін беруге келісемін.')}</span></label><span class="field-error" id="clinic-consent-error"></span><p class="form-error" role="alert"></p><button class="btn primary" type="submit">${L('Отправить на проверку','Тексеруге жіберу')}${icon('arrow')}</button></form></div></div>`,bind(){
      const f=document.querySelector('#register-clinic');
      f.onsubmit=async e=>{
        e.preventDefault();
        clearErrors(f);
        for(const id of ['name','address'])if(!f[id].value.trim())return formError(f,id,L('Заполните поле.','Өрісті толтырыңыз.'));
        if(!phone(f.phone.value))return formError(f,'phone',L('Проверьте номер.','Нөмірді тексеріңіз.'));
        if(!f.querySelector('#clinic-consent').checked)return formError(f,'clinic-consent',L('Подтвердите согласие.','Келісімді растаңыз.'));
        const b=f.querySelector('button');
        b.disabled=true;
        try{
          await api('/clinic-register',{
            method:'POST',body:{
              ...Object.fromEntries(new FormData(f)),consent:true
            }
          });
          await ctx.refreshUser();
          document.querySelector('.content-narrow').innerHTML=`<div class="success-heading"><div class="success-icon">${icon('check')}</div><h1>${L('Заявка на проверке','Өтінім тексерілуде')}</h1><p>${L('Карточка появится в каталоге после подтверждения администратором.','Карточка әкімші растағаннан кейін каталогта пайда болады.')}</p><a class="btn primary spaced" href="/clinic-dashboard">${L('Открыть кабинет','Кабинетті ашу')}</a></div>`;
        }catch(e){
          f.querySelector('.form-error').textContent=errorText(e);
          b.disabled=false;
        }
      };
    }
  };
}
