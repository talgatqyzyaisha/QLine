export const services = [ {
  id:'therapy',ru:'Лечение зубов',kz:'Тісті емдеу',detailRu:'Стоматолог-терапевт',detailKz:'Тіс дәрігері-терапевт',icon:'tooth',price:18000,duration:60
}, {
  id:'cleaning',ru:'Профессиональная чистка',kz:'Кәсіби тазалау',icon:'sparkles',price:15000,duration:60
}, {
  id:'whitening',ru:'Отбеливание зубов',kz:'Тісті ағарту',icon:'sun',price:65000,duration:90
}, {
  id:'ortho',ru:'Ортодонтия',kz:'Ортодонтия',icon:'align',price:10000,duration:45
}, {
  id:'implant',ru:'Имплантация',kz:'Имплантация',icon:'implant',price:180000,duration:120
}, {
  id:'surgery',ru:'Удаление зубов',kz:'Тісті жұлу',icon:'shield',price:20000,duration:60
}, {
  id:'kids',ru:'Детская стоматология',kz:'Балалар стоматологиясы',icon:'smile',price:12000,duration:45
}, {
  id:'consult',ru:'Консультация стоматолога',kz:'Тіс дәрігерінің кеңесі',icon:'chat',price:5000,duration:30
} ];
export const clinics = [ {
  id:'c1',slug:'lumina-dental',name:'Lumina Dental',city:'almaty',district:'bostandyk',addressRu:'пр. Аль-Фараби, 77/7',addressKz:'Әл-Фараби даңғылы, 77/7',descriptionRu:'Светлое пространство и внимательный подход. Лечение, эстетика и забота о вашей улыбке в одном месте.',descriptionKz:'Жарық кеңістік пен мұқият күтім. Емдеу, эстетика және күлкіңізге қамқорлық бір жерде.',image:'clinic-1.png',services:['therapy','cleaning','whitening','consult'],price:5000,approved:true,hours:'09:00–20:00',doctors:[{
    id:'d1',nameRu:'Алия Садыкова',nameKz:'Әлия Садықова',specialty:'therapy',services:['therapy','cleaning','consult'],initials:'АС'
  },{
    id:'d2',nameRu:'Тимур Ахметов',nameKz:'Тимур Ахметов',specialty:'cleaning',services:['cleaning','whitening','consult'],initials:'ТА'
  }]
}, {
  id:'c2',slug:'aura-smile',name:'Aura Smile',city:'almaty',district:'medeu',addressRu:'ул. Достык, 132',addressKz:'Достық көшесі, 132',descriptionRu:'Стоматология для всей семьи. От первой консультации до здоровой улыбки.',descriptionKz:'Бүкіл отбасыға арналған стоматология. Алғашқы кеңестен сау күлкіге дейін.',image:'clinic-2.png',services:['kids','therapy','ortho','consult'],price:5000,approved:true,hours:'09:00–19:00',doctors:[{
    id:'d3',nameRu:'Дана Омарова',nameKz:'Дана Омарова',specialty:'kids',services:['kids','therapy','ortho','consult'],initials:'ДО'
  }]
}, {
  id:'c3',slug:'forma-dental',name:'Forma Dental',city:'almaty',district:'almaly',addressRu:'ул. Абая, 109',addressKz:'Абай көшесі, 109',descriptionRu:'Современные решения для здоровья зубов. Имплантация и комплексная стоматология.',descriptionKz:'Тіс саулығына арналған заманауи шешімдер. Имплантация және кешенді стоматология.',image:'clinic-3.png',services:['implant','surgery','cleaning','consult'],price:5000,approved:true,hours:'10:00–20:00',doctors:[{
    id:'d4',nameRu:'Арман Беков',nameKz:'Арман Беков',specialty:'implant',services:['implant','surgery','cleaning','consult'],initials:'АБ'
  }]
} ];
export const nameOf = (item,lang) => item?.[lang] || item?.[lang==='ru'?'nameRu':'nameKz'] || item?.name || '';
export function localDate(offset=0){
  const now=new Date(Date.now()+offset*86400000);
  return new Intl.DateTimeFormat('en-CA',{
    timeZone:'Asia/Almaty',year:'numeric',month:'2-digit',day:'2-digit'
  }).format(now);
}
export function demoSlots(clinic,date=localDate(1),service='consult',doctor){
  return ['09:00','10:30','12:00','14:00','15:30','17:00'].map((time,i)=>({
    id:`${clinic.id}:${doctor||clinic.doctors[0].id}:${service}:${date}:${time}`,clinic_id:clinic.id,dentist_id:doctor||clinic.doctors[0].id,service_id:service,starts_at:`${date}T${time}:00+05:00`,ends_at:new Date(new Date(`${date}T${time}:00+05:00`).getTime()+(services.find(s=>s.id===service)?.duration||30)*60000).toISOString(),open:true
  })).filter(s=>new Date(s.starts_at)>new Date());
}
