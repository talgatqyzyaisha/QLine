import {
  api
}
from './api.js';
import {
  services,nameOf,localDate
}
from './data.js';
import {
  lang,L,money,districtName,dateLabel
}
from './i18n.js';
import {
  esc,icon,field
}
from './ui.js';
export const serviceName=id=>nameOf(services.find(s=>s.id===id),lang)||id;
export const clinicAddress=c=>lang==='ru'?c.addressRu:c.addressKz;
export const doctorName=d=>lang==='ru'?d?.nameRu:d?.nameKz;
export function clinicImageSrc(c) {
  try { const url=new URL(c.image);if(url.origin===window.Q_CONFIG?.storageOrigin && url.protocol==='https:')return url.href; } catch {}
  return '/assets/clinic-placeholder.svg';
}
export const priceLabel=(c,id)=>Number.isFinite(c.serviceDetails?.[id]?.price)?money(c.serviceDetails[id].price):L('Цена по запросу','Бағасы сұрау бойынша');
export function clinicCard(c){
  return `<article class="clinic-card"><a class="card-image" href="/clinics/${esc(c.slug)}"><img src="${esc(clinicImageSrc(c))}" alt="${L('Иллюстрация стоматологического кабинета','Стоматология кабинетінің иллюстрациясы')}" width="600" height="334" loading="lazy"></a><div class="card-content"><a href="/clinics/${esc(c.slug)}"><h3>${esc(c.name)}</h3></a><div class="address">${icon('pin')}${esc(clinicAddress(c))}</div><p>${esc(lang==='ru'?c.descriptionRu:c.descriptionKz)}</p><div class="tags">${c.services.slice(0,2).map(s=>`<a class="tag" href="/clinics?service=${esc(s)}">${esc(serviceName(s))}</a>`).join('')}</div><div class="card-price"><span>${L('Консультация','Кеңес')}</span><strong>${c.price?L('от ','')+money(c.price):L('Цена по запросу','Бағасы сұрау бойынша')}</strong></div><div class="card-actions"><a class="btn" href="/clinics/${esc(c.slug)}">${L('Подробнее','Толығырақ')}</a><a class="btn primary" href="/book/${esc(c.slug)}">${L('Записаться','Жазылу')}</a></div></div></article>`;
}
const cityOptions=()=>[['almaty',L('Алматы','Алматы')],['astana',L('Астана','Астана')]];
export function searchForm(){
  return `<form class="search-panel" id="hero-search" novalidate><div class="search-part">${icon('pin')}${field('city',L('Город','Қала'),{options:cityOptions(),value:'almaty'})}</div><div class="search-part">${icon('tooth')}${field('service',L('Услуга или специализация','Қызмет немесе мамандық'),{options:[['',L('Что вас беспокоит?','Қандай қызмет іздейсіз?')],...services.map(s=>[s.id,nameOf(s,lang)])]})}</div><div class="search-part">${icon('calendar')}${field('date',L('Дата приёма','Қабылдау күні'),{type:'date',min:localDate()})}</div><button class="btn primary" type="submit">${icon('search')}${L('Найти стоматолога','Тіс дәрігерін табу')}</button></form>`;
}
export async function home(ctx){
  const clinics=await api('/clinics');
  return {
    html:`<section class="hero container"><div class="hero-grid"><div class="hero-copy"><span class="hero-label">${icon('heart')}${L('Забота о вашей улыбке — ближе','Күлкіңізге қамқорлық — жақынырақ')}</span><h1>${L('Найдите своего<br> стоматолога.<br> <em>Запишитесь онлайн.</em>','Өз тіс дәрігеріңізді<br> табыңыз.<br> <em>Онлайн жазылыңыз.</em>')}</h1><p>${L('Сравнивайте стоматологические клиники, изучайте услуги и цены и выбирайте удобное время приёма без лишних звонков.','Стоматологияларды салыстырып, қызметтер мен бағаларды қарап, қоңыраусыз ыңғайлы уақытқа жазылыңыз.')}</p></div><div class="hero-media"><img src="/assets/dental-hero.png" alt="${L('Светлый современный стоматологический кабинет — иллюстрация','Жарық заманауи стоматология кабинеті — иллюстрация')}" width="1200" height="850" fetchpriority="high"><div class="floating-note"><span class="well">${icon('check')}</span><div><strong>${L('Ваше время — для вас','Уақытыңыз — өзіңізге')}</strong><span class="muted">${L('Запись без лишних звонков','Артық қоңыраусыз жазылу')}</span></div></div><span class="image-note">${L('Иллюстрация','Иллюстрация')}</span></div></div>${searchForm()}<div class="trust-row"><span>${icon('check')}${L('Удобная онлайн-запись','Ыңғайлы онлайн жазылу')}</span><span>${icon('check')}${L('Услуги и цены в одном месте','Қызметтер мен бағалар бір жерде')}</span><span>${icon('check')}${L('Напоминания о приёме¹','Қабылдау туралы еске салу¹')}</span></div></section><section class="section container" id="services"><div class="section-heading"><div><h2>${L('С чего начнём?','Неден бастаймыз?')}</h2><p>${L('Выберите услугу — мы поможем найти подходящую клинику','Қызметті таңдаңыз — лайықты клиниканы табуға көмектесеміз')}</p></div><a href="/clinics" class="link">${L('Все услуги','Барлық қызметтер')}${icon('arrow')}</a></div><div class="service-grid">${services.map(s=>`<a class="service-card" href="/clinics?service=${s.id}"><span class="well">${icon(s.icon)}</span><h3>${esc(nameOf(s,lang))}</h3><span class="service-bottom"><span>${L('Найти клинику','Клиника табу')}</span>${icon('arrow')}</span></a>`).join('')}</div></section><section class="section container"><div class="section-heading"><div><h2>${L('Клиники, с которыми ближе к улыбке','Күлкіге жақындататын клиникалар')}</h2><p>${L('Познакомьтесь с клиниками и выберите свою','Клиникалармен танысып, өзіңізге лайықтысын таңдаңыз')}</p></div><a class="link" href="/clinics">${L('Все клиники','Барлық клиникалар')}${icon('arrow')}</a></div><div class="cards">${clinics.slice(0,3).map(clinicCard).join('')||`<div class="empty">${L('Клиники скоро появятся','Клиникалар жақында қосылады')}</div>`}</div></section><section class="soft-section" id="how-it-works"><div class="container"><div class="text-center"><span class="eyebrow">${L('ПРОСТО. УДОБНО. ОНЛАЙН.','ҚАРАПАЙЫМ. ЫҢҒАЙЛЫ. ОНЛАЙН.')}</span><h2>${L('Три шага к здоровой улыбке','Сау күлкіге үш қадам')}</h2></div><div class="steps">${[[L('Найдите свою клинику','Клиникаңызды табыңыз'),L('Выбирайте по расположению, услугам и стоимости. Всё важное — на одной странице.','Орналасуы, қызметі және бағасы бойынша таңдаңыз. Маңызды ақпарат бір бетте.')],[L('Выберите удобное время','Ыңғайлы уақытты таңдаңыз'),L('Найдите своего врача и свободное время в расписании. Без ожидания на линии.','Дәрігерді және кестедегі бос уақытты таңдаңыз. Телефонда күтудің қажеті жоқ.')],[L('Приходите на приём','Қабылдауға келіңіз'),L('Отправьте заявку и дождитесь подтверждения клиники в личном кабинете.','Өтінімді жіберіп, жеке кабинетте клиниканың растауын күтіңіз.')]].map((s,i)=>`<div class="step"><span class="step-number">${i+1}</span><h3>${s[0]}</h3><p>${s[1]}</p></div>`).join('')}</div></div></section><section class="section container"><div class="partner"><div><div class="eyebrow">${L('QLINE ДЛЯ БИЗНЕСА','БИЗНЕСКЕ АРНАЛҒАН QLINE')}</div><h2>${L('Вы заботитесь об улыбках.<br>Мы — о записи.','Сіз күлкіге қамқор болыңыз.<br>Жазылуды бізге сеніп тапсырыңыз.')}</h2><p>${L('Привлекайте пациентов с QLine. Представьте свою клинику, управляйте доступными слотами и получайте онлайн-записи в одном интерфейсе.','QLine арқылы пациенттерді тартыңыз. Клиникаңызды таныстырып, бос уақыттарды басқарыңыз және онлайн жазылуларды бір жерден қабылдаңыз.')}</p><a class="btn primary" href="/clinic-register">${L('Подключить клинику','Клиниканы қосу')}${icon('arrow')}</a></div><div class="partner-features">${[['user',L('Новый канал привлечения пациентов','Пациенттерді тартудың жаңа арнасы')],['clock',L('Онлайн-запись 24/7','Тәулік бойы онлайн жазылу')],['calendar',L('Расписание под контролем','Кесте бақылауда')],['chart',L('Все записи в одном месте','Барлық жазылу бір жерде')]].map(([i,t])=>`<div>${icon(i)}<h3>${t}</h3></div>`).join('')}</div></div></section>`,bind(){
      document.querySelector('#hero-search').onsubmit=e=>{
        e.preventDefault();
        const p=new URLSearchParams(new FormData(e.target));
        for(const [k,v]of [...p])if(!v)p.delete(k);
        ctx.go('/clinics?'+p);
      };
    }
  };
}
export async function catalog(ctx){
  const p=new URLSearchParams(location.search),service=p.get('service')||'';
  let all=await api('/clinics?'+p);
  let rows=all.filter(c=>(!p.get('q')||c.name.toLowerCase().includes(p.get('q').toLowerCase()))&&(!p.get('city')||c.city===p.get('city'))&&(!p.get('district')||c.district===p.get('district'))&&(!service||c.services.includes(service))&&(!p.get('price')||(c.serviceDetails?.[service]?.price||services.find(s=>s.id===service)?.price||c.price)<=+p.get('price')));
  if(p.get('date')){
    const available=await Promise.all(rows.map(c=>api('/slots?'+new URLSearchParams({
      clinic:c.id,service,date:p.get('date')
    }))));
    rows=rows.filter((c,i)=>available[i].some(s=>!p.get('time')||new Date(s.starts_at).toLocaleTimeString('en-GB',{
      timeZone:'Asia/Almaty',hour:'2-digit',minute:'2-digit'
    })>=p.get('time')));
  }
  if(p.get('sort')==='price')rows.sort((a,b)=>(a.serviceDetails?.[service]?.price||services.find(s=>s.id===service)?.price||a.price)-(b.serviceDetails?.[service]?.price||services.find(s=>s.id===service)?.price||b.price));
  const total=rows.length;
  const page=Math.min(Math.max(1,+p.get('page')||1),Math.ceil(total/12)||1);
  rows=rows.slice((page-1)*12,page*12);
  return {
    html:`<div class="container page-heading"><div class="breadcrumbs"><a href="/">${L('Главная','Басты бет')}</a>${icon('chevron')}<span>${L('Каталог клиник','Клиникалар каталогы')}</span></div><h1>${L('Стоматологии рядом с вами','Сізге жақын стоматологиялар')}</h1><p>${L('Подходящая клиника начинается с вашего выбора','Лайықты клиника сіздің таңдауыңыздан басталады')}</p></div><div class="container catalog-layout"><div class="catalog-mobile-tools"><button class="btn mobile-filter" type="button" data-action="filters" aria-controls="filters" aria-expanded="false">${icon('filter')}${L('Фильтры','Сүзгілер')}</button></div><aside class="panel filter-panel" id="filters" tabindex="-1"><h3>${L('Подобрать клинику','Клиниканы таңдау')}</h3><form id="filter-form" novalidate>${field('q',L('Название клиники','Клиника атауы'),{value:p.get('q'),placeholder:L('Например, Lumina','Мысалы, Lumina')})}${field('city',L('Город','Қала'),{options:[['',L('Все города','Барлық қалалар')],...cityOptions()],value:p.get('city')})}${field('district',L('Район','Аудан'),{options:[['',L('Все районы','Барлық аудандар')],...['bostandyk','medeu','almaly'].map(d=>[d,districtName(d)])],value:p.get('district')})}${field('service',L('Услуга','Қызмет'),{options:[['',L('Все услуги','Барлық қызметтер')],...services.map(s=>[s.id,nameOf(s,lang)])],value:service})}${field('price',L('Стоимость до, ₸','Ең жоғары баға, ₸'),{type:'number',min:'0',value:p.get('price')})}${field('date',L('Дата приёма','Қабылдау күні'),{type:'date',value:p.get('date'),min:localDate()})}${field('time',L('Время после','Көрсетілген уақыттан кейін'),{type:'time',value:p.get('time'),help:L('Укажите дату для поиска по времени','Уақыт бойынша іздеу үшін күнді көрсетіңіз')})}<button class="btn primary" type="submit">${L('Показать клиники','Клиникаларды көрсету')}</button><a class="btn ghost" href="/clinics">${L('Сбросить фильтры','Сүзгілерді тазалау')}</a></form></aside><section><div class="catalog-toolbar"><p>${L('Найдено клиник','Табылған клиникалар')}: <strong>${total}</strong></p><label><span class="skip">${L('Сортировка','Сұрыптау')}</span><select id="sort" aria-label="${L('Сортировка','Сұрыптау')}"><option value="relevance">${L('По релевантности','Сәйкестігі бойынша')}</option><option value="price" ${p.get('sort')==='price'?'selected':''}>${L('Сначала дешевле','Алдымен арзандары')}</option></select></label></div><div class="cards catalog-cards">${rows.map(clinicCard).join('')||`<div class="empty">${icon('search')}<h2>${L('Подходящих клиник пока нет','Лайықты клиникалар әзірге жоқ')}</h2><p>${L('Попробуйте другую услугу, дату или расширьте поиск.','Басқа қызметті, күнді таңдаңыз немесе іздеуді кеңейтіңіз.')}</p><a class="btn primary" href="/clinics">${L('Очистить фильтры','Сүзгілерді тазалау')}</a></div>`}</div>${total>12?`<div class="pagination">${page>1?`<a class="btn" href="/clinics?${new URLSearchParams({...Object.fromEntries(p),page:page-1})}">←</a>`:''}<span>${page} / ${Math.ceil(total/12)}</span>${page*12<total?`<a class="btn" href="/clinics?${new URLSearchParams({...Object.fromEntries(p),page:page+1})}">→</a>`:''}</div>`:''}</section></div>`,bind(){
      document.querySelector('#filter-form').onsubmit=e=>{
        e.preventDefault();
        const f=new URLSearchParams(new FormData(e.target));
        if(!f.get('date'))f.delete('time');
        for(const[k,v]of [...f])if(!v)f.delete(k);
        f.set('sort',document.querySelector('#sort').value);
        ctx.go('/clinics?'+f);
      };
      document.querySelector('#sort').onchange=e=>{
        p.set('sort',e.target.value);
        p.delete('page');
        ctx.go('/clinics?'+p);
      };
      document.querySelector('[data-action=filters]').onclick=e=>{
        const panel=document.querySelector('#filters');
        panel.classList.toggle('open');
        e.currentTarget.setAttribute('aria-expanded',panel.classList.contains('open'));
        if(panel.classList.contains('open')){panel.scrollIntoView({block:'start'});panel.querySelector('input,select')?.focus({preventScroll:true});}
      };
    }
  };
}
export async function detail(ctx,slug){
  const c=await api('/clinics/'+encodeURIComponent(slug));
  return {
    html:`<div class="container page-heading"><div class="breadcrumbs"><a href="/">${L('Главная','Басты бет')}</a>${icon('chevron')}<a href="/clinics">${L('Клиники','Клиникалар')}</a>${icon('chevron')}<span>${esc(c.name)}</span></div><div class="gallery gallery-single"><img src="${esc(clinicImageSrc(c))}" width="900" height="545" alt="${L('Иллюстрация интерьера клиники','Клиника интерьерінің иллюстрациясы')}"></div></div><div class="container detail-layout"><div class="detail-body"><div class="eyebrow">${L('СТОМАТОЛОГИЧЕСКАЯ КЛИНИКА','СТОМАТОЛОГИЯЛЫҚ КЛИНИКА')}</div><h1>${esc(c.name)}</h1><div class="address">${icon('pin')}${esc(clinicAddress(c))} · ${districtName(c.district)}</div><p>${esc(lang==='ru'?c.descriptionRu:c.descriptionKz)}</p><nav class="detail-tabs"><a href="#detail-services">${L('Услуги и цены','Қызметтер мен бағалар')}</a><a href="#detail-doctors">${L('Врачи','Дәрігерлер')}</a><a href="#detail-info">${L('О клинике','Клиника туралы')}</a></nav><section class="detail-section" id="detail-services"><h2>${L('Услуги и цены','Қызметтер мен бағалар')}</h2>${c.services.map(id=>`<div class="service-row"><a href="/book/${esc(c.slug)}?service=${id}">${esc(serviceName(id))}</a><strong>${priceLabel(c,id)}</strong></div>`).join('')}<p class="muted spaced"><small>${L('Окончательную стоимость уточняйте в клинике.','Нақты бағаны клиникадан біліңіз.')}</small></p></section><section class="detail-section" id="detail-doctors"><h2>${L('Специалисты клиники','Клиника мамандары')}</h2>${c.doctors.map(d=>`<div class="doctor-card"><span class="avatar">${esc(d.initials)}</span><div><h3>${esc(doctorName(d))}</h3><p>${esc(serviceName(d.specialty))}</p></div><a class="btn small" href="/book/${esc(c.slug)}?dentist=${esc(d.id)}">${L('Записаться','Жазылу')}</a></div>`).join('')}</section><section class="detail-section" id="detail-info"><h2>${L('Полезно знать','Білгеніңіз жөн')}</h2><div class="info-list"><span>${icon('clock')}${L('Часы работы','Жұмыс уақыты')}: ${esc(c.hours)}</span><span>${icon('pin')}${esc(clinicAddress(c))}</span><span>${icon('info')}${L('Контакты и карта будут добавлены после проверки клиники.','Байланыс ақпараты мен карта клиника тексерілгеннен кейін қосылады.')}</span></div><div class="notice warning spaced">${L('Будущую заявку можно отменить в личном кабинете или отправить запрос на перенос. Уточняйте условия приёма в клинике.','Жеке кабинетте болашақ жазылудан бас тартуға немесе уақытын ауыстыруға сұрау жіберуге болады. Қабылдау шарттарын клиникадан біліңіз.')}</div></section></div><aside class="panel summary"><span class="well">${icon('calendar')}</span><h3 class="spaced">${L('Улыбка начинается<br>с первого шага','Күлкі алғашқы<br>қадамнан басталады')}</h3><p>${L('Выберите услугу, врача и удобное время. Остальное — без звонков.','Қызметті, дәрігерді және ыңғайлы уақытты таңдаңыз. Қоңырау шалудың қажеті жоқ.')}</p><div class="summary-line"><small>${L('Консультация','Кеңес')}</small><strong>${Number.isFinite(c.price)?money(c.price):L('Цена по запросу','Бағасы сұрау бойынша')}</strong></div><a class="btn primary" href="/book/${esc(c.slug)}">${L('Записаться онлайн','Онлайн жазылу')}${icon('arrow')}</a></aside></div>`,bind(){
    }
  };
}
