export type ViewType = 'day'|'week'|'month'|'list';

export function formatRangeTitle(date: Date, view: ViewType, locale='pt-BR') {
  const fmt = new Intl.DateTimeFormat(locale, { month:'long', year:'numeric' });
  if (view === 'month') return fmt.format(date);
  if (view === 'week') {
    const start = startOfWeek(date);
    const end = addDays(start, 6);
    return `${formatDay(start)} – ${formatMonthDay(end)}`;
  }
  return new Intl.DateTimeFormat(locale, { day:'2-digit', month:'short', year:'numeric' }).format(date);
}

export function startOfWeek(date: Date) {
  const d = new Date(date); 
  const day = (d.getDay()+6)%7; // segunda=0
  d.setDate(d.getDate()-day); 
  d.setHours(0,0,0,0); 
  return d;
}

export function addDays(date: Date, n: number) { 
  const d = new Date(date); 
  d.setDate(d.getDate()+n); 
  return d; 
}

export function daysOfWeek(date: Date) { 
  const s = startOfWeek(date); 
  return Array.from({length:7},(_,i)=>addDays(s,i)); 
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

export function formatDay(d: Date, locale='pt-BR'){ 
  return new Intl.DateTimeFormat(locale,{ day:'2-digit'}).format(d);
}

export function formatMonthDay(d: Date, locale='pt-BR'){ 
  return new Intl.DateTimeFormat(locale,{ day:'2-digit', month:'short'}).format(d); 
}

export function monthMatrix(date: Date){
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({length:6},(_,w)=>Array.from({length:7},(__,d)=>addDays(start,w*7+d)));
}



