import React, { useRef, useEffect, useState } from 'react';
import { GcalEvent } from '@/services/gcal';
import { isSameDay, daysOfWeek } from './calendarUtils';

interface Props {
  date: Date;            // referência (em 'day' é o dia; em 'week' é o dia dentro da semana)
  view: 'day'|'week';
  events: GcalEvent[];
  now?: Date;
}

function hours(){ return Array.from({length:24},(_,h)=>h); }

// Altura de cada slot de hora (h-16 = 4rem = 64px)
const ROW_HEIGHT = 64;
const TOP_OFFSET = 32;

// Helpers de data/visão
const isDateInWeek = (date: Date, weekAnchor: Date) => {
  const start = new Date(weekAnchor);
  start.setDate(start.getDate() - start.getDay()); // domingo
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
};

const minutesSinceMidnight = (d: Date) => d.getHours() * 60 + d.getMinutes();

// Componente para a linha "agora"
const NowLine = React.forwardRef<HTMLDivElement>((_, ref) => {
  const mins = minutesSinceMidnight(new Date());
  const top = (mins / 60) * ROW_HEIGHT; // px
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute left-14 right-2 h-[2px] bg-red-500"
      style={{ top }}
    >
      <div className="absolute -left-2 -top-[3px] w-3 h-3 rounded-full bg-red-500" />
    </div>
  );
});
NowLine.displayName = 'NowLine';

export default function DayWeekGrid({ date, view, events, now = new Date() }: Props){
  const days = view==='day' ? [date] : daysOfWeek(date);
  const allDay = events.filter(e => e.is_all_day);
  const timed = events.filter(e => !e.is_all_day);
  
  // Lógica inteligente: ocultar horas sem eventos
  const getVisibleHours = () => {
    const allHours = hours();
    
    // Se não há eventos, mostrar horário padrão (06:00-22:00)
    if (timed.length === 0) {
      return allHours.filter(h => h >= 6 && h <= 22);
    }
    
    // Analisar eventos para determinar horas necessárias
    const eventHours = new Set<number>();
    
    timed.forEach(event => {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      
      // Adicionar hora de início e fim
      eventHours.add(start.getHours());
      eventHours.add(end.getHours());
      
      // Adicionar margem de segurança (1 hora antes e depois)
      eventHours.add(Math.max(0, start.getHours() - 1));
      eventHours.add(Math.min(23, end.getHours() + 1));
    });
    
    // Converter para array e ordenar
    const hoursWithEvents = Array.from(eventHours).sort((a, b) => a - b);
    
    // Se não há eventos em horários específicos, usar padrão
    if (hoursWithEvents.length === 0) {
      return allHours.filter(h => h >= 6 && h <= 22);
    }
    
    // Encontrar range mínimo e máximo
    const minHour = Math.max(0, Math.min(...hoursWithEvents));
    const maxHour = Math.min(23, Math.max(...hoursWithEvents));
    
    // Retornar range completo entre min e max
    return allHours.filter(h => h >= minHour && h <= maxHour);
  };

  const visibleHours = getVisibleHours();

  // Refs e estado para auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);
  const didAutoScroll = useRef(false);
  
  // Força recomputar o marcador "agora" a cada minuto
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll para "agora" (ou primeiro evento)
  useEffect(() => {
    if (!scrollRef.current) return;
    if (view === 'month' || view === 'list') return;

    // queremos rolar apenas quando a visão/dia muda,
    // não a cada "tick" do marcador
    didAutoScroll.current = false;

    const run = () => {
      const container = scrollRef.current!;
      const today = new Date();
      const showingToday =
        (view === 'day' && isSameDay(today, date)) ||
        (view === 'week' && isDateInWeek(today, date));

      // 1) Hoje visível? Rola até o marcador "agora"
      if (showingToday && nowRef.current) {
        const target = Math.max(nowRef.current.offsetTop - TOP_OFFSET, 0);
        container.scrollTo({ top: target, behavior: 'smooth' });
        didAutoScroll.current = true;
        return;
      }

      // 2) Fallback: até o primeiro evento do dia/semana
      const firstEvent = container.querySelector('[data-event-start="true"]') as HTMLElement | null;
      if (firstEvent) {
        const target = Math.max(firstEvent.offsetTop - TOP_OFFSET, 0);
        container.scrollTo({ top: target, behavior: 'smooth' });
        didAutoScroll.current = true;
        return;
      }

      // 3) Fallback final: 08:00
      const eight = container.querySelector('[data-hour="8"]') as HTMLElement | null;
      if (eight) {
        const target = Math.max(eight.offsetTop - TOP_OFFSET, 0);
        container.scrollTo({ top: target, behavior: 'smooth' });
      } else {
        container.scrollTo({ top: 8 * ROW_HEIGHT, behavior: 'smooth' });
      }
    };

    // deixa o DOM pintar antes de medir posições
    requestAnimationFrame(() => setTimeout(run, 0));
  }, [view, date, events.length]);

  // Muito simples: por coluna(dia), empilha eventos cravando top/height (% do dia) e distribui largura por colisão.
  function eventsForDay(day: Date){
    const dayEvents = timed
      .filter(e => isSameDay(day, new Date(e.start_time)) || isSameDay(day, new Date(e.end_time)));
    // layout tosco de colisão
    const slots: GcalEvent[][] = [];
    dayEvents.forEach(ev=>{
      let placed = false;
      for(const col of slots){
        const clash = col.some(other => overlap(ev, other));
        if(!clash){ col.push(ev); placed=true; break; }
      }
      if(!placed) slots.push([ev]);
    });
    return { slots, count: slots.length };
  }

  function overlap(a: GcalEvent, b: GcalEvent){
    const as = new Date(a.start_time).getTime(); const ae = new Date(a.end_time).getTime();
    const bs = new Date(b.start_time).getTime(); const be = new Date(b.end_time).getTime();
    return as < be && bs < ae;
  }

  function topPct(iso: string){ 
    const d=new Date(iso); 
    return ((d.getHours()*60+d.getMinutes())/(24*60))*100; 
  }
  
  function heightPct(sIso: string, eIso: string){
    const s=new Date(sIso).getTime(), e=new Date(eIso).getTime();
    return Math.max(2, ((e-s)/(24*60*60*1000))*100); // mínimo visual
  }

  return (
    <div className="border rounded overflow-hidden bg-white dark:bg-gray-900 flex flex-col h-[calc(100vh-200px)]">
      {/* Cabeçalho dos dias - fixo no topo */}
      <div className="grid flex-shrink-0" style={{gridTemplateColumns:`40px repeat(${days.length}, 1fr)`}}>
        <div className="bg-gray-50 dark:bg-gray-800 p-2 text-xs text-right text-gray-500 dark:text-gray-400"></div>
        {days.map((d,i)=>(
          <div key={i} className="border-l p-2 bg-gray-50 dark:bg-gray-800 text-center">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase()}
            </div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {d.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* All-day row - fixo abaixo dos cabeçalhos */}
      <div className="grid flex-shrink-0" style={{gridTemplateColumns:`40px repeat(${days.length}, 1fr)`}}>
        <div className="bg-gray-50 dark:bg-gray-800 p-2 text-xs text-right text-gray-500 dark:text-gray-400">Dia</div>
        {days.map((d,i)=>(
          <div key={i} className="border-l p-2 min-h-[44px] bg-gray-50 dark:bg-gray-800">
            {/* tags all-day do dia */}
            <div className="flex flex-col gap-1">
              {allDay.filter(e => isSameDay(d,new Date(e.start_time))).map(ev=>(
                <div key={ev.id} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 truncate">
                  {ev.title}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Contêiner rolável para horas e eventos - COM ALTURA FIXA */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative" style={{height: 'calc(100vh - 300px)'}}>
        <div className="grid" style={{gridTemplateColumns:`40px repeat(${days.length}, 1fr)`}}>
          {/* hours rail */}
          <div className="relative">
            {visibleHours.map(h=>(
              <div key={h} data-hour={h} className="h-16 border-t text-[10px] pr-1 text-right text-gray-500 dark:text-gray-400">
                {String(h).padStart(2,'0')}:00
              </div>
            ))}
          </div>

        {days.map((day,i)=>{
          const { slots, count } = eventsForDay(day);
          return (
            <div key={i} className="relative border-l">
              {/* hour lines */}
              {visibleHours.map(h=>(
                <div key={h} className="h-16 border-t border-gray-200 dark:border-gray-700" />
              ))}

              {/* now line - substituída pelo componente NowLine global */}

              {/* events */}
              <div className="absolute inset-0">
                {slots.map((col, colIdx)=> col.map((ev, evIdx)=>{
                  const w = 100 / count;
                  const l = colIdx * w;
                  return (
                    <div
                      key={ev.id}
                      data-event-start={evIdx === 0 ? "true" : undefined}
                      className="absolute rounded-md bg-blue-600/90 text-white px-2 py-1 text-xs overflow-hidden hover:bg-blue-700/90 transition-colors"
                      style={{
                        left: `${l}%`,
                        width: `calc(${w}% - 4px)`,
                        top: `${topPct(ev.start_time)}%`,
                        height: `${heightPct(ev.start_time, ev.end_time)}%`,
                        margin: 2
                      }}
                      title={ev.title}
                    >
                      <div className="font-medium truncate">{ev.title}</div>
                      <div className="opacity-90 truncate">
                        {new Date(ev.start_time).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                      </div>
                    </div>
                  );
                }))}
              </div>
            </div>
          );
        })}
        </div>
        
        {/* Marcador "agora" (só se hoje estiver visível) */}
        {((view === 'day' && isSameDay(new Date(), date)) ||
          (view === 'week' && isDateInWeek(new Date(), date))) && (
          <NowLine ref={nowRef} />
        )}
      </div>
    </div>
  );
}
