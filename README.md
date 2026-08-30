# Vas-Y! — React Native (Expo)

Conversão da versão web (HTML/CSS/JS de artifact) para uma app Expo/React
Native, pronta para correr no telemóvel via Expo Go e, mais tarde, para
build nativo iOS/Android.

## Como correr

```bash
npm install
npx expo start
```

Abre a app **Expo Go** no teu telemóvel (App Store / Play Store) e faz
scan ao QR code que aparece no terminal. Também podes carregar
`npm run ios` / `npm run android` se tiveres os simuladores instalados.

## Estrutura

```
App.js                     — root: fontes, sessão de autenticação, navegação, topbar
src/theme.js                — cores e fontes (mesma paleta da versão web)
src/supabaseClient.js       — ligação ao Supabase (URL + chave)
src/context/DataContext.js  — lê/escreve campos, dias e treinos no Supabase (por utilizador)
src/utils/dates.js          — helpers de datas (isoMonday, fmt, etc.)
src/utils/fields.js         — modelo de dados: campos, scoring, migração
src/components/
  Shape.js                  — os 10 ícones geométricos + ícone de confetis
  RingChart.js               — anel segmentado / modo "Perfect!" (avatar ou smiley)
  ToucanAvatar.js             — mascote tucano (silhueta poster/geométrica, chapéu+cor personalizáveis)
  Branch.js                   — ramo decorativo onde o tucano pousa no modo "Perfect!"
  Confetti.js                — animação de confetis ao atingir o score máximo
  ElectricLine.js             — linha animada ("descarga elétrica") por baixo do score
  WeeklyWaveChart.js          — gráfico de onda da semana (aba Semana)
  TrendAccordion.js           — acordeão de tendência mensal/anual (aba Semana)
  BottomNav.js                — barra de navegação inferior
src/screens/
  AuthScreen.js                — login / criação de conta (email + password)
  HojeScreen.js                — anel, ProudOfMe/Perfect fixos, campos dinâmicos, Energia
  SemanaScreen.js              — grelha semanal, onda semanal, tendência, resumo
  TreinoScreen.js              — registo de treinos (com date picker nativo) + gráfico semana/mês/ano
  ConfigScreen.js              — CRUD de campos (cor/ícone únicos, boolean/contagem)
  ProfileScreen.js              — "A minha conta": nome, apelido, avatar, reset password
src/utils/avatars.js          — lista de avatares propostos (emoji + cor da paleta)
```

## O que se manteve igual à versão web

- Perfect! e ProudOfMe fixos (75%/25%), com o modo smiley do Perfect!
  (ou o avatar escolhido em "A minha conta", se houver um definido)
- Sistema de campos configuráveis (até 10, cor+ícone únicos, boolean ou
  contagem com métrica/incremento)
- Score dinâmico (x/N consoante nº de campos), confetis ao atingir o máximo
- Energia mantida como campo fixo à parte (não entrou no sistema
  configurável — ver decisão explicada na conversa original)
- Migração automática de dados antigos (`migrateDay` em `fields.js`)

## Polimento visual recuperado

As três simplificações da primeira conversão foram resolvidas:

1. **Gráfico de onda semanal** (`WeeklyWaveChart.js`, curva suave via
   `react-native-svg`, reaproveita os dados já carregados da semana) e
   **acordeão de tendência mensal/anual** (`TrendAccordion.js`, com o
   seu próprio fetch mais alargado ao Supabase — ver `loadTrendDays` em
   `DataContext.js`) na aba Semana.
2. **Animação da "descarga elétrica"** — `ElectricLine.js`. Redesenhada
   a pedido: já não está sempre em loop — só dispara (rápida, subtil,
   estilo sinapse a piscar) quando marcas um campo no ecrã Hoje.
3. **Seletor de data no registo de treino** — agora usa
   `@react-native-community/datetimepicker` (novo na dependência,
   correr `npm install` outra vez). Android abre o picker nativo do
   sistema; iOS mostra um calendário inline por baixo do campo.

## Nova funcionalidade: "A minha conta"

Novo botão no canto superior direito (ao lado do de Configurações) abre
`ProfileScreen.js`:

- **Email** — só consulta (vem da conta Supabase, não é editável aqui)
- **Nome** e **Apelido** — editáveis, guardados em
  `supabase.auth.updateUser({ data: {...} })`, ou seja em
  `user_metadata` do próprio utilizador Auth. **Não é preciso criar
  nenhuma tabela nova** para isto.
- **Avatar** — grelha de tucanos (`ToucanAvatar.js` +
  `src/utils/avatars.js`, 8 combinações à escolha), agora num estilo
  ilustrativo/poster geométrico — silhueta preta contínua, bico em dois
  blocos de cor, penas da cauda com banda colorida, pernas turquesa —
  em vez do estilo anterior (peruca + cartoon, depois realista). É a
  mesma silhueta em todos os avatares; o que muda é só um chapéu/
  acessório (cartola, boné, laço, flor, coroa, auscultadores, bandana,
  ou nenhum) e a cor do bico/cauda — para ser fácil de personalizar sem
  desenhar cada avatar de raiz. Sem fundo em nenhum deles. O tucano
  escolhido substitui o smiley no ecrã Hoje: ao clicares em "Perfect!"
  ele voa a entrar no ecrã e pousa num pequeno ramo (`Branch.js`), e
  pisca o olho ao chegar.
- **Reset Password** — chama `supabase.auth.resetPasswordForEmail`;
  por agora usa o fluxo/email por omissão do Supabase (sem
  `redirectTo` configurado, porque a app ainda não tem deep-linking
  nativo — mesma decisão do login por password em vez de magic link,
  ver abaixo). O utilizador recebe o email e repõe a password fora da
  app.

## Confetis: primeiro plano + som

`Confetti.js` passou a ser desenhado ao nível do `App.js` (não dentro
do ecrã Hoje), como uma camada absoluta por cima de tudo — topbar,
separadores, barra inferior — para cair sempre em primeiro plano no
ecrã inteiro, mesmo com scroll. Também toca um som curto de confetis a
explodir (`assets/sounds/confetti-pop.wav`, gerado/sintetizado para
este projeto — sem licenciamento de terceiros a resolver) através do
`expo-audio` (novo na dependência).

## Histórico do mascote (tucano)

O `ToucanAvatar.js` passou por três versões:

1. Tucano cartoon simples, com "peruca" para distinguir avatares.
2. Tentativa de ilustração fotorrealista (gerada via Gamma) — não foi
   possível trazê-la para dentro da app: o acesso à rede a partir deste
   ambiente de trabalho é limitado a uma lista de domínios permitidos
   (registries de pacotes, GitHub, etc.), e as ferramentas de imagem da
   Adobe disponíveis aqui também recusam URLs fora da whitelist delas,
   pelo mesmo motivo de segurança. Como alternativa nesse momento, o
   vetor existente foi melhorado com gradientes/sombras.
3. **Versão atual** — estilo ilustrativo/poster geométrico (silhueta
   preta contínua, bico em blocos de cor, cauda com banda colorida),
   inspirado em referências visuais fornecidas diretamente no chat
   (upload de imagens, sem depender de rede nenhuma). Ver secção "A
   minha conta" acima.

Nota para o futuro: sempre que houver uma referência visual a seguir, o
caminho mais fiável é enviá-la aqui como anexo no chat (upload) — fica
logo disponível localmente, sem depender de ir buscar nada à rede.

## Sobre o armazenamento

Esta versão já fala diretamente com o **Supabase** — os dados deixaram de
viver só no telemóvel. Cada utilizador só vê os seus próprios dados
graças ao Row Level Security (RLS), ativado nas 3 tabelas.

### 1. Cria as tabelas

No **SQL Editor** do teu projeto Supabase:

```sql
create table fields (
  id text primary key,
  user_id uuid references auth.users not null,
  name text not null,
  type text not null check (type in ('bool','count')),
  color text not null,
  shape text not null,
  target numeric,
  metric text,
  step numeric,
  sort_order int not null default 0
);

create table days (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date not null,
  custom jsonb not null default '{}',
  mood int,
  therapy boolean default false,
  perfect boolean default false,
  unique (user_id, date)
);

create table sessions (
  id bigint primary key,
  user_id uuid references auth.users not null,
  date date not null,
  type text not null,
  duration int,
  intensity text
);

alter table fields enable row level security;
alter table days enable row level security;
alter table sessions enable row level security;

create policy "own fields" on fields for all using (auth.uid() = user_id);
create policy "own days" on days for all using (auth.uid() = user_id);
create policy "own sessions" on sessions for all using (auth.uid() = user_id);
```

> Nota: `sessions.id` é `bigint`, não `uuid` — o código usa `Date.now()`
> como id (gerado no telemóvel), o que é seguro para uso pessoal.

### 2. Ativa a autenticação por email

Em **Authentication → Providers**, confirma que **Email** está ativo.
Por omissão o Supabase pede confirmação por email antes do primeiro
login — podes desligar isso em **Authentication → Settings** durante o
desenvolvimento, para testares mais depressa.

### 3. Configura as chaves

Cria um ficheiro `.env` na raiz do projeto (não o incluas no git):

```
EXPO_PUBLIC_SUPABASE_URL=https://TEUPROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=a-tua-anon-key
```

O `src/supabaseClient.js` lê estas variáveis automaticamente. Sem
`.env`, usa os valores de placeholder (e a app não vai conseguir ligar).

### 4. Login na app

Ao abrir a app pela primeira vez, vês o ecrã de autenticação
(`src/screens/AuthScreen.js`) — cria conta com email/password. A sessão
fica guardada (via AsyncStorage) para não teres de fazer login todas as
vezes.

**Nota:** implementei email+password em vez de magic link para evitar a
configuração de deep-linking nativo (esquema de URL + `expo-linking`)
nesta primeira versão. Se preferires magic link mais tarde, é uma
alteração só no `AuthScreen.js` + configuração do `app.json`.

## Publicar nas stores

Com o projeto a funcionar via Expo Go, o caminho para as stores é o
**EAS Build** (Expo Application Services):

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
eas build --platform android
```

Isto gera os binários (.ipa / .aab) prontos para submissão à App Store
Connect e à Google Play Console. Precisas de conta de developer paga em
ambas (Apple: ~99 USD/ano; Google: taxa única ~25 USD).
