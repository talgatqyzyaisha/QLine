import {
  api
}
from './api.js';
import {
  services,localDate,nameOf
}
from './data.js';
import {
  L,lang,dateLabel,timeLabel,money,statusLabel
}
from './i18n.js';
import {
  esc,icon,field,clearErrors,formError,errorText,toast,ask,dataTable
}
from './ui.js';
import {
  serviceName,doctorName
}
from './public.js';
import {
  protectedView
}
from './account.js';
const tabs=()=>[['overview',L('Обзор','Шолу'),'grid'],['schedule',L('Расписание','Кесте'),'calendar'],['appointments',L('Записи','Жазылулар'),'chat'],['doctors',L('Врачи','Дәрігерлер'),'user'],['services',L('Услуги и цены','Қызметтер мен бағалар'),'tooth'],['profile',L('Профиль клиники','Клиника профилі'),'building'],['analytics',L('Аналитика','Талдау'),'chart'],['notifications',L('Уведомления','Хабарламалар'),'bell']];
const forbidden=()=>({
  html:`<div class="content-narrow"><div class="empty">${icon('shield')}<h1>${L('Нет доступа','Қолжетімділік жоқ')}</h1><p>${L('Для этого раздела нужна соответствующая роль.','Бұл бөлім үшін тиісті рөл қажет.')}</p><a href="/login" class="btn primary">${L('Сменить аккаунт','Аккаунтты ауыстыру')}</a></div></div>`,bind(){
  }
});
function tableAppointments(rows, c, role) {
  const columns = [L('Пациент', 'Пациент'), L('Дата и время', 'Күні мен уақыты'), L('Услуга', 'Қызмет'), L('Статус', 'Күйі'), L('Действия', 'Әрекеттер')];
  const values = rows.slice(0, 20).map(a => [
    `<strong>${esc(a.name)}</strong><br><small class="muted">${esc(a.phone)}</small>`,
    `${dateLabel(a.starts_at)}<br><small>${timeLabel(a.starts_at)}</small>`,
    `${esc(serviceName(a.service_id))}<br><small class="muted">${esc(doctorName(c.doctors.find(d => d.id === a.dentist_id)))}</small>`,
    `<span class="badge ${esc(a.status)}">${statusLabel(a.status)}</span>${a.reschedule_requested ? `<br><small>${L('Запрос переноса', 'Ауыстыру сұрауы')}</small>` : ''}`,
    `<div class="actions">${a.status==='pending'&&role!=='dentist'?`<button class="btn small primary" data-status="confirmed" data-id="${esc(a.id)}">${L('Подтвердить','Растау')}</button>`:''}${['pending','confirmed'].includes(a.status)&&role!=='dentist'?`<button class="btn small" data-move="${esc(a.id)}">${L('Перенести','Ауыстыру')}</button><button class="btn small danger" data-status="cancelled" data-id="${esc(a.id)}">${L('Отменить','Бас тарту')}</button>`:''}${a.status==='confirmed'&&new Date(a.starts_at)<=new Date()?`<button class="btn small" data-status="completed" data-id="${esc(a.id)}">${L('Завершить','Аяқтау')}</button><button class="btn small" data-status="no_show" data-id="${esc(a.id)}">${L('Неявка','Келмеді')}</button>`:''}</div>`
  ]);
  return dataTable(L('Записи клиники', 'Клиника жазылулары'), columns, values, L('Пока нет записей. Откройте время в расписании.', 'Жазылулар әзірге жоқ. Кестеде бос уақытты ашыңыз.'));
}
function emptyData(){
  return `<div class="empty">${icon('chart')}<h2>${L('Пока недостаточно данных','Деректер әзірге жеткіліксіз')}</h2><p>${L('Показатели появятся по мере поступления заявок.','Көрсеткіштер өтінімдер түскен сайын пайда болады.')}</p></div>`;
}
export async function dashboard(ctx){
  if(!ctx.user)return protectedView();
  if(!['owner','administrator','dentist'].includes(ctx.user.role))return forbidden();
  const data=await api('/clinic'),c=data.clinic,p=new URLSearchParams(location.search),tab=tabs().some(([t])=>t===p.get('tab'))?p.get('tab'):'overview';
  const manager=ctx.user.role!=='dentist';
  const doctorOpts=c.doctors.map(d=>[d.id,doctorName(d)]),serviceOpts=c.services.map(s=>[s,serviceName(s)]);
  const requestedDate = p.get('date') || '';
  const currentDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) && !Number.isNaN(Date.parse(requestedDate)) ? requestedDate : localDate();
  const view = ['day', 'week', 'month'].includes(p.get('view')) ? p.get('view') : 'week';
  let content='';
  if(tab==='overview'||tab==='analytics'){
    const today=data.appointments.filter(a=>a.starts_at.slice(0,10)===localDate());
    content=`<div class="stats">${[[L('Записи на сегодня','Бүгінгі жазылулар'),today.filter(a=>['pending','confirmed'].includes(a.status)).length],[L('Новые заявки','Жаңа өтінімдер'),data.appointments.filter(a=>a.status==='pending').length],[L('Подтверждены','Расталғандар'),data.appointments.filter(a=>a.status==='confirmed').length],[L('Отменены','Бас тартылғандар'),data.appointments.filter(a=>a.status==='cancelled').length]].map(([t,n])=>`<div class="stat"><span>${t}</span><strong>${n}</strong><small>${L('Данные QLine','QLine деректері')}</small></div>`).join('')}</div>`;
    if(tab==='analytics')content+=`<div class="panel"><h2>${L('Воронка онлайн-записи','Онлайн жазылу кезеңдері')}</h2><div class="summary-line"><small>${L('Все заявки','Барлық өтінімдер')}</small><strong>${data.appointments.length}</strong></div><div class="summary-line"><small>${L('Подтверждено или завершено','Расталған немесе аяқталған')}</small><strong>${data.appointments.filter(a=>['confirmed','completed'].includes(a.status)).length}</strong></div><p class="muted spaced">${L('Конверсия посещений в записи не рассчитывается: аналитика просмотров не подключена.','Қаралымнан жазылуға конверсия есептелмейді: қаралым талдауы қосылмаған.')}</p></div>`;
    else content+=`<div class="section-heading"><h3>${L('Ближайшие приёмы','Алдағы қабылдаулар')}</h3><a class="link" href="/clinic-dashboard?tab=appointments">${L('Все записи','Барлық жазылулар')}${icon('arrow')}</a></div>${tableAppointments(data.appointments.filter(a=>['pending','confirmed'].includes(a.status)&&new Date(a.starts_at)>new Date()).sort((a,b)=>a.starts_at.localeCompare(b.starts_at)),c,ctx.user.role)}`;
  }
  if(tab==='appointments'){
    const q=p.get('q')||'',status=p.get('status')||'';
    const rows=data.appointments.filter(a=>(!q||a.name.toLowerCase().includes(q.toLowerCase()))&&(!status||a.status===status));
    const page=Math.max(1,+p.get('page')||1);
    content=`<form id="appointment-filters" class="toolbar" novalidate>${field('q',L('Поиск пациента','Пациентті іздеу'),{value:q})}${field('status',L('Статус','Күйі'),{options:[['',L('Все','Барлығы')],...['pending','confirmed','cancelled','completed','no_show'].map(s=>[s,statusLabel(s)])],value:status})}<button class="btn" type="submit">${L('Найти','Табу')}</button><a class="link" href="/clinic-dashboard?tab=appointments">${L('Сбросить','Тазалау')}</a></form>${tableAppointments(rows.slice((page-1)*20,page*20),c,ctx.user.role)}${rows.length>20?`<div class="pagination">${page>1?`<a class="btn" href="/clinic-dashboard?${new URLSearchParams({...Object.fromEntries(p),page:page-1})}">←</a>`:''}<span>${page}</span>${rows.length>page*20?`<a class="btn" href="/clinic-dashboard?${new URLSearchParams({...Object.fromEntries(p),page:page+1})}">→</a>`:''}</div>`:''}`;
  }
  if(tab==='schedule'){
    const count=view==='day'?1:view==='month'?new Date(+currentDate.slice(0,4),+currentDate.slice(5,7),0).getDate():7;
    let days=Array.from({
      length:count
    },(_,i)=>{
      const date=new Date((view==='month'?currentDate.slice(0,8)+'01':currentDate)+'T12:00:00+05:00');date.setUTCDate(date.getUTCDate()+i);return new Intl.DateTimeFormat('en-CA',{
        timeZone:'Asia/Almaty',year:'numeric',month:'2-digit',day:'2-digit'
      }).format(date);
    });
    content=`<div class="toolbar"><div class="segmented">${[['day',L('День','Күн')],['week',L('Неделя','Апта')],['month',L('Месяц','Ай')]].map(([v,t])=>`<a class="${view===v?'active':''}" href="/clinic-dashboard?tab=schedule&view=${v}&date=${currentDate}">${t}</a>`).join('')}</div>${field('calendar-date',L('Дата','Күн'),{type:'date',value:currentDate})}</div><div class="calendar-container" data-calendar-view="${view}"><div class="calendar-grid">${days.map(date=>`<section class="calendar-day"><h4>${dateLabel(date)}</h4>${data.appointments.filter(a=>a.starts_at.slice(0,10)===date&&['pending','confirmed'].includes(a.status)).map(a=>`<div class="calendar-event ${esc(a.status)}">${timeLabel(a.starts_at)} · ${esc(a.name)}<br>${esc(serviceName(a.service_id))}</div>`).join('')}${data.slots.filter(s=>s.starts_at.slice(0,10)===date&&s.open&&!data.appointments.some(a=>a.slot_id===s.id&&['pending','confirmed'].includes(a.status))).slice(0,view==='month'?3:10).map(s=>`<div class="calendar-event">${timeLabel(s.starts_at)} · ${L('Открыт','Ашық')}${manager?` <button class="btn small" data-close-slot="${esc(s.id)}" aria-label="${L('Закрыть слот','Уақытты жабу')}">×</button>`:''}</div>`).join('')}</section>`).join('')}</div></div>${manager?`<div class="panel spaced clinic-form"><h3>${L('Открыть время для записи','Жазылуға уақыт ашу')}</h3><form id="slot-form" class="form-grid spaced" novalidate><div class="form-two">${field('dentist_id',L('Врач','Дәрігер'),{options:doctorOpts})}${field('service_id',L('Услуга','Қызмет'),{options:serviceOpts})}</div><div class="form-two">${field('slot-date',L('Дата','Күн'),{type:'date',value:localDate(1),min:localDate(),required:true})}${field('slot-time',L('Начало приёма','Қабылдаудың басталуы'),{type:'time',value:'10:00',required:true})}</div><p class="muted"><small>${L('Длительность берётся из услуги. Время Алматы, UTC+5.','Ұзақтығы қызметке сәйкес. Алматы уақыты, UTC+5.')}</small></p><p class="form-error" role="alert"></p><button class="btn primary" type="submit">${L('Открыть слот','Бос уақыт ашу')}</button></form><details><summary>${L('Рабочие часы и перерывы','Жұмыс уақыты мен үзілістер')}</summary><form id="hours-form" class="form-grid" novalidate>${field('hours-dentist',L('Врач','Дәрігер'),{options:doctorOpts})}${field('weekday',L('День недели','Апта күні'),{options:[['1',L('Понедельник','Дүйсенбі')],['2',L('Вторник','Сейсенбі')],['3',L('Среда','Сәрсенбі')],['4',L('Четверг','Бейсенбі')],['5',L('Пятница','Жұма')],['6',L('Суббота','Сенбі')],['0',L('Воскресенье','Жексенбі')]]})}<div class="form-two">${field('start',L('Открытие','Ашылуы'),{type:'time',value:'09:00'})}${field('end',L('Закрытие','Жабылуы'),{type:'time',value:'18:00'})}</div><p class="muted"><small>${L('Шаблон рабочих часов. Публикуйте слоты отдельно; перерывы и выходные задаются блокировкой.','Жұмыс уақытының үлгісі. Бос уақыттарды бөлек ашыңыз; үзілістер мен демалыстарды бұғаттау арқылы белгілеңіз.')}</small></p><p class="form-error" role="alert"></p><button class="btn" type="submit">${L('Сохранить рабочие часы','Жұмыс уақытын сақтау')}</button></form><form id="blocked-form" class="form-grid spaced" novalidate><h4>${L('Заблокировать перерыв или выходной','Үзілісті немесе демалысты бұғаттау')}</h4>${field('blocked-dentist',L('Врач','Дәрігер'),{options:doctorOpts})}<div class="form-two">${field('blocked-start',L('Начало','Басталуы'),{type:'datetime-local',required:true})}${field('blocked-end',L('Окончание','Аяқталуы'),{type:'datetime-local',required:true})}</div><p class="form-error" role="alert"></p><button class="btn" type="submit">${L('Заблокировать время','Уақытты бұғаттау')}</button></form></details></div>`:''}`;
  }
  if(tab==='doctors')content=`<div class="panel">${c.doctors.map(d=>`<div class="doctor-card"><span class="avatar">${esc(d.initials)}</span><div><h3>${esc(doctorName(d))}</h3><p>${esc(serviceName(d.specialty))}</p></div></div>`).join('')}${manager?`<h3 class="spaced">${L('Добавить врача','Дәрігер қосу')}</h3><form id="doctor-form" class="form-grid spaced" novalidate>${field('nameRu',L('Имя на русском','Орыс тіліндегі аты'),{required:true})}${field('nameKz',L('Имя на казахском','Қазақ тіліндегі аты'),{required:true})}${field('specialty',L('Специализация','Мамандығы'),{options:services.map(s=>[s.id,nameOf(s,lang)])})}<p class="form-error" role="alert"></p><button class="btn primary" type="submit">${L('Добавить врача','Дәрігер қосу')}</button></form>`:''}</div>`;
  if(tab==='services')content=`<div class="panel">${c.services.map(id=>`<div class="service-row"><span>${esc(serviceName(id))}<br><small class="muted">${c.serviceDetails?.[id]?.duration||services.find(s=>s.id===id)?.duration||30} ${L('мин','мин')}</small></span><strong>${money(c.serviceDetails?.[id]?.price??services.find(s=>s.id===id)?.price??0)}</strong></div>`).join('')}${manager?`<h3 class="spaced">${L('Добавить или обновить услугу','Қызметті қосу немесе жаңарту')}</h3><form id="service-form" class="form-grid spaced" novalidate>${field('service_id',L('Услуга','Қызмет'),{options:services.map(s=>[s.id,nameOf(s,lang)])})}<div class="form-two">${field('price',L('Стоимость, ₸','Бағасы, ₸'),{type:'number',min:'0',required:true,value:'5000'})}${field('duration',L('Длительность, мин','Ұзақтығы, мин'),{type:'number',min:'15',max:'240',required:true,value:'30'})}</div><fieldset><legend>${L('Врачи, оказывающие услугу','Қызметті көрсететін дәрігерлер')}</legend>${c.doctors.map(d=>`<label class="checkbox"><input type="checkbox" name="dentist_ids" value="${esc(d.id)}" ${(d.services||[]).includes(services[0]?.id)?'checked':''}>${esc(doctorName(d))}</label>`).join('')}</fieldset><p class="form-error" role="alert"></p><button class="btn primary" type="submit">${L('Сохранить услугу','Қызметті сақтау')}</button></form>`:''}</div>`;
  if(tab==='profile')content=manager?`<div class="panel"><form id="clinic-profile" class="form-grid" novalidate>${field('name',L('Название','Атауы'),{required:true,value:c.name})}<div class="form-two">${field('addressRu',L('Адрес на русском','Орыс тіліндегі мекенжайы'),{value:c.addressRu})}${field('addressKz',L('Адрес на казахском','Қазақ тіліндегі мекенжайы'),{value:c.addressKz})}</div>${field('descriptionRu',L('Описание на русском','Орыс тіліндегі сипаттамасы'),{type:'textarea',value:c.descriptionRu})}${field('descriptionKz',L('Описание на казахском','Қазақ тіліндегі сипаттамасы'),{type:'textarea',value:c.descriptionKz})}${field('hours',L('Часы работы (для карточки)','Жұмыс уақыты (карточка үшін)'),{value:c.hours})}<p class="form-error" role="alert"></p><button class="btn primary" type="submit">${L('Сохранить профиль','Профильді сақтау')}</button></form></div>`:emptyData();
  if(tab==='notifications')content=manager?`<div class="panel"><h3>${L('Настройки уведомлений','Хабарлама баптаулары')}</h3><p class="muted spaced">${L('Каналы SMS и email пока не подключены. Настройки сохраняются для будущей интеграции.','SMS және email арналары әлі қосылмаған. Баптаулар болашақ интеграция үшін сақталады.')}</p><form id="notifications-form" class="form-grid spaced" novalidate><label class="checkbox"><input type="checkbox" name="bookings" ${data.notifications?.bookings?'checked':''}>${L('Новые записи','Жаңа жазылулар')}</label><label class="checkbox"><input type="checkbox" name="cancellations" ${data.notifications?.cancellations?'checked':''}>${L('Отмены и переносы','Бас тартулар мен ауыстырулар')}</label><p class="form-error" role="alert"></p><button class="btn primary" type="submit">${L('Сохранить настройки','Баптауларды сақтау')}</button></form></div>`:emptyData();
  return {
    html:`<div class="workspace"><aside class="workspace-sidebar"><small>${esc(c.name)}</small><nav class="sidebar-links">${tabs().filter(([id])=>manager||!['profile','notifications'].includes(id)).map(([id,t,i])=>`<a class="${tab===id?'active':''}" href="/clinic-dashboard?tab=${id}">${icon(i)}${t}</a>`).join('')}</nav></aside><div class="workspace-main"><div class="workspace-heading"><div><h1>${tabs().find(([id])=>id===tab)[1]}</h1><p>${dateLabel(localDate())} · ${esc(c.name)}</p></div><span class="badge">${ctx.user.role==='owner'?L('Владелец','Иесі'):ctx.user.role==='dentist'?L('Врач','Дәрігер'):L('Администратор','Әкімші')}</span></div>${!c.approved?`<div class="notice warning">${L('Карточка клиники ожидает проверки и пока не видна пациентам.','Клиника карточкасы тексерілуде және пациенттерге әлі көрінбейді.')}</div>`:''}${content}</div></div>`,bind(){
      const bindForm=(id,path,method='POST',transform=x=>x)=>{
        const f=document.getElementById(id);
        if(!f)return;
        f.onsubmit=async e=>{
          e.preventDefault();
          clearErrors(f);
          const b=f.querySelector('[type=submit]');
          b.disabled=true;
          try{
            await api(path,{
              method,body:transform(Object.fromEntries(new FormData(f)),f)
            });
            toast(L('Изменения сохранены','Өзгерістер сақталды'));
            ctx.render();
          }catch(e){
            f.querySelector('.form-error').textContent=errorText(e);
          }finally{
            b.disabled=false;
          }
        };
      };
      bindForm('doctor-form','/clinic/dentists');
      bindForm('service-form','/clinic/services','POST',(v,f)=>({
        ...v,dentist_ids:new FormData(f).getAll('dentist_ids')
      }));
      const serviceForm=document.querySelector('#service-form');
      if(serviceForm){
        const sync=()=>{
          const id=serviceForm.elements.namedItem('service_id').value;
          serviceForm.querySelectorAll('[name=dentist_ids]').forEach(box=>box.checked=(c.doctors.find(d=>d.id===box.value)?.services||[]).includes(id));
          serviceForm.elements.namedItem('price').value=c.serviceDetails?.[id]?.price??services.find(s=>s.id===id)?.price??0;
          serviceForm.elements.namedItem('duration').value=c.serviceDetails?.[id]?.duration??services.find(s=>s.id===id)?.duration??30;
        };
        serviceForm.elements.namedItem('service_id').onchange=sync;
        sync();
      }
      bindForm('clinic-profile','/clinic/profile','PATCH');
      bindForm('hours-form','/clinic/working-hours','POST',v=>({
        dentist_id:v['hours-dentist'],weekday:+v.weekday,start:v.start,end:v.end
      }));
      bindForm('blocked-form','/clinic/blocked','POST',v=>({
        dentist_id:v['blocked-dentist'],starts_at:v['blocked-start']+':00+05:00',ends_at:v['blocked-end']+':00+05:00'
      }));
      bindForm('notifications-form','/clinic/notifications','PATCH',(v,f)=>({
        bookings:f.bookings.checked,cancellations:f.cancellations.checked
      }));
      bindForm('slot-form','/clinic/slots','POST',v=>{
        const start=new Date(v['slot-date']+'T'+v['slot-time']+':00+05:00');const duration=c.serviceDetails?.[v.service_id]?.duration||services.find(s=>s.id===v.service_id)?.duration||30;return {
          dentist_id:v.dentist_id,service_id:v.service_id,starts_at:start.toISOString(),ends_at:new Date(start.getTime()+duration*60000).toISOString()
        };
      });
      document.querySelectorAll('[data-status]').forEach(b=>b.onclick=async()=>{
        if(b.dataset.status==='cancelled'&&!await ask(L('Отменить приём?','Қабылдаудан бас тартасыз ба?'),L('Пациент увидит отмену в личном кабинете.','Пациент жеке кабинетте бас тартуды көреді.'),L('Отменить приём','Қабылдаудан бас тарту')))return;b.disabled=true;try{
          await api('/appointments/'+b.dataset.id,{
            method:'PATCH',body:{
              status:b.dataset.status
            }
          });toast(L('Статус обновлён','Күй жаңартылды'));ctx.render();
        }catch(e){
          toast(errorText(e));b.disabled=false;
        }
      });
      document.querySelectorAll('[data-close-slot]').forEach(b=>b.onclick=async()=>{
        if(!await ask(L('Закрыть слот?','Уақытты жабасыз ба?'),L('Пациенты больше не смогут выбрать это время.','Пациенттер бұл уақытты таңдай алмайды.'),L('Закрыть слот','Уақытты жабу')))return;try{
          await api('/clinic/slots/'+b.dataset.closeSlot,{
            method:'PATCH',body:{
              open:false
            }
          });ctx.render();
        }catch(e){
          toast(errorText(e));
        }
      });
      document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{
        const a=data.appointments.find(a=>a.id===b.dataset.move),dialog=document.querySelector('#dialog');dialog.innerHTML=`<div class="dialog-body"><h2 id="dialog-title">${L('Перенести приём','Қабылдауды ауыстыру')}</h2><form id="move-form" class="form-grid spaced" novalidate>${field('move-date',L('Новая дата','Жаңа күн'),{type:'date',min:localDate(),value:localDate(1)})}<button class="btn" type="button" id="load-move">${L('Найти время','Уақыт табу')}</button><div id="move-slots"></div><p class="form-error" role="alert"></p><div class="actions"><button class="btn" type="button" id="move-cancel">${L('Назад','Артқа')}</button><button class="btn primary" type="submit">${L('Перенести','Ауыстыру')}</button></div></form></div>`;dialog.showModal();dialog.querySelector('#move-cancel').onclick=()=>dialog.close();dialog.querySelector('#load-move').onclick=async()=>{
          try{
            const slots=await api('/slots?'+new URLSearchParams({
              clinic:c.id,service:a.service_id,date:dialog.querySelector('#move-date').value
            }));dialog.querySelector('#move-slots').innerHTML=slots.length?field('move-slot',L('Новое время','Жаңа уақыт'),{
              options:slots.map(s=>[s.id,timeLabel(s.starts_at)+' · '+doctorName(c.doctors.find(d=>d.id===s.dentist_id))])
            }):`<p class="muted">${L('Нет свободного времени','Бос уақыт жоқ')}</p>`;
          }catch(e){
            dialog.querySelector('.form-error').textContent=errorText(e);
          }
        };dialog.querySelector('#move-form').onsubmit=async e=>{
          e.preventDefault();const slot=dialog.querySelector('#move-slot');if(!slot)return;const submit=e.target.querySelector('[type=submit]');submit.disabled=true;try{
            await api('/appointments/'+a.id,{
              method:'PATCH',body:{
                slot_id:slot.value
              }
            });dialog.close();toast(L('Приём перенесён','Қабылдау ауыстырылды'));ctx.render();
          }catch(e){
            dialog.querySelector('.form-error').textContent=errorText(e);submit.disabled=false;
          }
        };
      });
      const dateInput=document.querySelector('#calendar-date');
      if(dateInput)dateInput.onchange=()=>{
        p.set('date',dateInput.value);
        ctx.go('/clinic-dashboard?'+p);
      };
      const filters=document.querySelector('#appointment-filters');
      if(filters)filters.onsubmit=e=>{
        e.preventDefault();
        ctx.go('/clinic-dashboard?'+new URLSearchParams({
          tab:'appointments',...Object.fromEntries(new FormData(filters))
        }));
      };
    }
  };
}
export async function admin(ctx){
  if(!ctx.user)return protectedView();
  if(ctx.user.role!=='platform_admin')return forbidden();
  const d=await api('/admin'),p=new URLSearchParams(location.search),tab=p.get('tab')||'clinics';
  const sections=[['clinics',L('Клиники','Клиникалар'),'building'],['categories',L('Категории услуг','Қызмет санаттары'),'tooth'],['complaints',L('Жалобы','Шағымдар'),'chat'],['users',L('Доступ пользователей','Пайдаланушы рұқсаты'),'user'],['audit',L('Журнал аудита','Аудит журналы'),'shield']];
  let content='';
  if(tab==='clinics')content=`<div class="stats"><div class="stat"><span>${L('Клиники','Клиникалар')}</span><strong>${d.clinics.length}</strong></div><div class="stat"><span>${L('На проверке','Тексерілуде')}</span><strong>${d.clinics.filter(c=>!c.approved).length}</strong></div><div class="stat"><span>${L('Всего заявок','Барлық өтінімдер')}</span><strong>${d.appointments}</strong></div></div><div class="panel">${d.clinics.map(c=>`<div class="clinic-list-row"><div><h3>${esc(c.name)}</h3><p>${esc(c.addressRu)}</p><span class="badge ${c.approved?'confirmed':'pending'}">${c.approved?L('Опубликована','Жарияланған'):L('Ожидает проверки','Тексеруді күтуде')}</span></div><button class="btn ${c.approved?'':'primary'}" data-moderate="${esc(c.id)}" data-approved="${!c.approved}">${c.approved?L('Скрыть карточку','Карточканы жасыру'):L('Подтвердить клинику','Клиниканы растау')}</button></div>`).join('')}</div>`;
  if(tab==='categories')content=`<div class="panel">${d.services.map(s=>`<div class="service-row">${esc(nameOf(s,lang))}</div>`).join('')}<form id="category-form" class="form-grid spaced" novalidate><h3>${L('Новая категория','Жаңа санат')}</h3>${field('ru',L('Название на русском','Орыс тіліндегі атауы'),{required:true})}${field('kz',L('Название на казахском','Қазақ тіліндегі атауы'),{required:true})}<p class="form-error" role="alert"></p><button class="btn primary" type="submit">${L('Добавить категорию','Санат қосу')}</button></form></div>`;
  if(tab==='complaints')content=d.complaints.length?`<div class="panel">${d.complaints.map(x=>`<div class="clinic-list-row"><p>${esc(x.text)}</p><span>${esc(x.status)}</span><button class="btn small" data-resolve="${esc(x.id)}">${L('Завершить рассмотрение','Қарауды аяқтау')}</button></div>`).join('')}</div>`:`<div class="empty">${icon('shield')}<h2>${L('Нет обращений','Өтініштер жоқ')}</h2><p>${L('Жалобы появятся после подключения канала поддержки.','Шағымдар қолдау арнасы қосылғаннан кейін пайда болады.')}</p></div>`;
  if(tab==='users')content=`<div class="panel">${d.users.filter(u=>u.id!==ctx.user.id).map(u=>`<div class="clinic-list-row"><div><h3>${esc(u.name||L('Пользователь','Пайдаланушы'))}</h3><p>${esc(u.id)}</p></div><button class="btn small" data-user="${esc(u.id)}" data-blocked="${!u.blocked}">${u.blocked?L('Восстановить доступ','Қолжетімділікті қалпына келтіру'):L('Заблокировать','Бұғаттау')}</button></div>`).join('')||`<p class="muted">${L('Других пользователей пока нет.','Басқа пайдаланушылар әзірге жоқ.')}</p>`}</div>`;
  if(tab==='audit')content=dataTable(
    L('Журнал аудита', 'Аудит журналы'),
    [L('Время (Алматы)', 'Уақыт (Алматы)'), L('Действие', 'Әрекет'), L('Объект', 'Нысан')],
    d.audit.slice(0,100).map(a => [`${dateLabel(a.at)} ${timeLabel(a.at)}`, esc(a.action), esc(a.target)]),
    L('Действий пока нет', 'Әрекеттер әзірге жоқ')
  );
  return {
    html:`<div class="workspace"><aside class="workspace-sidebar"><small>QLine</small><nav class="sidebar-links">${sections.map(([id,t,i])=>`<a href="/admin?tab=${id}" class="${tab===id?'active':''}">${icon(i)}${t}</a>`).join('')}</nav></aside><div class="workspace-main"><div class="workspace-heading"><div><h1>${L('Управление QLine','QLine басқару')}</h1><p>${L('Модерация, доступ и прозрачность действий','Модерация, рұқсаттар және әрекеттердің ашықтығы')}</p></div><span class="badge">${L('Администратор платформы','Платформа әкімшісі')}</span></div>${content}</div></div>`,bind(){
      const mutate=async(b,path,body)=>{
        b.disabled=true;
        try{
          await api(path,{
            method:'PATCH',body
          });
          toast(L('Изменения сохранены','Өзгерістер сақталды'));
          ctx.render();
        }catch(e){
          toast(errorText(e));
          b.disabled=false;
        }
      };
      document.querySelectorAll('[data-moderate]').forEach(b=>b.onclick=async()=>{
        if(!await ask(L('Изменить видимость клиники?','Клиниканың көрінуін өзгертесіз бе?'),L('Действие будет записано в журнал аудита.','Әрекет аудит журналына жазылады.'),b.textContent))return;mutate(b,'/admin/clinics/'+b.dataset.moderate,{
          approved:b.dataset.approved==='true'
        });
      });
      document.querySelectorAll('[data-user]').forEach(b=>b.onclick=async()=>{
        if(!await ask(L('Изменить доступ?','Қолжетімділікті өзгертесіз бе?'),L('Изменение вступит в силу для следующих запросов.','Өзгеріс келесі сұраулар үшін күшіне енеді.'),b.textContent))return;mutate(b,'/admin/users/'+b.dataset.user,{
          blocked:b.dataset.blocked==='true'
        });
      });
      document.querySelectorAll('[data-resolve]').forEach(b=>b.onclick=()=>mutate(b,'/admin/complaints/'+b.dataset.resolve,{
      }));
      const f=document.querySelector('#category-form');
      if(f)f.onsubmit=async e=>{
        e.preventDefault();
        const b=f.querySelector('button');
        b.disabled=true;
        try{
          await api('/admin/categories',{
            method:'POST',body:Object.fromEntries(new FormData(f))
          });
          ctx.render();
        }catch(e){
          f.querySelector('.form-error').textContent=errorText(e);
          b.disabled=false;
        }
      };
    }
  };
}
