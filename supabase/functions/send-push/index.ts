// ==============================================================================
// EDGE FUNCTION: send-push
// ==============================================================================
// Thirret nga triggerët e databazës (public.notify_push, shih schema.sql seksioni 9) me trupin:
//   { type: 'INSERT' | 'UPDATE', table, record, old_record }
// dhe u dërgon njoftime anëtarëve përkatës të banesës: Web Push (VAPID) te shfletuesit
// dhe Expo Push te aplikacioni mobil.
//
// Sekretet (supabase secrets set ...): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_WEBHOOK_SECRET
// SUPABASE_URL dhe SUPABASE_SERVICE_ROLE_KEY jepen automatikisht nga Supabase.
// Deploy: supabase functions deploy send-push --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false }
});

type PushSecrets = {
  vapid_public_key: string;
  vapid_private_key: string;
  vapid_subject: string;
  push_webhook_secret: string;
};

let secretsCache: PushSecrets | null = null;

const getSecrets = async (): Promise<PushSecrets | null> => {
  if (secretsCache) return secretsCache;

  const envPub = Deno.env.get('VAPID_PUBLIC_KEY');
  const envPriv = Deno.env.get('VAPID_PRIVATE_KEY');
  const envSec = Deno.env.get('PUSH_WEBHOOK_SECRET');
  const envSub = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@kalkulimi.app';

  if (envPub && envPriv && envSec) {
    secretsCache = {
      vapid_public_key: envPub,
      vapid_private_key: envPriv,
      vapid_subject: envSub,
      push_webhook_secret: envSec
    };
    webpush.setVapidDetails(envSub, envPub, envPriv);
    return secretsCache;
  }

  // Lexohen nga Supabase Vault përmes funksionit të sigurt RPC të databazës
  const { data, error } = await admin.rpc('get_push_secrets');
  if (error || !data) {
    console.error('get_push_secrets error:', error);
    return null;
  }

  if (data.vapid_public_key && data.vapid_private_key && data.push_webhook_secret) {
    secretsCache = {
      vapid_public_key: data.vapid_public_key,
      vapid_private_key: data.vapid_private_key,
      vapid_subject: data.vapid_subject || envSub,
      push_webhook_secret: data.push_webhook_secret
    };
    webpush.setVapidDetails(secretsCache.vapid_subject, secretsCache.vapid_public_key, secretsCache.vapid_private_key);
    return secretsCache;
  }

  return null;
};




type Notice = { householdId: string; recipients: string[]; body: string; tag: string };

const euro = (value: unknown) => Number(value).toFixed(2);

const nameOf = async (id: string | null) => {
  if (!id) return 'Dikush';
  const { data } = await admin.from('profiles').select('name').eq('id', id).maybeSingle();
  return data?.name || 'Dikush';
};

// Anëtarët aktualë të banesës, pa atë që e shkaktoi ngjarjen
const otherMembers = async (householdId: string, exceptId: string | null) => {
  const { data } = await admin.from('profiles').select('id').eq('household_id', householdId);
  return (data || []).map((p) => p.id).filter((id) => id !== exceptId);
};

// Vendos kush njoftohet dhe me çfarë teksti; null = asnjë njoftim
const buildNotice = async (payload: any): Promise<Notice | null> => {
  const { type, table, record, old_record } = payload || {};
  if (!record) return null;

  if (table === 'expenses' && type === 'INSERT') {
    // Privatësia: shpenzimet individuale nuk u njoftohen kurrë të tjerëve
    if (record.is_personal) return null;
    const actor = record.created_by || record.paid_by;
    return {
      householdId: record.household_id,
      recipients: await otherMembers(record.household_id, actor),
      body: `${await nameOf(actor)} shtoi një shpenzim të ri: ${record.title} (${euro(record.total_amount)} €)`,
      tag: `expense-${record.id}`
    };
  }

  if (table === 'settlements' && type === 'INSERT') {
    // Njoftohet pala tjetër (marrësi kur regjistron debitori, debitori kur konfirmon kreditori)
    const actor = record.created_by;
    const other = actor === record.from_user ? record.to_user : record.from_user;
    return {
      householdId: record.household_id,
      recipients: [other],
      body: `${await nameOf(actor)} regjistroi një pagesë prej ${euro(record.amount)} €`,
      tag: `settlement-${record.id}`
    };
  }

  if (table === 'profiles' && (type === 'INSERT' || type === 'UPDATE')) {
    if (!record.household_id || record.household_id === old_record?.household_id) return null;
    return {
      householdId: record.household_id,
      recipients: await otherMembers(record.household_id, record.id),
      body: `${record.name || 'Një anëtar i ri'} u bashkua me banesën!`,
      tag: `join-${record.id}-${record.household_id}`
    };
  }

  return null;
};

type SendResult = { sent: number; failed: number; removed: number };

// Shfletuesit (Web Push me VAPID)
const sendWebPush = async (subs: any[], title: string, notice: Notice): Promise<SendResult> => {
  const message = JSON.stringify({ title, body: notice.body, tag: notice.tag, url: '/' });
  const expired: number[] = [];
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, message, { TTL: 60 * 60 * 24 })
        .catch((err: any) => {
          // 404/410: pajisja e ka çaktivizuar subskriptimin -> e fshijmë
          if (err?.statusCode === 404 || err?.statusCode === 410) expired.push(s.id);
          throw err;
        })
    )
  );
  if (expired.length) await admin.from('user_push_subscriptions').delete().in('id', expired);
  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return { sent, failed: results.length - sent, removed: expired.length };
};

// Telefonat (Expo Push API -> FCM / APNs). EXPO_ACCESS_TOKEN duhet vetëm nëse keni aktivizuar
// "Enhanced push security" te expo.dev; vendoset si sekret i Supabase, kurrë në kod.
const sendExpoPush = async (tokens: any[], title: string, notice: Notice): Promise<SendResult> => {
  const result: SendResult = { sent: 0, failed: 0, removed: 0 };
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  const expired: number[] = [];

  // Expo pranon deri në 100 njoftime për kërkesë
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100);
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(
          batch.map((t) => ({
            to: t.token,
            title,
            body: notice.body,
            sound: 'default',
            channelId: 'default',
            data: { tag: notice.tag }
          }))
        )
      });
      const json = await res.json().catch(() => null);
      const tickets: any[] = Array.isArray(json?.data) ? json.data : [];
      batch.forEach((t, idx) => {
        const ticket = tickets[idx];
        if (ticket?.status === 'ok') result.sent++;
        else {
          result.failed++;
          // Aplikacioni u çinstalua ose njoftimet u fikën -> tokeni s'vlen më
          if (ticket?.details?.error === 'DeviceNotRegistered') expired.push(t.id);
        }
      });
    } catch (err) {
      console.error('Expo push error:', err);
      result.failed += batch.length;
    }
  }

  if (expired.length) await admin.from('user_expo_push_tokens').delete().in('id', expired);
  result.removed = expired.length;
  return result;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secrets = await getSecrets();
  if (!secrets) {
    return Response.json({ error: 'Mungojnë sekretet e konfigurimit të njoftimeve në Vault / Environment.' }, { status: 500 });
  }

  if (req.headers.get('x-push-secret') !== secrets.push_webhook_secret) {
    return new Response('Unauthorized', { status: 401 });
  }


  const notice = await buildNotice(await req.json().catch(() => null));
  if (!notice || notice.recipients.length === 0) return Response.json({ sent: 0 });

  const [{ data: household }, { data: subs, error }, { data: expoTokens, error: expoError }] = await Promise.all([
    admin.from('households').select('name').eq('id', notice.householdId).maybeSingle(),
    admin.from('user_push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', notice.recipients),
    admin.from('user_expo_push_tokens').select('id, token').in('user_id', notice.recipients)
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const title = household?.name ? `Kalkulimi · ${household.name}` : 'Kalkulimi';
  const [web, mobile] = await Promise.all([
    sendWebPush(subs || [], title, notice),
    // Tabela e mobilit mund të mungojë nëse schema.sql (seksioni 10) s'është ekzekutuar ende
    expoError ? Promise.resolve({ sent: 0, failed: 0, removed: 0 }) : sendExpoPush(expoTokens || [], title, notice)
  ]);

  return Response.json({
    sent: web.sent + mobile.sent,
    failed: web.failed + mobile.failed,
    removed: web.removed + mobile.removed,
    web,
    mobile
  });
});
