# 🔌 Documentação da API

Esta documentação descreve todas as APIs e serviços disponíveis no Sistema de Gestão Política.

## 📋 Índice

- [🔐 Autenticação](#-autenticação)
- [👥 Pessoas](#-pessoas)
- [👑 Líderes](#-líderes)
- [🏷️ Tags](#️-tags)
- [🗳️ Eleições](#️-eleições)
- [📊 Estatísticas](#-estatísticas)
- [🗺️ Mapas](#️-mapas)
- [📱 PWA](#-pwa)
- [🔧 Utilitários](#-utilitários)

## 🔐 Autenticação

### Login
```typescript
// Função
signInWithPassword(email: string, password: string)

// Exemplo
const { data, error } = await signInWithPassword(
  'usuario@exemplo.com',
  'senha123'
)

// Resposta
{
  data: {
    user: {
      id: 'uuid',
      email: 'usuario@exemplo.com',
      role: 'LEADER' | 'ADMIN'
    },
    session: { ... }
  },
  error: null
}
```

### Logout
```typescript
// Função
signOut()

// Exemplo
const { error } = await signOut()
```

### Verificar Sessão
```typescript
// Função
getSession()

// Exemplo
const { data: { session }, error } = await getSession()
```

## 👥 Pessoas

### Listar Pessoas
```typescript
// Função
listPeople(filters?: PeopleFilters)

// Exemplo
const { data, error } = await listPeople({
  city: 'Joinville',
  state: 'SC',
  tags: ['tag1', 'tag2']
})

// Resposta
{
  data: PersonWithTags[],
  error: string | null
}
```

### Criar Pessoa
```typescript
// Função
createPerson(person: PersonInsertWithTags)

// Exemplo
const { data, error } = await createPerson({
  full_name: 'João Silva',
  whatsapp: '47999999999',
  email: 'joao@exemplo.com',
  birth_date: '1990-01-01',
  gender: 'M',
  treatment: 'Sr.',
  cep: '89200-000',
  city: 'Joinville',
  state: 'SC',
  neighborhood: 'Centro',
  street: 'Rua das Flores',
  number: '123',
  owner_id: 'user-uuid',
  tags: ['tag-uuid-1', 'tag-uuid-2']
})

// Resposta
{
  data: PersonWithTags | null,
  error: string | null
}
```

### Atualizar Pessoa
```typescript
// Função
updatePerson(id: string, person: PersonUpdateWithTags)

// Exemplo
const { data, error } = await updatePerson('person-uuid', {
  full_name: 'João Silva Santos',
  email: 'joao.santos@exemplo.com'
})

// Resposta
{
  data: PersonWithTags | null,
  error: string | null
}
```

### Deletar Pessoa
```typescript
// Função
deletePerson(id: string)

// Exemplo
const { error } = await deletePerson('person-uuid')

// Resposta
{
  error: string | null
}
```

### Buscar Pessoa por ID
```typescript
// Função
getPerson(id: string)

// Exemplo
const { data, error } = await getPerson('person-uuid')

// Resposta
{
  data: PersonWithTags | null,
  error: string | null
}
```

### Verificar Duplicidade de WhatsApp
```typescript
// Função
checkWhatsAppDuplicate(whatsapp: string, currentPersonId?: string)

// Exemplo
const { isDuplicate, message } = await checkWhatsAppDuplicate(
  '47999999999',
  'current-person-uuid'
)

// Resposta
{
  isDuplicate: boolean,
  message?: string
}
```

## 👑 Líderes

### Listar Líderes
```typescript
// Função
listLeaders()

// Exemplo
const { data, error } = await listLeaders()

// Resposta
{
  data: LeaderRow[],
  error: string | null
}
```

### Criar Líder
```typescript
// Função
createLeader(leader: LeaderInsert)

// Exemplo
const { data, error } = await createLeader({
  email: 'lider@exemplo.com',
  full_name: 'Maria Líder',
  role: 'LEADER'
})

// Resposta
{
  data: LeaderRow | null,
  error: string | null
}
```

### Atualizar Líder
```typescript
// Função
updateLeader(id: string, leader: LeaderUpdate)

// Exemplo
const { data, error } = await updateLeader('leader-uuid', {
  full_name: 'Maria Líder Santos'
})

// Resposta
{
  data: LeaderRow | null,
  error: string | null
}
```

### Deletar Líder
```typescript
// Função
deleteLeader(id: string)

// Exemplo
const { error } = await deleteLeader('leader-uuid')

// Resposta
{
  error: string | null
}
```

### Buscar Detalhes do Líder
```typescript
// Função
getLeaderDetail(id: string)

// Exemplo
const { data, error } = await getLeaderDetail('leader-uuid')

// Resposta
{
  data: LeaderDetail | null,
  error: string | null
}
```

### Enviar Convite
```typescript
// Função
inviteLeader(invite: InviteLeaderInput)

// Exemplo
const { data, error } = await inviteLeader({
  email: 'novo@exemplo.com',
  full_name: 'Novo Líder'
})

// Resposta
{
  data: { success: boolean },
  error: string | null
}
```

## 🏷️ Tags

### Listar Tags
```typescript
// Função
getAvailableTags()

// Exemplo
const tags = await getAvailableTags()

// Resposta
Tag[]
```

### Criar Tag
```typescript
// Função
createTag(tag: TagInsert)

// Exemplo
const { data, error } = await createTag({
  name: 'Apoiador',
  color: '#3b82f6',
  description: 'Pessoas que apoiam a campanha'
})

// Resposta
{
  data: Tag | null,
  error: string | null
}
```

### Atualizar Tag
```typescript
// Função
updateTag(id: string, tag: TagUpdate)

// Exemplo
const { data, error } = await updateTag('tag-uuid', {
  name: 'Apoiador VIP',
  color: '#ef4444'
})

// Resposta
{
  data: Tag | null,
  error: string | null
}
```

### Deletar Tag
```typescript
// Função
deleteTag(id: string)

// Exemplo
const { error } = await deleteTag('tag-uuid')

// Resposta
{
  error: string | null
}
```

### Aplicar Tag a Pessoa
```typescript
// Função
applyTagToPerson(personId: string, tagId: string)

// Exemplo
const { data, error } = await applyTagToPerson(
  'person-uuid',
  'tag-uuid'
)

// Resposta
{
  data: { success: boolean },
  error: string | null
}
```

### Remover Tag de Pessoa
```typescript
// Função
removeTagFromPerson(personId: string, tagId: string)

// Exemplo
const { data, error } = await removeTagFromPerson(
  'person-uuid',
  'tag-uuid'
)

// Resposta
{
  data: { success: boolean },
  error: string | null
}
```

## 🗳️ Eleições

### Obter Configurações
```typescript
// Função
getElectionSettings()

// Exemplo
const { data, error } = await getElectionSettings()

// Resposta
{
  data: ElectionSettings | null,
  error: string | null
}
```

### Atualizar Configurações
```typescript
// Função
updateElectionSettings(settings: ElectionSettingsUpdate)

// Exemplo
const { data, error } = await updateElectionSettings({
  name: 'Eleição Municipal 2024',
  election_level: 'MUNICIPAL',
  start_date: '2024-01-01',
  end_date: '2024-12-31'
})

// Resposta
{
  data: ElectionSettings | null,
  error: string | null
}
```

## 📊 Estatísticas

### Obter Estatísticas do Dashboard
```typescript
// Função
getLeaderCounters(filters: DashboardFilters)

// Exemplo
const { data, error } = await getLeaderCounters({
  city: 'Joinville',
  state: 'SC',
  election_level: 'MUNICIPAL'
})

// Resposta
{
  data: {
    activeLeaders: number,
    pendingLeaders: number,
    totalPeople: number,
    confirmedVotes: number,
    probableVotes: number
  },
  error: string | null
}
```

### Obter Resumo de Metas
```typescript
// Função
getGoalSummary(filters: DashboardFilters)

// Exemplo
const { data, error } = await getGoalSummary({
  city: 'Joinville',
  state: 'SC'
})

// Resposta
{
  data: GoalSummary | null,
  error: string | null
}
```

### Obter Top Líderes
```typescript
// Função
getTopLeaders(filters: DashboardFilters)

// Exemplo
const { data, error } = await getTopLeaders({
  city: 'Joinville',
  state: 'SC',
  limit: 10
})

// Resposta
{
  data: TopLeader[],
  error: string | null
}
```

## 🗺️ Mapas

### Geocodificar Endereço
```typescript
// Função
geocodeAddress(address: string)

// Exemplo
const result = await geocodeAddress('Rua das Flores, 123, Joinville, SC')

// Resposta
{
  lat: number,
  lng: number,
  formatted_address: string
}
```

### Geocodificação Reversa
```typescript
// Função
reverseGeocode(lat: number, lng: number)

// Exemplo
const result = await reverseGeocode(-26.3044, -48.8461)

// Resposta
{
  formatted_address: string,
  address_components: AddressComponent[]
}
```

### Buscar CEP
```typescript
// Função
searchCEP(cep: string)

// Exemplo
const result = await searchCEP('89200-000')

// Resposta
{
  cep: string,
  logradouro: string,
  complemento: string,
  bairro: string,
  localidade: string,
  uf: string,
  ibge: string,
  gia: string,
  ddd: string,
  siafi: string
}
```

## 📱 PWA

### Registrar Service Worker
```typescript
// Função
registerServiceWorker()

// Exemplo
const registration = await registerServiceWorker()

// Resposta
ServiceWorkerRegistration
```

### Verificar Atualizações
```typescript
// Função
checkForUpdates()

// Exemplo
const hasUpdate = await checkForUpdates()

// Resposta
boolean
```

### Instalar PWA
```typescript
// Função
installPWA()

// Exemplo
await installPWA()

// Resposta
Promise<void>
```

### Solicitar Permissão de Notificação
```typescript
// Função
requestNotificationPermission()

// Exemplo
const granted = await requestNotificationPermission()

// Resposta
boolean
```

### Inscrever em Push Notifications
```typescript
// Função
subscribeToPushNotifications()

// Exemplo
const subscription = await subscribeToPushNotifications()

// Resposta
PushSubscription | null
```

## 🔧 Utilitários

### Tratamento de Erros
```typescript
// Função
handleSupabaseError(error: any, context: string)

// Exemplo
try {
  await someSupabaseOperation()
} catch (error) {
  const message = handleSupabaseError(error, 'operacao')
  console.error(message)
}

// Resposta
string
```

### Log de Desenvolvimento
```typescript
// Função
devLog(message: string, data?: any)

// Exemplo
devLog('Operação realizada', { userId: '123', action: 'create' })

// Resposta
void
```

### Normalizar Texto
```typescript
// Função
normalizeKey(text: string)

// Exemplo
const normalized = normalizeKey('João da Silva')
// Resultado: 'joao-da-silva'

// Resposta
string
```

### Formatar Nome com Tratamento
```typescript
// Função
formatNameWithTreatment(person: Person)

// Exemplo
const formatted = formatNameWithTreatment({
  full_name: 'João Silva',
  treatment: 'Sr.'
})
// Resultado: 'Sr. João Silva'

// Resposta
string
```

## 📝 Tipos TypeScript

### Person
```typescript
interface Person {
  id: string
  full_name: string
  whatsapp: string
  email?: string
  birth_date?: string
  gender?: 'M' | 'F' | 'O'
  treatment?: string
  cep?: string
  city?: string
  state?: string
  neighborhood?: string
  street?: string
  number?: string
  complement?: string
  latitude?: number
  longitude?: number
  owner: string
  created_at: string
  updated_at: string
}
```

### PersonWithTags
```typescript
interface PersonWithTags extends Person {
  tags: Tag[]
}
```

### Tag
```typescript
interface Tag {
  id: string
  name: string
  color: string
  description?: string
  created_at: string
  updated_at: string
}
```

### Leader
```typescript
interface Leader {
  id: string
  email: string
  role: 'LEADER' | 'ADMIN'
  full_name?: string
  created_at: string
  updated_at: string
  profiles: Profile
}
```

### ElectionSettings
```typescript
interface ElectionSettings {
  id: string
  name: string
  election_level: 'MUNICIPAL' | 'ESTADUAL' | 'FEDERAL'
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}
```

## 🚨 Códigos de Erro

### Supabase
- **PGRST116**: Recurso não encontrado
- **23505**: Violação de chave única
- **23503**: Violação de chave estrangeira
- **42501**: Permissão negada (RLS)

### Google Maps
- **ZERO_RESULTS**: Nenhum resultado encontrado
- **OVER_QUERY_LIMIT**: Limite de consultas excedido
- **REQUEST_DENIED**: Solicitação negada
- **INVALID_REQUEST**: Solicitação inválida

### ViaCEP
- **400**: CEP inválido
- **404**: CEP não encontrado
- **500**: Erro interno do servidor

## 📊 Limites e Quotas

### Supabase
- **Consultas**: 500.000/mês (plano gratuito)
- **Armazenamento**: 500MB (plano gratuito)
- **Bandwidth**: 5GB/mês (plano gratuito)

### Google Maps
- **Geocoding**: 40.000/mês (plano gratuito)
- **Maps JavaScript**: 28.000 carregamentos/mês
- **Places**: 1.000/mês (plano gratuito)

### ViaCEP
- **Consultas**: 3 por segundo
- **Sem limite mensal**

## 🔒 Segurança

### Autenticação
- **JWT tokens** com expiração
- **Refresh tokens** automáticos
- **Row Level Security (RLS)** ativado

### Autorização
- **Roles**: LEADER, ADMIN
- **Policies**: Baseadas em usuário
- **Isolamento**: Dados por organização

### Validação
- **Zod schemas** para validação
- **Sanitização** de inputs
- **Rate limiting** nas APIs

---

📚 **Documentação Completa!**

Para mais informações, consulte:
- [Guia de Instalação](INSTALLATION.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Contribuição](CONTRIBUTING.md)
