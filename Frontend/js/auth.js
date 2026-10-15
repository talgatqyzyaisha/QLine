import { api } from './api.js';
import { L } from './i18n.js';
import { field, esc, formError, clearErrors, errorText, icon, toast } from './ui.js';
import { normalizeEmail, emailValid, passwordValid, safeReturn, phone } from '/shared/domain.js';

function passwordField(id, label, autocomplete = 'new-password', help = '') {
  return `<div class="password-field">${field(id, label, { type: 'password', required: true, autocomplete, help })}<button class="btn small ghost password-toggle" type="button" data-password="${id}" aria-controls="${id}" aria-pressed="false">${L('Показать пароль', 'Құпиясөзді көрсету')}</button></div>`;
}
function bindPasswordFields(root) {
  root.querySelectorAll('[data-password]').forEach(button => button.onclick = () => {
    const input = root.querySelector('#' + button.dataset.password);
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(visible));
    button.textContent = visible ? L('Скрыть пароль', 'Құпиясөзді жасыру') : L('Показать пароль', 'Құпиясөзді көрсету');
  });
}
const terms = () => `<a class="link" href="/legal/privacy">${L('Политика конфиденциальности', 'Құпиялылық саясаты')}</a> · <a class="link" href="/legal/terms">${L('Условия использования', 'Пайдалану шарттары')}</a>`;
const signupOpen = () => window.Q_CONFIG?.registrationEnabled === true;

export async function login(ctx, register = false) {
  const destination = safeReturn(new URLSearchParams(location.search).get('return'));
  return {
    html: `<div class="auth-shell"><h1>${register ? L('Создать аккаунт', 'Аккаунт ашу') : L('Войти в QLine', 'QLine-ға кіру')}</h1><p>${L('Ваши записи и забота об улыбке — в одном месте.', 'Жазылуларыңыз бен күлкіңізге қамқорлық — бір жерде.')}</p><div class="panel">
      ${register && !signupOpen() ? `<div class="notice warning">${L('Регистрация откроется после публикации утверждённых условий обработки данных.', 'Деректерді өңдеудің бекітілген шарттары жарияланғаннан кейін тіркелу ашылады.')}</div>` : ''}
      <form id="auth-form" class="form-grid" novalidate>
      ${register ? field('name', L('Ваше имя', 'Атыңыз'), { required: true, autocomplete: 'given-name' }) : ''}
      ${field('email', 'Email', { type: 'email', required: true, autocomplete: 'email', placeholder: 'you@example.com' })}
      ${passwordField('password', L('Пароль', 'Құпиясөз'), register ? 'new-password' : 'current-password', register ? L('От 12 до 128 символов. Можно использовать длинную фразу.', '12–128 таңба. Ұзын сөйлемді қолдануға болады.') : '')}
      ${register ? `${passwordField('password_confirm', L('Повторите пароль', 'Құпиясөзді қайталаңыз'))}<label class="checkbox"><input type="checkbox" id="auth-consent" aria-describedby="auth-consent-error"><span>${L('Принимаю условия использования и согласен на обработку данных для создания аккаунта.', 'Пайдалану шарттарын қабылдаймын және аккаунт ашу үшін деректерді өңдеуге келісемін.')}</span></label><span class="field-error" id="auth-consent-error"></span>` : `<a class="link" href="/forgot-password">${L('Забыли пароль?', 'Құпиясөзді ұмыттыңыз ба?')}</a>`}
      <p class="form-error" role="alert"></p><button class="btn primary" type="submit" ${register && !signupOpen() ? 'disabled' : ''}>${register ? L('Зарегистрироваться', 'Тіркелу') : L('Войти', 'Кіру')}</button>
      </form><div class="auth-switch">${register ? `${L('Уже есть аккаунт?', 'Аккаунтыңыз бар ма?')} <a class="link" href="/login?return=${encodeURIComponent(destination)}">${L('Войти', 'Кіру')}</a>` : `${L('Нет аккаунта?', 'Аккаунтыңыз жоқ па?')} <a class="link" href="/register?return=${encodeURIComponent(destination)}">${L('Зарегистрироваться', 'Тіркелу')}</a>`}</div>
      ${!register && window.Q_CONFIG?.smsEnabled ? `<a class="btn full spaced" href="/login/phone?return=${encodeURIComponent(destination)}">${L('Войти по телефону', 'Телефон арқылы кіру')}</a>` : ''}
      </div><p class="auth-terms">${terms()}</p></div>`,
    bind() {
      const form = document.querySelector('#auth-form');
      bindPasswordFields(form);
      form.onsubmit = async event => {
        event.preventDefault(); clearErrors(form);
        const values = Object.fromEntries(new FormData(form));
        values.email = normalizeEmail(values.email);
        values.return_path = destination;
        if (register && !values.name.trim()) return formError(form, 'name', L('Укажите имя.', 'Атыңызды жазыңыз.'));
        if (!emailValid(values.email)) return formError(form, 'email', L('Введите корректный email.', 'Дұрыс email енгізіңіз.'));
        if (register ? !passwordValid(values.password) : !values.password) return formError(form, 'password', L('Проверьте пароль.', 'Құпиясөзді тексеріңіз.'));
        if (register && values.password !== values.password_confirm) return formError(form, 'password_confirm', L('Пароли не совпадают.', 'Құпиясөздер сәйкес келмейді.'));
        values.consent = form.querySelector('#auth-consent')?.checked === true;
        if (register && !values.consent) return formError(form, 'auth-consent', L('Подтвердите согласие.', 'Келісімді растаңыз.'));
        const button = form.querySelector('[type=submit]'); button.disabled = true; button.setAttribute('aria-busy', 'true');
        try {
          const result = await api(register ? '/auth/signup' : '/auth/login', { method: 'POST', body: values });
          form.querySelectorAll('input[type=password], [id=password], [id=password_confirm]').forEach(input => input.value = '');
          if (result.confirmationRequired) {
            document.querySelector('.auth-shell').innerHTML = `<div class="panel"><span class="well">${icon('check')}</span><h1 class="spaced">${L('Проверьте почту', 'Поштаңызды тексеріңіз')}</h1><p>${L('Если регистрация доступна для этого адреса, мы отправили письмо с подтверждением. Откройте ссылку в письме.', 'Бұл мекенжайға тіркелу қолжетімді болса, растау хатын жібердік. Хаттағы сілтемені ашыңыз.')}</p><a class="btn primary full spaced" href="/login">${L('Перейти ко входу', 'Кіру бетіне өту')}</a></div>`;
            return;
          }
          await ctx.refreshUser();
          ctx.go(destination === '/my-appointments' && ctx.user?.role === 'platform_admin' ? '/admin' : destination);
        } catch (error) {
          form.querySelector('.form-error').textContent = errorText(error);
          if (!register) form.querySelector('#password').value = '';
        } finally { button.disabled = register && !signupOpen(); button.removeAttribute('aria-busy'); }
      };
    }
  };
}

export async function forgotPassword() {
  return {
    html: `<div class="auth-shell"><h1>${L('Восстановить доступ', 'Қолжетімділікті қалпына келтіру')}</h1><p>${L('Отправим ссылку для смены пароля на вашу почту.', 'Құпиясөзді өзгерту сілтемесін поштаңызға жібереміз.')}</p><div class="panel"><form id="recover-form" class="form-grid" novalidate>${field('email', 'Email', {type:'email',required:true,autocomplete:'email'})}<p class="form-error" role="alert"></p><button type="submit" class="btn primary">${L('Отправить ссылку', 'Сілтемені жіберу')}</button><a class="link" href="/login">${L('Вернуться ко входу', 'Кіру бетіне оралу')}</a></form></div></div>`,
    bind() {
      const form = document.querySelector('#recover-form');
      form.onsubmit = async event => {
        event.preventDefault(); clearErrors(form);
        const email = normalizeEmail(form.elements.namedItem('email').value);
        if (!emailValid(email)) return formError(form,'email',L('Проверьте email.', 'Email тексеріңіз.'));
        const button = form.querySelector('button'); button.disabled = true;
        try {
          await api('/auth/recover',{method:'POST',body:{email}});
          form.innerHTML = `<div role="status"><h2>${L('Проверьте почту', 'Поштаңызды тексеріңіз')}</h2><p class="spaced">${L('Если аккаунт существует, на него отправлено письмо для восстановления. Проверьте также папку «Спам».', 'Аккаунт бар болса, қалпына келтіру хаты жіберілді. «Спам» қалтасын да тексеріңіз.')}</p><a class="btn primary full spaced" href="/login">${L('Вернуться ко входу', 'Кіру бетіне оралу')}</a></div>`;
        } catch(error) { form.querySelector('.form-error').textContent=errorText(error); button.disabled=false; }
      };
    }
  };
}

export async function confirmEmail(ctx) {
  const params = new URLSearchParams(location.search);
  const token_hash = params.get('token_hash'), type = params.get('type');
  // Keep one-time credentials out of page content and subsequent history/referrers.
  if (token_hash) history.replaceState({}, '', '/auth/confirm');
  const valid = /^[a-zA-Z0-9_-]{20,256}$/.test(token_hash || '') && ['email','signup','recovery'].includes(type);
  return {
    html:`<div class="auth-shell"><h1>${type==='recovery'?L('Смена пароля','Құпиясөзді өзгерту'):L('Подтверждение почты','Поштаны растау')}</h1><p>${valid?L('Нажмите кнопку, чтобы продолжить.','Жалғастыру үшін батырманы басыңыз.'):L('Ссылка недействительна или уже использована. Откройте новую ссылку из письма.','Сілтеме жарамсыз немесе қолданылған. Хаттағы жаңа сілтемені ашыңыз.')}</p><div class="panel"><form id="confirm-form" novalidate><p class="form-error" role="alert"></p><button class="btn primary full" type="submit" ${valid?'':'disabled'}>${L('Продолжить','Жалғастыру')}</button><a class="link spaced" href="/forgot-password">${L('Восстановить доступ','Қолжетімділікті қалпына келтіру')}</a></form></div></div>`,
    bind(){const form=document.querySelector('#confirm-form');form.onsubmit=async event=>{event.preventDefault();if(!valid)return;const button=form.querySelector('button');button.disabled=true;try{const result=await api('/auth/confirm',{method:'POST',body:{token_hash,type}});await ctx.refreshUser();ctx.go(result.recovery?'/reset-password':safeReturn(result.returnTo));}catch(error){form.querySelector('.form-error').textContent=errorText(error);button.disabled=false;}};}
  };
}

export async function resetPassword(ctx) {
  return {
    html:`<div class="auth-shell"><h1>${L('Новый пароль','Жаңа құпиясөз')}</h1><p>${L('Форма доступна только после перехода по свежей ссылке восстановления.','Форма жаңа қалпына келтіру сілтемесі арқылы өткеннен кейін ғана қолжетімді.')}</p><div class="panel"><p class="muted">${esc(ctx.user?.email || '')}</p><form id="password-form" class="form-grid" novalidate>${passwordField('password',L('Новый пароль','Жаңа құпиясөз'),'new-password',L('От 12 до 128 символов.','12–128 таңба.'))}${passwordField('password_confirm',L('Повторите пароль','Құпиясөзді қайталаңыз'))}<p class="form-error" role="alert"></p><button class="btn primary" type="submit">${L('Сохранить новый пароль','Жаңа құпиясөзді сақтау')}</button></form></div></div>`,
    bind(){const form=document.querySelector('#password-form');bindPasswordFields(form);form.onsubmit=async event=>{event.preventDefault();clearErrors(form);const body=Object.fromEntries(new FormData(form));if(!passwordValid(body.password))return formError(form,'password',L('Нужно от 12 до 128 символов.','12–128 таңба қажет.'));if(body.password!==body.password_confirm)return formError(form,'password_confirm',L('Пароли не совпадают.','Құпиясөздер сәйкес келмейді.'));const button=form.querySelector('[type=submit]');button.disabled=true;try{await api('/auth/password',{method:'POST',body});await ctx.refreshUser();toast(L('Пароль изменён. Войдите заново.','Құпиясөз өзгертілді. Қайта кіріңіз.'));ctx.go('/login');}catch(error){if(error.code==='PASSWORD_UPDATED_RELOGIN'){await ctx.refreshUser();toast(errorText(error));ctx.go('/login');}else{form.querySelector('.form-error').textContent=errorText(error);button.disabled=false;}}};}
  };
}

export async function phoneLogin(ctx) {
  let sent=false,number='';
  return {html:`<div class="auth-shell"><h1>${L('Вход по телефону','Телефон арқылы кіру')}</h1><p>${L('Для аккаунтов с уже подтверждённым номером.','Нөмірі расталған аккаунттарға арналған.')}</p><div class="panel"><form id="phone-form" class="form-grid" novalidate>${field('phone',L('Номер телефона','Телефон нөмірі'),{type:'tel',required:true,autocomplete:'tel'})}<div id="otp-container"></div><p class="form-error" role="alert"></p><button class="btn primary" type="submit" ${window.Q_CONFIG?.smsEnabled?'':'disabled'}>${L('Получить код','Код алу')}</button><a class="link" href="/login">${L('Войти по email','Email арқылы кіру')}</a></form>${window.Q_CONFIG?.smsEnabled?'':`<div class="notice spaced">${L('Телефонный вход пока недоступен.','Телефон арқылы кіру әзірге қолжетімсіз.')}</div>`}</div></div>`,bind(){const form=document.querySelector('#phone-form');form.onsubmit=async event=>{event.preventDefault();clearErrors(form);if(!phone(form.elements.namedItem('phone').value))return formError(form,'phone',L('Введите +7 и 10 цифр.','+7 және 10 сан енгізіңіз.'));const button=form.querySelector('button');button.disabled=true;try{if(!sent){number=phone(form.elements.namedItem('phone').value);await api('/auth/send-code',{method:'POST',body:{phone:number}});sent=true;form.querySelector('#phone').readOnly=true;form.querySelector('#otp-container').innerHTML=field('code',L('Код из SMS','SMS коды'),{required:true,autocomplete:'one-time-code'});button.textContent=L('Войти','Кіру');}else{await api('/auth/verify',{method:'POST',body:{phone:number,code:form.elements.namedItem('code').value}});await ctx.refreshUser();ctx.go('/my-appointments');}}catch(error){form.querySelector('.form-error').textContent=errorText(error);}finally{button.disabled=false;}};}};
}
