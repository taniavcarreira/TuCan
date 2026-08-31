// Encriptação do lado do cliente para o nome/apelido do perfil — para
// que estes campos fiquem ilegíveis mesmo para quem tem acesso direto
// à base de dados (a chave nunca é enviada à Supabase, só vive no
// dispositivo da própria pessoa).
//
// Como funciona:
// - Contas com password: a chave deriva da própria password (PBKDF2),
//   no momento do login/registo — nunca é guardada em lado nenhum do
//   servidor. Se a pessoa usar a mesma password noutro dispositivo, a
//   chave é sempre a mesma, por isso o nome sincroniza sozinho. Se a
//   password for reposta (fluxo "esqueci-me da password"), a chave
//   muda — o nome/apelido antigo fica ilegível para sempre (para a
//   própria pessoa também, não só para nós) e é preciso voltar a
//   escrever. É um efeito secundário aceitável, dado que não é dado
//   crítico (ao contrário dos hábitos/dias registados, que não passam
//   por aqui).
// - Contas Google (sem password do lado da app): não há nada a derivar,
//   por isso gera-se uma chave aleatória na primeira vez, guardada só
//   naquele dispositivo. Não sincroniza sozinha entre dispositivos.
//
// A chave em si nunca é escrita na Supabase — só fica em AsyncStorage,
// local ao dispositivo/browser.
import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'tucan_profile_key_';
const PBKDF2_ITERATIONS = 50000;

function storageKey(userId) {
  return KEY_PREFIX + userId;
}

// Determinístico: a mesma password + o mesmo userId dão sempre a mesma
// chave, sem que a password seja guardada em lado nenhum.
export function deriveKeyFromPassword(password, userId) {
  return CryptoJS.PBKDF2(password, 'tucan:' + userId, {
    keySize: 256 / 32,
    iterations: PBKDF2_ITERATIONS,
  }).toString();
}

export async function cacheKey(userId, key) {
  try {
    await AsyncStorage.setItem(storageKey(userId), key);
  } catch (e) {
    // Melhor esforço — se falhar, só perdemos a conveniência de não
    // pedir para reescrever o nome, nunca dados de hábitos.
  }
}

export async function getCachedKey(userId) {
  try {
    return await AsyncStorage.getItem(storageKey(userId));
  } catch (e) {
    return null;
  }
}

// Para contas sem password (Google): usa a chave já guardada neste
// dispositivo, ou gera uma nova aleatória da primeira vez.
export async function getOrCreateDeviceKey(userId) {
  const existing = await getCachedKey(userId);
  if (existing) return existing;
  const randomKey = CryptoJS.lib.WordArray.random(256 / 8).toString();
  await cacheKey(userId, randomKey);
  return randomKey;
}

export function encryptProfileField(plainText, key) {
  if (!plainText || !key) return '';
  return CryptoJS.AES.encrypt(plainText, key).toString();
}

export function decryptProfileField(cipherText, key) {
  if (!cipherText || !key) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    return bytes.toString(CryptoJS.enc.Utf8) || '';
  } catch (e) {
    // Chave errada/em falta (ex.: dispositivo novo, ou password reposta
    // entretanto) — mostra vazio em vez de rebentar o ecrã.
    return '';
  }
}
