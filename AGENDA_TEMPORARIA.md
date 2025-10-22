# 📅 PÁGINA AGENDA - REMOÇÃO TEMPORÁRIA

## ⚠️ STATUS: TEMPORARIAMENTE REMOVIDA

A página **Agenda** foi temporariamente removida do projeto para publicação no GitHub, pois ainda precisa de ajustes finais na integração com Google Calendar.

## 🔧 O QUE FOI REMOVIDO:

1. **Rota `/agenda`** - Comentada em `src/App.tsx`
2. **Link no Sidebar** - Comentado em `src/components/Sidebar.tsx`
3. **Import da página** - Comentado em `src/App.tsx`

## 📁 ARQUIVOS RELACIONADOS À AGENDA:

- `src/pages/Agenda.tsx` - Página principal da agenda
- `src/services/gcal.ts` - Serviços do Google Calendar
- `src/features/calendar/` - Componentes do calendário
- `supabase/functions/gcal_*` - Edge Functions do Google Calendar

## 🚀 PARA REATIVAR:

1. **Descomente em `src/App.tsx`**:
   ```typescript
   const Agenda = lazy(() => import("@/pages/Agenda"));
   ```

2. **Descomente a rota**:
   ```typescript
   <Route
     path="/agenda"
     element={
       <RouteGuard>
         <Agenda />
       </RouteGuard>
     }
   />
   ```

3. **Descomente no `src/components/Sidebar.tsx`**:
   ```typescript
   { id: 'agenda', label: 'Agenda', to: '/agenda', icon: Calendar },
   ```

4. **Adicione o import do Calendar**:
   ```typescript
   import { Home, Users, Shield, X, MapPin, BarChart3, Tags, Calendar } from 'lucide-react';
   ```

## ✅ FUNCIONALIDADES DISPONÍVEIS:

- ✅ Dashboard
- ✅ Pessoas
- ✅ Líderes (Admin)
- ✅ Tags (Admin)
- ✅ Projeção (Admin)
- ✅ Mapa
- ✅ Login/Logout
- ✅ Convites
- ✅ Perfil completo

## 📅 PRÓXIMOS PASSOS:

1. Finalizar ajustes na integração Google Calendar
2. Testar Edge Functions em produção
3. Reativar página Agenda
4. Deploy final com todas as funcionalidades

---
**Data da remoção**: 22/10/2025
**Motivo**: Ajustes finais na integração Google Calendar
