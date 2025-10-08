import React, { useState, useEffect } from 'react';
import { Cake, Calendar, Phone, Mail, MapPin, MessageCircle, Copy } from 'lucide-react';
import { getTodayBirthdays, getUpcomingBirthdays, type BirthdayPerson } from '@/services/birthday';

const BirthdayCard: React.FC = () => {
  const [todayBirthdays, setTodayBirthdays] = useState<BirthdayPerson[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(false);

  useEffect(() => {
    loadBirthdays();
  }, []);

  const loadBirthdays = async () => {
    try {
      setLoading(true);
      const [today, upcoming] = await Promise.all([
        getTodayBirthdays(),
        getUpcomingBirthdays(7)
      ]);
      
      setTodayBirthdays(today);
      setUpcomingBirthdays(upcoming);
    } catch (error) {
      console.error('Erro ao carregar aniversariantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLocation = (person: BirthdayPerson) => {
    const parts = [person.neighborhood, person.city, person.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Localização não informada';
  };

  const generateWhatsAppLink = (phone: string, name: string, isToday: boolean = true) => {
    // Remove caracteres não numéricos do telefone
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Adiciona código do país se não tiver (Brasil = 55)
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    // Mensagem personalizada baseada se é hoje ou não
    let message: string;
    
    if (isToday) {
      // Mensagem para aniversário hoje - usando emojis de forma mais compatível
      message = `🎉 Parabéns ${name}! 🎂\n\nQue este novo ano de vida seja repleto de alegrias, conquistas e muitas felicidades!\n\nUm abraço carinhoso! 💙`;
    } else {
      // Mensagem para aniversário futuro
      message = `Olá ${name}! 👋\n\nVi que seu aniversário está chegando! 🎂\n\nQuero te parabenizar antecipadamente e desejar que este novo ano de vida seja repleto de alegrias, conquistas e muitas felicidades!\n\nUm abraço carinhoso! 💙`;
    }
    
    // Debug: log da mensagem para verificar se os emojis estão corretos
    console.log('Mensagem original:', message);
    console.log('Mensagem codificada:', encodeURIComponent(message));
    
    // Solução mais simples: usar encodeURIComponent padrão
    // O problema pode estar em outro lugar, não na codificação
    const encodedMessage = encodeURIComponent(message);
    
    const finalUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    console.log('URL final:', finalUrl);
    console.log('Mensagem decodificada:', decodeURIComponent(encodedMessage));
    
    return finalUrl;
  };

  const handleWhatsAppClick = (phone: string, name: string, isToday: boolean = true) => {
    const whatsappLink = generateWhatsAppLink(phone, name, isToday);
    window.open(whatsappLink, '_blank');
  };

  // Função alternativa para copiar mensagem para área de transferência
  const handleCopyMessage = async (phone: string, name: string, isToday: boolean = true) => {
    let message: string;
    
    if (isToday) {
      message = `🎉 Parabéns ${name}! 🎂\n\nQue este novo ano de vida seja repleto de alegrias, conquistas e muitas felicidades!\n\nUm abraço carinhoso! 💙`;
    } else {
      message = `Olá ${name}! 👋\n\nVi que seu aniversário está chegando! 🎂\n\nQuero te parabenizar antecipadamente e desejar que este novo ano de vida seja repleto de alegrias, conquistas e muitas felicidades!\n\nUm abraço carinhoso! 💙`;
    }
    
    try {
      await navigator.clipboard.writeText(message);
      alert('Mensagem copiada para a área de transferência! Cole no WhatsApp.');
    } catch (err) {
      console.error('Erro ao copiar mensagem:', err);
      // Fallback: mostrar mensagem em um prompt
      prompt('Copie a mensagem abaixo:', message);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
            <Cake className="h-5 w-5 text-pink-600 dark:text-pink-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Aniversariantes</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  const hasTodayBirthdays = todayBirthdays.length > 0;
  const hasUpcomingBirthdays = upcomingBirthdays.length > 0;

  if (!hasTodayBirthdays && !hasUpcomingBirthdays) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
            <Cake className="h-5 w-5 text-pink-600 dark:text-pink-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Aniversariantes</h3>
        </div>
        <div className="text-center py-8">
          <Cake className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Nenhum aniversariante nos próximos dias</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
            <Cake className="h-5 w-5 text-pink-600 dark:text-pink-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Aniversariantes</h3>
        </div>
        
        {hasUpcomingBirthdays && (
          <button
            onClick={() => setShowUpcoming(!showUpcoming)}
            className="text-sm text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 transition-colors"
          >
            {showUpcoming ? 'Ver apenas hoje' : 'Ver próximos 7 dias'}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Aniversariantes de hoje */}
        {hasTodayBirthdays && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Hoje ({todayBirthdays.length})
              </span>
            </div>
            <div className="space-y-3">
              {todayBirthdays.map((person) => (
                <div key={person.id} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{person.full_name}</h4>
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                          {person.age} anos
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        {person.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-3 w-3" />
                            <span>{person.phone}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <Mail className="h-3 w-3" />
                          <span>{person.email}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-3 w-3" />
                          <span>{formatLocation(person)}</span>
                        </div>
                      </div>
                      
                      {/* Botões de Ação */}
                      {person.phone && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleWhatsAppClick(person.phone!, person.full_name, true)}
                            className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                            title="Abrir WhatsApp com mensagem de parabéns pré-formatada"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => handleCopyMessage(person.phone!, person.full_name, true)}
                            className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                            title="Copiar mensagem para área de transferência"
                          >
                            <Copy className="h-4 w-4" />
                            <span>Copiar</span>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <Cake className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Próximos aniversariantes */}
        {showUpcoming && hasUpcomingBirthdays && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Próximos 7 dias ({upcomingBirthdays.length})
              </span>
            </div>
            <div className="space-y-3">
              {upcomingBirthdays.map((person) => {
                const birthDate = new Date(person.birth_date);
                const today = new Date();
                const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
                
                if (thisYearBirthday < today) {
                  thisYearBirthday.setFullYear(today.getFullYear() + 1);
                }
                
                const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isToday = daysUntil === 0;
                
                return (
                  <div 
                    key={person.id} 
                    className={`p-4 rounded-lg border ${
                      isToday 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">{person.full_name}</h4>
                          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                            {person.age} anos
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {isToday ? 'Hoje' : `em ${daysUntil} dia${daysUntil > 1 ? 's' : ''}`}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          {person.phone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="h-3 w-3" />
                              <span>{person.phone}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2">
                            <Mail className="h-3 w-3" />
                            <span>{person.email}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-3 w-3" />
                            <span>{formatLocation(person)}</span>
                          </div>
                        </div>
                        
                        {/* Botões de Ação */}
                        {person.phone && (
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => handleWhatsAppClick(person.phone!, person.full_name, isToday)}
                              className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                              title={isToday ? "Abrir WhatsApp com mensagem de parabéns pré-formatada" : "Abrir WhatsApp com mensagem de parabéns antecipado"}
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span>WhatsApp</span>
                            </button>
                            <button
                              onClick={() => handleCopyMessage(person.phone!, person.full_name, isToday)}
                              className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                              title="Copiar mensagem para área de transferência"
                            >
                              <Copy className="h-4 w-4" />
                              <span>Copiar</span>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isToday 
                            ? 'bg-green-100 dark:bg-green-900' 
                            : 'bg-blue-100 dark:bg-blue-900'
                        }`}>
                          <Cake className={`h-6 w-6 ${
                            isToday 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-blue-600 dark:text-blue-400'
                          }`} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BirthdayCard;
