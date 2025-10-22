import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, RefreshCw, Link, Unlink, AlertCircle, Grid } from 'lucide-react';
import { listCachedEvents, gcalBegin, gcalSync, gcalRevoke, getGcalAccountStatus, GcalEvent, exchangeCodeForTokens } from '@/services/gcal';
import { useAuth } from '@/hooks/useAuth';
import { canViewCalendar, canConnectCalendar } from '@/lib/role';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CalendarToolbar from '@/features/calendar/CalendarToolbar';
import DayWeekGrid from '@/features/calendar/DayWeekGrid';
import MonthGrid from '@/features/calendar/MonthGrid';
import { formatRangeTitle, addDays, ViewType } from '@/features/calendar/calendarUtils';

export default function Agenda() {
  const { profile } = useAuth();
  const role = profile?.role as ('ADMIN' | 'LEADER' | 'USER' | undefined);

  const [events, setEvents] = useState<GcalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<{ connected: boolean; email?: string }>({ connected: false });
  
  // Estado do calendário
  const [view, setView] = useState<ViewType>(() => (localStorage.getItem('calendar:viewType') as ViewType) || 'week');
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const iso = localStorage.getItem('calendar:date');
    return iso ? new Date(iso) : new Date();
  });

  // Persistir estado no localStorage
  useEffect(() => { 
    localStorage.setItem('calendar:viewType', view); 
  }, [view]);
  
  useEffect(() => { 
    localStorage.setItem('calendar:date', currentDate.toISOString()); 
  }, [currentDate]);

  // Funções de navegação
  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    if (view==='day') setCurrentDate(addDays(currentDate, -1));
    else if (view==='week') setCurrentDate(addDays(currentDate, -7));
    else if (view==='month') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()-1, 1));
  };
  const goNext = () => {
    if (view==='day') setCurrentDate(addDays(currentDate, 1));
    else if (view==='week') setCurrentDate(addDays(currentDate, 7));
    else if (view==='month') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 1));
  };

  // Interceptar callback do Google (quando retorna da autorização)
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (code && state) {
      console.log('📥 Callback do Google detectado!', { code: code.substring(0, 10), state });
      
      // Processar no frontend (workaround para problema de rede do Docker)
      (async () => {
        try {
          setBusy(true);
          setError(null);
          
          // Limpar URL imediatamente para evitar re-tentativas com o mesmo código
          window.history.replaceState({}, '', '/agenda');
          
          const result = await exchangeCodeForTokens(code, state);
          console.log('🔍 Result from exchangeCodeForTokens:', result);
          
          if (result.success) {
            console.log('✅ Conexão com Google Calendar estabelecida!');
            // Recarregar dados
            await loadData();
          } else {
            // Mensagem de erro mais clara
            const errorMsg = result.error || 'Falha ao conectar com Google Calendar';
            console.error('❌ Erro ao conectar:', errorMsg);
            if (errorMsg.includes('invalid_grant') || errorMsg.includes('Bad Request')) {
              setError('❌ O código de autorização expirou ou já foi usado. Por favor, tente conectar novamente.');
            } else {
              setError(errorMsg);
            }
            console.log('Estado do erro após setError:', errorMsg);
          }
        } catch (e: any) {
          setError(e.message || 'Erro ao processar callback');
        } finally {
          setBusy(false);
        }
      })();
      
      return; // Não carregar dados ainda
    }
  }, []);

  useEffect(() => {
    if (!canViewCalendar(role)) {
      setError('Você não tem permissão para acessar a agenda.');
      setLoading(false);
      return;
    }

    loadData();
  }, [role]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [eventsData, statusData] = await Promise.all([
        listCachedEvents(),
        getGcalAccountStatus()
      ]);
      
      setEvents(eventsData);
      setAccountStatus(statusData);
    } catch (e: any) {
      setError(e.message ?? 'Falha ao carregar dados da agenda');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setBusy(true);
      setError(null);
      const { authUrl } = await gcalBegin();
      window.location.href = authUrl;
    } catch (e: any) {
      setError(e.message ?? 'Falha ao iniciar conexão com Google Calendar');
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async () => {
    try {
      setBusy(true);
      setError(null);
      await gcalSync();
      await loadData(); // Recarrega os dados após sincronização
    } catch (e: any) {
      setError(e.message ?? 'Falha ao sincronizar agenda');
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setBusy(true);
      setError(null);
      await gcalRevoke();
      setEvents([]);
      setAccountStatus({ connected: false });
    } catch (e: any) {
      setError(e.message ?? 'Falha ao desconectar agenda');
    } finally {
      setBusy(false);
    }
  };


  const getEventStatus = (event: GcalEvent) => {
    const now = new Date();
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);

    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'past';
  };

  if (!canViewCalendar(role)) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header 
        profile={profile ? {
          id: profile.id,
          role: profile.role || 'LEADER',
          full_name: profile.full_name || null,
          email: (profile as any).email || '',
          created_at: (profile as any).created_at || new Date().toISOString(),
          updated_at: (profile as any).updated_at || new Date().toISOString()
        } : undefined}
        sidebarOpen={false}
        setSidebarOpen={() => {}}
      />
      
      <div className="flex">
        <div className="md:w-64 flex-shrink-0">
          <Sidebar 
            isOpen={false}
            onClose={() => {}}
            activeTab="agenda"
            setActiveTab={() => {}}
          />
        </div>
        
        <main className="flex-1 overflow-x-hidden">
          {/* Header da Agenda - Estilo Google Calendar */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-blue-600" />
                    <div>
                      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Agenda
                      </h1>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {profile?.full_name || 'Vereador'}
                      </p>
                    </div>
                  </div>
                  
                  {accountStatus.connected && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-800 dark:text-green-200 font-medium">
                        {accountStatus.email}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {canConnectCalendar(role) && !accountStatus.connected && (
                    <Button
                      onClick={handleConnect}
                      disabled={busy}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Link className="h-4 w-4 mr-2" />
                      Conectar Google Calendar
                    </Button>
                  )}

                  {accountStatus.connected && (
                    <>
                      <Button
                        onClick={handleSync}
                        disabled={busy}
                        variant="outline"
                        className="border-gray-300 hover:bg-gray-50"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${busy ? 'animate-spin' : ''}`} />
                        Sincronizar
                      </Button>
                      <Button
                        onClick={handleDisconnect}
                        disabled={busy}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Unlink className="h-4 w-4 mr-2" />
                        Desconectar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Conteúdo da Agenda */}
          <div className="p-6">
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600 dark:text-gray-400">Carregando eventos...</p>
                </div>
              </div>
            ) : events.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Nenhum evento encontrado
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {accountStatus.connected 
                      ? "Clique em 'Sincronizar' para buscar eventos do Google Calendar."
                      : "Conecte sua conta do Google Calendar para visualizar os compromissos."
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-7xl mx-auto">
                {/* Toolbar do Calendário */}
                <CalendarToolbar
                  currentDate={currentDate}
                  view={view}
                  onPrev={goPrev}
                  onNext={goNext}
                  onToday={goToday}
                  onChangeView={setView}
                  title={formatRangeTitle(currentDate, view)}
                />

                {/* Grade principal do calendário */}
                {view === 'month' && (
                  <MonthGrid date={currentDate} events={events} />
                )}
                {(view === 'week' || view === 'day') && (
                  <DayWeekGrid date={currentDate} view={view==='day'?'day':'week'} events={events} />
                )}
                {view === 'list' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Eventos
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {events.length} evento{events.length !== 1 ? 's' : ''} encontrado{events.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        <Grid className="h-3 w-3 mr-1" />
                        Lista
                      </Badge>
                    </div>

                    {/* Grid de Eventos - Estilo Google Calendar */}
                    <div className="grid gap-3">
                      {events.map((event) => {
                        const startDate = new Date(event.start_time);
                        const isToday = new Date().toDateString() === startDate.toDateString();
                        const isPast = startDate < new Date() && !event.is_all_day;
                        const status = getEventStatus(event);
                        
                        return (
                          <div
                            key={event.id}
                            className={`
                              event-card group relative rounded-lg border-l-4 p-4
                              ${isToday ? 'today-event' : status === 'ongoing' ? 'ongoing-event' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}
                              ${isPast ? 'past-event' : ''}
                            `}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className={`
                                    h-3 w-3 rounded-full flex-shrink-0
                                    ${isToday ? 'bg-blue-500' : status === 'ongoing' ? 'bg-green-500' : 'bg-gray-400'}
                                  `}></div>
                                  <h3 className={`
                                    font-medium text-sm leading-tight
                                    ${isToday ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'}
                                  `}>
                                    {event.title}
                                  </h3>
                                  {status === 'ongoing' && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                                      <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                      <span className="text-xs text-green-800 dark:text-green-200 font-medium">Agora</span>
                                    </div>
                                  )}
                                </div>
                                
                                {event.description && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                    {event.description}
                                  </p>
                                )}
                                
                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {event.is_all_day 
                                        ? 'Dia inteiro'
                                        : startDate.toLocaleString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })
                                      }
                                    </span>
                                  </div>
                                  
                                  {event.location && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      <span className="truncate max-w-32">{event.location}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {isToday && (
                                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                                    Hoje
                                  </Badge>
                                )}
                                {status === 'ongoing' && (
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                                    Agora
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}