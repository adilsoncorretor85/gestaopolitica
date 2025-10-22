import { ChevronLeft, ChevronRight } from 'lucide-react';

type ViewType = 'day'|'week'|'month'|'list';

interface Props {
  currentDate: Date;
  view: ViewType;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onChangeView: (v: ViewType) => void;
  title: string;
}

export default function CalendarToolbar({ currentDate, view, onPrev, onNext, onToday, onChangeView, title }: Props) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2">
        <button aria-label="Hoje" onClick={onToday} className="px-3 py-1 rounded border text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          Hoje
        </button>
        <div className="flex">
          <button aria-label="Anterior" onClick={onPrev} className="p-2 rounded-l border border-r-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft className="h-4 w-4"/>
          </button>
          <button aria-label="Próximo" onClick={onNext} className="p-2 rounded-r border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <ChevronRight className="h-4 w-4"/>
          </button>
        </div>
        <h2 className="ml-3 text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="flex items-center gap-1">
        {(['day','week','month','list'] as const).map(v => (
          <button
            key={v}
            onClick={() => onChangeView(v)}
            className={`px-3 py-1 rounded border text-sm transition-colors ${
              view===v
                ?'bg-blue-600 text-white border-blue-600'
                :'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {v === 'day' ? 'Dia' : v==='week' ? 'Semana' : v==='month' ? 'Mês' : 'Lista'}
          </button>
        ))}
      </div>
    </div>
  );
}



