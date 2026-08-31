import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '../supabaseClient';

// Necessário para o browser de autenticação (no telemóvel) fechar
// sozinho e devolver o controlo à app assim que o Google redireciona de
// volta. No web isto não faz nada (é seguro chamar sempre).
WebBrowser.maybeCompleteAuthSession();

async function createSessionFromUrl(url) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  const { access_token, refresh_token } = params;
  if (!access_token) return null;
  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  return data.session;
}

// Login/registo com Google. Nas duas plataformas o resultado final é o
// mesmo: dispara onAuthStateChange, que o App.js já escuta para trocar
// o ecrã de login pela app. Ver o guia de configuração do Supabase +
// Google Cloud para os passos que faltam do lado do painel (fora do
// código) — sem isso, esta função devolve sempre um erro do Supabase a
// dizer que o provider "google" não está ativo.
export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    // Num browser normal, um redireccionamento de página inteira é a
    // forma mais fiável (não depende de pop-ups, que muitos browsers
    // bloqueiam). O Supabase apanha a sessão sozinho quando a página
    // recarrega de volta (detectSessionInUrl: true, em
    // supabaseClient.js, só ativo no web).
    //
    // IMPORTANTE: usar sempre a URL "limpa" (sem hash/query), nunca
    // `window.location.href` tal como está. Se um login anterior tiver
    // deixado alguma coisa depois de um "#" na barra de endereço (mesmo
    // que seja só um "#" vazio), usar `.href` aqui apanhava esse
    // resto e o Supabase, ao voltar do Google, limitava-se a acrescentar
    // "#access_token=..." a seguir — resultando numa URL só com "##"
    // que o Supabase já não conseguia interpretar, e a pessoa ficava
    // presa sem conseguir entrar (bug real: login Google > logout >
    // login Google outra vez > nunca mais entra). Construir a partir de
    // `origin` + `pathname` garante que nunca herdamos esse resto.
    const cleanRedirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: cleanRedirectTo },
    });
    if (error) throw error;
    return null; // a página vai navegar para fora daqui, nunca chega a devolver
  }

  // No telemóvel (iOS/Android) usa-se um browser dentro da própria app,
  // que devolve o controlo através de um deep link (esquema "vasy://",
  // configurado em app.json).
  const redirectTo = Linking.createURL('/');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type === 'success' && res.url) {
    return createSessionFromUrl(res.url);
  }
  return null;
}
