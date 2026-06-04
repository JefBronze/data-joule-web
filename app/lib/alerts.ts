// Best-effort multi-channel alerting for ops heartbeats.
// Every channel is gated on its own env vars — missing config = silently skipped,
// never throws. The `log` channel is always on (console.error → Vercel runtime logs).

export type AlertResult = { channel: string; ok: boolean; detail?: string }

async function sendTelegram(text: string): Promise<AlertResult | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return null
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    })
    return { channel: 'telegram', ok: res.ok, detail: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (e) {
    return { channel: 'telegram', ok: false, detail: String(e) }
  }
}

async function sendWhatsApp(text: string): Promise<AlertResult | null> {
  // Meta WhatsApp Cloud API. NOTE: free-form text only reaches you inside the
  // 24h customer-service window; for unsolicited alerts Meta may require an
  // approved message template instead. Swap the body for a template if so.
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_ID
  const to = process.env.WHATSAPP_TO
  if (!token || !phoneId || !to) return null
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    })
    return { channel: 'whatsapp', ok: res.ok, detail: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (e) {
    return { channel: 'whatsapp', ok: false, detail: String(e) }
  }
}

/** Fan out an alert to all configured channels. Always logs. Never throws. */
export async function sendAlert(text: string): Promise<AlertResult[]> {
  console.error(`[ALERT] ${text}`)
  const results = await Promise.all([sendTelegram(text), sendWhatsApp(text)])
  return [
    { channel: 'log', ok: true },
    ...results.filter((r): r is AlertResult => r !== null),
  ]
}
