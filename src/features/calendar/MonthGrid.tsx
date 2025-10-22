import { GcalEvent } from '@/services/gcal';
import { monthMatrix, isSameDay } from './calendarUtils';
import { useState } from 'react';

interface Props {
  date: Date;        // mês referência
  events: GcalEvent[];
  onOpenDay?: (d: Date) => void;
  today?: Date;
}

export default function MonthGrid({ date, events, onOpenDay, today = new Date() }: Props){
  const weeks = monthMatrix(date);
  const [openDay, setOpenDay] = useState<Date|null>(null);

  function eventsForDay(d: Date){ 
    return events.filter(e => isSameDay(d, new Date(e.start_time)) || (e.is_all_day && isSameDay(d, new Date(e.start_time))));
  }

  return (
    <div className="grid grid-cols-7 border rounded overflow-hidden bg-white dark:bg-gray-900">
      {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(h=>(
        <div key={h} className="text-xs px-2 py-2 bg-gray-50 dark:bg-gray-800 border-b text-gray-600 dark:text-gray-400 font-medium">
          {h}
        </div>
      ))}
      {weeks.flatMap((row, i)=> row.map((d,j)=>{
        const dayEvents = eventsForDay(d);
        const isCurrent = d.getMonth()===date.getMonth();
        const isToday = isSameDay(d, today);
        const limit = 3;
        return (
          <div key={`${i}-${j}`} className={`h-32 p-2 border border-gray-200 dark:border-gray-700 relative ${
            isCurrent?'bg-white dark:bg-gray-900':'bg-gray-50 dark:bg-gray-800/40'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <div className={`text-xs ${isToday?'text-blue-600 font-semibold':'text-gray-700 dark:text-gray-300'}`}>
                {d.getDate()}
              </div>
              {isToday && <span className="h-2 w-2 rounded-full bg-blue-600" />}
            </div>
            <div className="flex flex-col gap-1">
              {dayEvents.slice(0,limit).map(ev=>(
                <div key={ev.id} className="text-[11px] px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 truncate">
                  {ev.title}
                </div>
              ))}
              {dayEvents.length>limit && (
                <button
                  className="text-[11px] text-blue-600 hover:underline text-left"
                  onClick={()=> setOpenDay(d)}
                >
                  + {dayEvents.length-limit} mais
                </button>
              )}
            </div>

            {/* Popover/Modal simples */}
            {openDay && isSameDay(openDay, d) && (
              <div className="absolute z-20 mt-1 p-3 w-64 rounded-md shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Eventos — {d.toLocaleDateString('pt-BR')}
                  </div>
                  <button 
                    onClick={()=>setOpenDay(null)} 
                    className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
                <div className="flex flex-col gap-2 max-h-64 overflow-auto">
                  {dayEvents.map(ev=>(
                    <div key={ev.id} className="text-xs">
                      <div className="font-medium text-gray-900 dark:text-white">{ev.title}</div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {ev.is_all_day ? 'Dia inteiro' : new Date(ev.start_time).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }))}
    </div>
  );
}



