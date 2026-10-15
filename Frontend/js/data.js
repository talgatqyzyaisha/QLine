// Catalog content and service prices are loaded from Supabase. No fictional records.
export const services = [];
export const nameOf = (item, lang) => item?.[lang] || item?.[lang === 'ru' ? 'nameRu' : 'nameKz'] || item?.name || '';
export function localDate(offset = 0) {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Almaty',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now() + offset * 86400000));
}
