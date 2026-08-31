-- Verifica se um email já está registado na TuCAN!, e se sim, como
-- (password normal ou via Google) — usado pelos ecrãs de login e de
-- "Recuperar password" (src/screens/AuthScreen.js) para dar mensagens
-- específicas ("utilizador não registado" vs "password incorreta" vs
-- "registaste-te pelo Google"), que o Supabase não expõe por omissão
-- (para evitar que alguém descubra quais emails têm conta só por
-- tentativa e erro).
--
-- Nota de segurança: esta função abre mão desse controlo por escolha
-- deliberada — devolve só 'not_registered' | 'password' | 'google',
-- nada mais dos dados da conta, mas mesmo assim permite a alguém
-- confirmar se um email tem conta na TuCAN. Para uma app pequena/de
-- focus group como esta, a troca vale a pena pela experiência de
-- utilização; não seria recomendado para uma app com muitos
-- utilizadores ou dados sensíveis.
--
-- Como aplicar: Supabase → SQL Editor → cola isto tudo → Run.
-- A app funciona sem isto (cai de volta nas mensagens genéricas do
-- Supabase) — isto só liga as mensagens mais específicas.

create or replace function public.check_email_status(p_email text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_is_google boolean;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    return 'not_registered';
  end if;

  select exists (
    select 1 from auth.identities
    where user_id = v_user_id and provider = 'google'
  ) into v_is_google;

  if v_is_google then
    return 'google';
  end if;

  return 'password';
end;
$$;

grant execute on function public.check_email_status(text) to anon, authenticated;
