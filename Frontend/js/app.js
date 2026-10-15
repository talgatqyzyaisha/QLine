import { forgotPassword, confirmEmail, resetPassword, phoneLogin } from './auth.js';
import { bindResponsiveMenu } from './navigation.js';
import {
  api
}
from './api.js';
import {
  services
}
from './data.js';
import {
  lang,setLang,L
}
from './i18n.js';
import {
  esc,icon,logo,errorView,skeleton,toast
}
from './ui.js';
import {
  home,catalog,detail
}
from './public.js';
import {
  booking,success
}
from './booking.js';
import {
  login,appointments,profile,clinicRegister
}
from './account.js';
import {
  dashboard,admin
}
from './dashboard.js';
let user=null,sequence=0;
let disposeMenu = () => {};
const ctx={
  get user(){
    return user;
  },go,render,refreshUser
};
async function refreshUser(){
  user=await api('/me');
  return user;
}
function header(){
  return `<header class="topbar"><div class="container header-inner">${logo()}<nav class="nav-links" aria-label="${L('Основная навигация','Негізгі навигация')}"><a href="/clinics">${L('Найти стоматолога','Тіс дәрігерін табу')}</a><a href="/clinics">${L('Клиники','Клиникалар')}</a><a href="/#services">${L('Услуги','Қызметтер')}</a><a href="/#how-it-works">${L('Как это работает','Қалай жұмыс істейді')}</a></nav><div class="header-actions"><div class="language"><button data-lang="ru" class="${lang==='ru'?'active':''}" aria-pressed="${lang==='ru'}">RU</button><span>/</span><button data-lang="kz" class="${lang==='kz'?'active':''}" aria-pressed="${lang==='kz'}">KZ</button></div><a class="btn ghost ${user?'user-button':''}" href="${user?'/my-appointments':'/login'}">${user?icon('user'):''}${user?L('Мой кабинет','Жеке кабинет'):L('Войти','Кіру')}</a><a class="btn primary" href="${user&&['owner','administrator','dentist'].includes(user.role)?'/clinic-dashboard':'/clinic-register'}">${L('Для клиник','Клиникаларға')}</a>${user?`<button class="btn ghost logout-desktop" data-action="logout" aria-label="${L('Выйти','Шығу')}">${icon('logout')}</button>`:''}<button class="btn menu-button" data-action="menu" aria-expanded="false" aria-controls="mobile-menu" aria-label="${L('Открыть меню','Мәзірді ашу')}">${icon('menu')}</button></div></div><nav class="mobile-menu" id="mobile-menu" hidden aria-label="${L('Мобильное меню','Мобильді мәзір')}"><a href="/clinics">${L('Найти стоматолога','Тіс дәрігерін табу')}</a><a href="/#services">${L('Услуги','Қызметтер')}</a><a href="/#how-it-works">${L('Как это работает','Қалай жұмыс істейді')}</a><a href="/my-appointments">${L('Мои записи','Менің жазылуларым')}</a><a href="/clinic-register">${L('Подключить клинику','Клиниканы қосу')}</a>${user&&['owner','administrator','dentist'].includes(user.role)?`<a href="/clinic-dashboard">${L('Кабинет клиники','Клиника кабинеті')}</a>`:''}${user?`<button class="btn small" data-action="logout">${L('Выйти','Шығу')}</button>`:`<a href="/login">${L('Войти','Кіру')}</a>`}${user?.role==='platform_admin'?`<a href="/admin">${L('Администрирование','Әкімшілік')}</a>`:''}</nav></header>`;
}
function footer(){
  return `<footer class="footer"><div class="container"><div class="footer-grid"><div>${logo()}<p>${L('Ваша улыбка начинается<br>с правильного выбора.','Күлкіңіз дұрыс<br>таңдаудан басталады.')}</p></div><div><h4>${L('Для пациентов','Пациенттерге')}</h4><div class="footer-links"><a href="/clinics">${L('Найти клинику','Клиника табу')}</a><a href="/#services">${L('Популярные услуги','Танымал қызметтер')}</a><a href="/my-appointments">${L('Мои записи','Менің жазылуларым')}</a><a href="/#how-it-works">${L('Как это работает','Қалай жұмыс істейді')}</a></div></div><div><h4>${L('Для клиник','Клиникаларға')}</h4><div class="footer-links"><a href="/clinic-register">${L('Стать партнёром','Серіктес болу')}</a><a href="/clinic-dashboard">${L('Кабинет клиники','Клиника кабинеті')}</a></div></div><div><h4>QLine</h4><div class="footer-links"><a href="/about">${L('О платформе','Платформа туралы')}</a><a href="/contacts">${L('Контакты','Байланыс')}</a><span>${L('Сделано для Казахстана','Қазақстан үшін жасалған')}</span></div></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} QLine. ${L('Забота начинается с выбора.','Қамқорлық таңдаудан басталады.')}</span><div class="legal-links"><a href="/legal/privacy">${L('Конфиденциальность','Құпиялылық')}</a><a href="/legal/agreement">${L('Пользовательское соглашение','Пайдаланушы келісімі')}</a><a href="/legal/terms">${L('Условия использования','Пайдалану шарттары')}</a></div></div><p class="footer-note" style="max-width:none">¹ ${L('Напоминания доступны после подключения провайдера уведомлений.','Еске салу хабарлама провайдері қосылғаннан кейін қолжетімді.')}</p></div></footer>`;
}
async function info(path){
  let legal={
  };
  try{
    const r=await fetch('/content/legal.'+lang+'.json');
    if(r.ok)legal=await r.json();
  }catch{
  }
  let title,text;
  if(path==='/about'){
    title=L('Знакомьтесь, QLine','Танысыңыз, QLine');
    text=L('Мы создаём платформу поиска стоматологических клиник и онлайн-записи в Казахстане. Наша цель — помочь выбрать подходящего врача и удобное время.','Біз Қазақстанда стоматологияларды іздеу және онлайн жазылу платформасын құрып жатырмыз. Мақсатымыз — лайықты дәрігер мен ыңғайлы уақытты таңдауға көмектесу.');
  }else if(path==='/contacts'){
    title=L('Контакты','Байланыс');
    text=legal.contact||L('Контактные данные поддержки будут опубликованы после их утверждения.','Қолдау қызметінің байланыс деректері бекітілгеннен кейін жарияланады.');
  }else{
    const titles={
      privacy:L('Политика конфиденциальности','Құпиялылық саясаты'),agreement:L('Пользовательское соглашение','Пайдаланушы келісімі'),terms:L('Условия использования','Пайдалану шарттары')
    };
    title=titles[path.split('/')[2]];
    if(!title)return notFound();
    text=legal[path.split('/')[2]]||L('Документ находится на согласовании. Это редактируемая заглушка, а не утверждённый юридический документ. Регистрация и отправка заявок откроются после публикации согласованных условий.','Құжат келісілуде. Бұл бекітілген заңды құжат емес, өңделетін уақытша мәтін. Тіркелу және өтінім жіберу келісілген шарттар жарияланғаннан кейін ашылады.');
  }
  return {
    html:`<div class="content-narrow"><h1>${title}</h1><p>${esc(text)}</p><a class="btn primary" href="/">${L('На главную','Басты бетке')}</a></div>`,bind(){
    }
  };
}
function notFound(){
  return {
    html:`<div class="content-narrow"><div class="empty"><div class="eyebrow">404</div><h1>${L('Страница не найдена','Бет табылмады')}</h1><p>${L('Проверьте адрес или вернитесь к поиску клиник.','Мекенжайды тексеріңіз немесе клиникаларды іздеуге оралыңыз.')}</p><a class="btn primary" href="/clinics">${L('Найти клинику','Клиника табу')}</a></div></div>`,bind(){
    }
  };
}
function titleFor(path){
  if(path==='/')return L('Ваша улыбка начинается здесь','Күлкіңіз осы жерден басталады');
  if(path==='/clinics')return L('Каталог стоматологий','Стоматологиялар каталогы');
  if(path.startsWith('/book/'))return L('Онлайн-запись','Онлайн жазылу');
  if(path==='/clinic-dashboard')return L('Кабинет клиники','Клиника кабинеті');
  if(path==='/admin')return L('Администрирование','Әкімшілік');
  if(path==='/my-appointments')return L('Мои записи','Менің жазылуларым');
  if(['/login','/register'].includes(path))return L('Вход','Кіру');
  return L('Забота о вашей улыбке','Күлкіңізге қамқорлық');
}
export function go(url){
  history.pushState({
  },'',url);
  render(true);
}
export async function render(scroll=false){
  const n=++sequence;
  setLang(lang);
  document.querySelector('#skip').textContent=L('К содержимому','Мазмұнға өту');
  document.querySelector('#app').innerHTML=header()+`<main id="main" tabindex="-1">${skeleton()}</main>`+footer();
  bindShell();
  const path=location.pathname.replace(/\/$/,'')||'/';
  document.title=titleFor(path)+' · QLine';
  let page;
  try{
    const taxonomy=await api('/services');
    if(sequence!==n)return;
    services.splice(0,services.length,...taxonomy);
    if(path==='/')page=await home(ctx);
    else if(path==='/clinics')page=await catalog(ctx);
    else if(path.startsWith('/clinics/'))page=await detail(ctx,decodeURIComponent(path.split('/')[2]));
    else if(path.startsWith('/book/'))page=await booking(ctx,decodeURIComponent(path.split('/')[2]));
    else if(path.startsWith('/booking-success/'))page=await success(ctx,path.split('/')[2]);
    else if(path==='/forgot-password')page=await forgotPassword(ctx);
    else if(path==='/auth/confirm')page=await confirmEmail(ctx);
    else if(path==='/reset-password')page=await resetPassword(ctx);
    else if(path==='/login/phone')page=await phoneLogin(ctx);
    else if(path==='/login'||path==='/register')page=await login(ctx,path==='/register');
    else if(path==='/profile')page=await profile(ctx);
    else if(path==='/my-appointments')page=await appointments(ctx);
    else if(path==='/clinic-register')page=await clinicRegister(ctx);
    else if(path==='/clinic-dashboard')page=await dashboard(ctx);
    else if(path==='/admin')page=await admin(ctx);
    else if(['/about','/contacts'].includes(path)||path.startsWith('/legal/'))page=await info(path);
    else page=notFound();
  }catch(error){
    page={
      html:errorView(error),bind(){
        document.querySelector('[data-action=retry]').onclick=()=>render();
      }
    };
    document.title=L('Ошибка загрузки','Жүктеу қатесі')+' · QLine';
  }
  if(sequence!==n)return;
  document.querySelector('#main').innerHTML=page.html;
  page.bind();
  const h=document.querySelector('main h1');
  if(h)document.title=h.textContent+' · QLine';
  if(scroll){
    if(location.hash)document.getElementById(location.hash.slice(1))?.scrollIntoView();
    else{
      window.scrollTo({
        top:0,behavior:'instant'
      });
      document.querySelector('#main').focus({
        preventScroll:true
      });
    }
  }
}
function bindShell(){
  disposeMenu();
  disposeMenu = bindResponsiveMenu({button: document.querySelector('[data-action=menu]'), menu: document.querySelector('#mobile-menu')});
  document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{
    setLang(b.dataset.lang);render();
  });
  document.querySelectorAll('[data-action=logout]').forEach(button => button.onclick = async () => {
    button.disabled = true;
    try { await api('/auth/logout', {method:'POST'}); }
    catch { toast(L('Вы вышли на этом устройстве. Не удалось проверить завершение сеанса на сервере.', 'Бұл құрылғыдан шықтыңыз. Сервердегі сеанстың аяқталғанын тексеру мүмкін болмады.')); }
    finally { user = null; go('/login'); }
  });
}
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||a.target||a.hasAttribute('download'))return;const url=new URL(a.href,location.origin);if(url.origin!==location.origin)return;if(url.pathname===location.pathname&&url.search===location.search&&url.hash){
    document.getElementById(url.hash.slice(1))?.scrollIntoView();return;
  }
  e.preventDefault();go(url.pathname+url.search+url.hash);
});
window.addEventListener('popstate',()=>render(true));
window.addEventListener('offline',()=>toast(L('Вы не в сети. Изменения не отправляются на сервер.','Желіге қосылмағансыз. Өзгерістер серверге жіберілмейді.')));
try{
  await refreshUser();
}catch{
  user=null;
}
await render();
