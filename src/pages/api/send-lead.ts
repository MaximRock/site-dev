export const prerender = false;

export async function POST({ request }: { request: Request }) {
  const botToken = import.meta.env.TELEGRAM_BOT_TOKEN as string | undefined;
  const chatId = import.meta.env.TELEGRAM_CHAT_ID as string | undefined;

  if (!botToken || !chatId) {
    return new Response(JSON.stringify({ ok: false, message: "Отправка заявок временно недоступна" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: Record<string, string | boolean>;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, message: "Некорректный запрос" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const name = String(payload.name ?? "").trim();
  const contact = String(payload.contact ?? "").trim();
  const subject = String(payload.subject ?? "").trim();
  const comment = String(payload.comment ?? "").trim();
  const consent = payload.consent === true;

  if (!name || !contact || !consent) {
    return new Response(JSON.stringify({ ok: false, message: "Заполнены не все обязательные поля" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const text =
    "📩 Новая заявка\n\n" +
    `Имя: ${name}\n` +
    `Контакт: ${contact}\n` +
    `Тема: ${subject || "—"}\n` +
    `Комментарий: ${comment || "—"}\n` +
    (consent ? "Согласие: ✅" : "Согласие: ❌");

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: Number(chatId), text }),
    });
    const result = (await res.json()) as { ok?: boolean };
    return new Response(JSON.stringify({ ok: result.ok === true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, message: "Не удалось доставить заявку" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}