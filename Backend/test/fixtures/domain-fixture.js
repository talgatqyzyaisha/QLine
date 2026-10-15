import {AppError,fail,bookingInput,phone,transitionAllowed,overlaps,active,staff} from '../../../shared/domain.js';
export function initialState(clinics,services){
  return {
    clinics:structuredClone(clinics),services:structuredClone(services),slots:[],appointments:[],history:[],audit:[],members:[],notifications:[],blocked:[],workingHours:[],complaints:[],users:[],notificationSettings:{
    }
  };
}
const uid=()=>globalThis.crypto.randomUUID();
function audit(state,user,action,target){
  state.audit.unshift({
    id:uid(),actor_id:user?.id,action,target,at:new Date().toISOString()
  });
}
export function hoursOpen(state,dentist,start,end){
  const templates=state.workingHours.filter(h=>h.dentist_id===dentist);
  if(!templates.length)return true;
  const local=(value)=>new Date(new Date(value).getTime()+5*3600000);
  const a=local(start),b=local(end);
  if(a.toISOString().slice(0,10)!==b.toISOString().slice(0,10))return false;
  return templates.some(h=>h.weekday===a.getUTCDay()&&h.start<=a.toISOString().slice(11,16)&&h.end>=b.toISOString().slice(11,16));
}
export function demoOperation(state,user,method,path,body={
},query={
}){
  const auth=()=>{
    if(!user)fail('UNAUTHORIZED',401);
    if(state.users.find(u=>u.id===user.id)?.blocked)fail('FORBIDDEN',403);
  };
  const requireStaff=()=>{
    auth();
    if(!['owner','administrator','dentist'].includes(user.role))fail('FORBIDDEN',403);
  };
  const clinic=()=>{
    requireStaff();
    const c=state.clinics.find(c=>c.id===user.clinic_id);
    if(!c)fail('NOT_FOUND',404);
    return c;
  };
  const requireManager=()=>{
    const c=clinic();
    if(!staff(user,c.id))fail('FORBIDDEN',403);
    return c;
  };
  if(path==='/me'&&method==='GET'){
    if(user&&state.users.find(u=>u.id===user.id)?.blocked)fail('FORBIDDEN',403);
    return user;
  }
  if(path==='/services'&&method==='GET')return state.services;
  if(path==='/clinics'&&method==='GET')return state.clinics.filter(c=>c.approved);
  if(path.startsWith('/clinics/')&&method==='GET'){
    const c=state.clinics.find(c=>c.slug===path.split('/')[2]&&c.approved);
    return c||fail('NOT_FOUND',404);
  }
  if(path==='/slots'&&method==='GET')return state.slots.filter(s=>s.clinic_id===query.clinic&&(!query.service||s.service_id===query.service)&&(!query.dentist||s.dentist_id===query.dentist)&&s.starts_at.slice(0,10)===query.date&&s.open&&hoursOpen(state,s.dentist_id,s.starts_at,s.ends_at)&&state.clinics.find(c=>c.id===s.clinic_id)?.doctors.some(d=>d.id===s.dentist_id&&(!d.services||d.services.includes(s.service_id)))&&new Date(s.starts_at)>new Date()&&!state.blocked.some(b=>b.dentist_id===s.dentist_id&&overlaps(b,s))&&!state.appointments.some(a=>active(a)&&a.dentist_id===s.dentist_id&&overlaps(a,s)));
  if(path==='/appointments'&&method==='GET'){
    auth();
    return state.appointments.filter(a=>a.patient_id===user.id).map(a=>({
      ...a,clinic_snapshot:state.clinics.find(c=>c.id===a.clinic_id)
    })).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
  }
  if(path==='/appointments'&&method==='POST'){
    auth();
    const b=bookingInput(body);
    const existing=state.appointments.find(a=>a.patient_id===user.id&&a.idempotency_key===b.idempotency_key);
    if(existing){
      if(existing.slot_id!==b.slot_id||existing.name!==b.name||existing.phone!==b.phone||existing.comment!==b.comment)fail('INVALID',422);
      return existing;
    }
    const slot=state.slots.find(s=>s.id===b.slot_id);
    if(!slot||!state.clinics.find(c=>c.id===slot.clinic_id)?.doctors.some(d=>d.id===slot.dentist_id&&(!d.services||d.services.includes(slot.service_id)))||!slot.open||!hoursOpen(state,slot.dentist_id,slot.starts_at,slot.ends_at)||new Date(slot.starts_at)<=new Date()||!state.clinics.some(c=>c.id===slot.clinic_id&&c.approved)||state.blocked.some(x=>x.dentist_id===slot.dentist_id&&overlaps(x,slot))||state.appointments.some(a=>active(a)&&a.dentist_id===slot.dentist_id&&overlaps(a,slot)))fail('CONFLICT',409);
    const a={
      ...slot,id:uid(),slot_id:slot.id,patient_id:user.id,name:b.name,phone:b.phone,comment:b.comment,status:'pending',consent_version:'demo-unapproved',created_at:new Date().toISOString(),idempotency_key:b.idempotency_key
    };
    delete a.open;
    state.appointments.push(a);
    state.history.push({
      appointment_id:a.id,from:null,to:'pending',at:a.created_at
    });
    audit(state,user,'appointment.created',a.id);
    return a;
  }
  if(path.startsWith('/appointments/')&&method==='PATCH'){
    auth();
    const a=state.appointments.find(a=>a.id===path.split('/')[2]);
    if(!a)fail('NOT_FOUND',404);
    const own=a.patient_id===user.id;
    const manager=staff(user,a.clinic_id);
    const dentist=user.role==='dentist'&&user.clinic_id===a.clinic_id&&user.dentist_id===a.dentist_id;
    if(body.reschedule_request){
      if(!own||!active(a)||new Date(a.starts_at)<=new Date())fail('FORBIDDEN',403);
      a.reschedule_requested=true;
      audit(state,user,'appointment.reschedule_requested',a.id);
      return a;
    }
    if(body.slot_id){
      if(!manager||!active(a))fail('FORBIDDEN',403);
      const slot=state.slots.find(s=>s.id===body.slot_id&&s.clinic_id===a.clinic_id&&s.service_id===a.service_id&&s.open&&hoursOpen(state,s.dentist_id,s.starts_at,s.ends_at)&&state.clinics.find(c=>c.id===s.clinic_id)?.doctors.some(d=>d.id===s.dentist_id&&(!d.services||d.services.includes(s.service_id)))&&new Date(s.starts_at)>new Date());
      if(!slot||!hoursOpen(state,slot.dentist_id,slot.starts_at,slot.ends_at)||state.blocked.some(x=>x.dentist_id===slot.dentist_id&&overlaps(x,slot))||state.appointments.some(x=>x.id!==a.id&&active(x)&&x.dentist_id===slot.dentist_id&&overlaps(x,slot)))fail('CONFLICT',409);
      Object.assign(a,{
        slot_id:slot.id,dentist_id:slot.dentist_id,starts_at:slot.starts_at,ends_at:slot.ends_at,reschedule_requested:false
      });
      audit(state,user,'appointment.rescheduled',a.id);
      return a;
    }
    if(!manager&&!(own&&body.status==='cancelled'&&new Date(a.starts_at)>new Date())&&!(dentist&&['completed','no_show'].includes(body.status)))fail('FORBIDDEN',403);
    if(!transitionAllowed(a.status,body.status)||(['completed','no_show'].includes(body.status)&&new Date(a.starts_at)>new Date()))fail('INVALID',422);
    state.history.push({
      appointment_id:a.id,from:a.status,to:body.status,at:new Date().toISOString()
    });
    a.status=body.status;
    audit(state,user,'appointment.'+body.status,a.id);
    return a;
  }
  if(path==='/profile'&&method==='PATCH'){
    auth();
    if(!String(body.name||'').trim()||!phone(body.phone))fail('INVALID',422);
    const existing=state.users.find(u=>u.id===user.id);
    if(existing)Object.assign(existing,{
      name:body.name.trim(),phone:phone(body.phone)
    });
    return {
      ...user,name:body.name.trim(),phone:phone(body.phone)
    };
  }
  if(path==='/clinic-register'&&method==='POST'){
    auth();
    if(!body.name||!body.address||!phone(body.phone)||body.consent!==true)fail('INVALID',422);
    const c={
      id:uid(),slug:'clinic-'+uid().slice(0,8),name:String(body.name).slice(0,100),city:body.city||'almaty',district:'bostandyk',addressRu:body.address,addressKz:body.address,descriptionRu:'',descriptionKz:'',phone:phone(body.phone),approved:false,image:'clinic-1.jpg',price:0,hours:'09:00–18:00',services:[],doctors:[]
    };
    state.clinics.push(c);
    state.members.push({
      user_id:user.id,clinic_id:c.id,role:'owner'
    });
    audit(state,user,'clinic.registered',c.id);
    return c;
  }
  if(path==='/clinic'&&method==='GET'){
    const c=clinic();
    return {
      clinic:c,appointments:state.appointments.filter(a=>a.clinic_id===c.id&&(user.role!=='dentist'||a.dentist_id===user.dentist_id)),slots:state.slots.filter(s=>s.clinic_id===c.id&&(user.role!=='dentist'||s.dentist_id===user.dentist_id)),workingHours:state.workingHours.filter(x=>x.clinic_id===c.id),blocked:state.blocked.filter(x=>x.clinic_id===c.id),notifications:state.notificationSettings[c.id]||{
        bookings:true,cancellations:true
      }
    };
  }
  if(path==='/clinic/profile'&&method==='PATCH'){
    const c=requireManager();
    for(const key of ['name','addressRu','addressKz','descriptionRu','descriptionKz','hours'])if(body[key]!==undefined)c[key]=String(body[key]).slice(0,1000);
    audit(state,user,'clinic.updated',c.id);
    return c;
  }
  if(path==='/clinic/dentists'&&method==='POST'){
    const c=requireManager();
    if(!body.nameRu||!body.nameKz)fail('INVALID',422);
    const d={
      id:uid(),nameRu:String(body.nameRu).slice(0,100),nameKz:String(body.nameKz).slice(0,100),specialty:body.specialty||'consult',services:[body.specialty||'consult','consult'],initials:String(body.nameRu).split(' ').map(x=>x[0]).slice(0,2).join('')
    };
    c.doctors.push(d);
    audit(state,user,'dentist.created',d.id);
    return d;
  }
  if(path==='/clinic/services'&&method==='POST'){
    const c=requireManager();
    if(!state.services.some(s=>s.id===body.service_id)||!Number.isFinite(+body.price)||+body.price<0||+body.duration<15||+body.duration>240)fail('INVALID',422);
    if(!c.services.includes(body.service_id))c.services.push(body.service_id);
    c.serviceDetails??={
    };
    c.serviceDetails[body.service_id]={
      price:+body.price,duration:+body.duration
    };
    if(Array.isArray(body.dentist_ids)){
      for(const d of c.doctors){
        d.services??=[d.specialty,'consult'];
        d.services=d.services.filter(id=>id!==body.service_id);
        if(body.dentist_ids.includes(d.id))d.services.push(body.service_id);
      }
    }
    audit(state,user,'service.updated',body.service_id);
    return c;
  }
  if(path==='/clinic/slots'&&method==='POST'){
    const c=requireManager();
    if(!c.doctors.some(d=>d.id===body.dentist_id&&(!d.services||d.services.includes(body.service_id)))||!c.services.includes(body.service_id)||!(new Date(body.starts_at)>new Date())||!(new Date(body.ends_at)>new Date(body.starts_at))||new Date(body.ends_at)-new Date(body.starts_at)>14400000)fail('INVALID',422);
    const s={
      id:uid(),clinic_id:c.id,dentist_id:body.dentist_id,service_id:body.service_id,starts_at:body.starts_at,ends_at:body.ends_at,open:true
    };
    if(!hoursOpen(state,s.dentist_id,s.starts_at,s.ends_at))fail('INVALID',422);if(state.slots.some(x=>x.open&&x.dentist_id===s.dentist_id&&overlaps(x,s))||state.appointments.some(x=>active(x)&&x.dentist_id===s.dentist_id&&overlaps(x,s))||state.blocked.some(x=>x.dentist_id===s.dentist_id&&overlaps(x,s)))fail('CONFLICT',409);
    state.slots.push(s);
    audit(state,user,'slot.opened',s.id);
    return s;
  }
  if(path.startsWith('/clinic/slots/')&&method==='PATCH'){
    const c=requireManager();
    const s=state.slots.find(x=>x.id===path.split('/')[3]&&x.clinic_id===c.id);
    if(!s)fail('NOT_FOUND',404);
    if(state.appointments.some(a=>active(a)&&a.slot_id===s.id))fail('CONFLICT',409);
    s.open=body.open===true;
    audit(state,user,'slot.updated',s.id);
    return s;
  }
  if(path==='/clinic/working-hours'&&method==='POST'){
    const c=requireManager();
    if(!c.doctors.some(d=>d.id===body.dentist_id)||!Number.isInteger(+body.weekday)||+body.weekday<0||+body.weekday>6||!/^\d{2}:\d{2}$/.test(body.start)||!/^\d{2}:\d{2}$/.test(body.end)||body.start>=body.end)fail('INVALID',422);
    state.workingHours=state.workingHours.filter(x=>!(x.dentist_id===body.dentist_id&&x.weekday===+body.weekday));
    const row={
      ...body,weekday:+body.weekday,clinic_id:c.id
    };
    state.workingHours.push(row);
    if(state.appointments.some(a=>active(a)&&a.dentist_id===body.dentist_id&&new Date(a.starts_at)>new Date()&&!hoursOpen(state,a.dentist_id,a.starts_at,a.ends_at)))fail('CONFLICT',409);
    audit(state,user,'working_hours.updated',body.dentist_id);
    return row;
  }
  if(path==='/clinic/blocked'&&method==='POST'){
    const c=requireManager();
    if(!c.doctors.some(d=>d.id===body.dentist_id)||!(new Date(body.ends_at)>new Date(body.starts_at)))fail('INVALID',422);
    if(state.appointments.some(a=>active(a)&&a.dentist_id===body.dentist_id&&overlaps(a,body)))fail('CONFLICT',409);
    const row={
      id:uid(),clinic_id:c.id,dentist_id:body.dentist_id,starts_at:body.starts_at,ends_at:body.ends_at
    };
    state.blocked.push(row);
    audit(state,user,'blocked_slot.created',row.id);
    return row;
  }
  if(path==='/clinic/notifications'&&method==='PATCH'){
    const c=requireManager();
    state.notificationSettings[c.id]={
      bookings:!!body.bookings,cancellations:!!body.cancellations
    };
    return state.notificationSettings[c.id];
  }
  if(path.startsWith('/admin')){
    auth();
    if(user.role!=='platform_admin')fail('FORBIDDEN',403);
    if(path==='/admin'&&method==='GET')return {
      clinics:state.clinics,services:state.services,audit:state.audit.slice(0,100),users:state.users,complaints:state.complaints,appointments:state.appointments.length
    };
    if(path.startsWith('/admin/clinics/')&&method==='PATCH'){
      const c=state.clinics.find(c=>c.id===path.split('/')[3]);
      if(!c)fail('NOT_FOUND',404);
      c.approved=!!body.approved;
      audit(state,user,c.approved?'clinic.approved':'clinic.hidden',c.id);
      return c;
    }
    if(path==='/admin/categories'&&method==='POST'){
      if(!body.ru||!body.kz)fail('INVALID',422);
      const row={
        id:uid(),ru:String(body.ru).slice(0,100),kz:String(body.kz).slice(0,100),price:0,duration:30,icon:'tooth'
      };
      state.services.push(row);
      audit(state,user,'category.created',row.id);
      return row;
    }
    if(path.startsWith('/admin/users/')&&method==='PATCH'){
      const u=state.users.find(u=>u.id===path.split('/')[3]);
      if(!u||u.id===user.id)fail('INVALID',422);
      u.blocked=!!body.blocked;
      audit(state,user,'user.access_changed',u.id);
      return {
        id:u.id,blocked:u.blocked
      };
    }
    if(path.startsWith('/admin/complaints/')&&method==='PATCH'){
      const x=state.complaints.find(x=>x.id===path.split('/')[3]);
      if(!x)fail('NOT_FOUND',404);
      x.status='resolved';
      audit(state,user,'complaint.resolved',x.id);
      return x;
    }
  }
  fail('NOT_FOUND',404);
}
