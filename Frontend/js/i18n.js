export let lang=localStorage.getItem('qline-lang')==='kz'?'kz':'ru';
export function setLang(value){
  lang=value;
  localStorage.setItem('qline-lang',value);
  document.documentElement.lang=value==='kz'?'kk':'ru';
}
export const L=(ru,kz)=>lang==='kz'?kz:ru;
export const locale=()=>lang==='kz'?'kk-KZ':'ru-KZ';
export const money=n=>new Intl.NumberFormat(locale()).format(n)+' ₸';
export const dateLabel=value=>new Intl.DateTimeFormat(locale(),{
  day:'numeric',month:'long',timeZone:'Asia/Almaty'
}).format(new Date(value.includes('T')?value:value+'T12:00:00+05:00'));
export const timeLabel=value=>new Intl.DateTimeFormat(locale(),{
  hour:'2-digit',minute:'2-digit',timeZone:'Asia/Almaty'
}).format(new Date(value));
export const districtName=id=>({
  bostandyk:L('Бостандыкский район','Бостандық ауданы'),medeu:L('Медеуский район','Медеу ауданы'),almaly:L('Алмалинский район','Алмалы ауданы')
})[id]||id;
export const statusLabel=id=>({
  pending:L('Ожидает подтверждения','Растауды күтуде'),confirmed:L('Подтверждена','Расталды'),cancelled:L('Отменена','Бас тартылды'),completed:L('Завершена','Аяқталды'),no_show:L('Неявка','Келмеді')
})[id]||id;
export const errors={
  PASSWORD_UPDATED_RELOGIN:()=>L('Пароль изменён. Войдите с новым паролем; завершение остальных сеансов требует повторной проверки.','Құпиясөз өзгертілді. Жаңа құпиясөзбен кіріңіз; басқа сеанстарды аяқтауды қайта тексеру қажет.'),
  INVALID_CREDENTIALS:()=>L('Email или пароль неверны. Если вы только зарегистрировались, подтвердите почту.','Email немесе құпиясөз қате. Жаңа тіркелсеңіз, поштаңызды растаңыз.'),
  AUTH_LINK_INVALID:()=>L('Ссылка восстановления недействительна или истекла. Запросите новую.','Қалпына келтіру сілтемесі жарамсыз немесе мерзімі өткен. Жаңасын сұраңыз.'),
  PASSWORD_WEAK:()=>L('Укажите надёжный пароль от 12 до 128 символов.','12–128 таңбадан тұратын сенімді құпиясөз енгізіңіз.'),
  RATE_LIMITED:()=>L('Слишком много запросов. Подождите и повторите попытку.','Сұраулар тым көп. Күтіп, қайталап көріңіз.'),
  SETUP_REQUIRED:()=>L('Сервис ещё настраивается. Попробуйте позже.','Сервис әлі бапталуда. Кейінірек қайталап көріңіз.'),
  OFFLINE:()=>L('Нет соединения с сервером. Проверьте интернет и повторите.','Сервермен байланыс жоқ. Интернетті тексеріп, қайталаңыз.'), CONFLICT:()=>L('Это время уже занято. Выберите другой слот.','Бұл уақыт бос емес. Басқа уақытты таңдаңыз.'), INVALID:()=>L('Проверьте заполнение полей.','Өрістерді тексеріңіз.'), UNAUTHORIZED:()=>L('Войдите, чтобы продолжить.','Жалғастыру үшін кіріңіз.'), FORBIDDEN:()=>L('Нет доступа к этому разделу.','Бұл бөлімге қолжетімділік жоқ.'), SMS_DISABLED:()=>L('SMS-вход ещё не подключён.','SMS арқылы кіру әлі қосылмаған.'), LEGAL_PENDING:()=>L('Действие недоступно до публикации утверждённых условий.','Бекітілген шарттар жарияланғанша әрекет қолжетімсіз.'), SERVER:()=>L('Не удалось выполнить действие. Повторите попытку.','Әрекет орындалмады. Қайталап көріңіз.'), NOT_FOUND:()=>L('Запись не найдена.','Жазба табылмады.')
};
