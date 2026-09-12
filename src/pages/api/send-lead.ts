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

  const chatIdNumber = Number(chatId);
  if (!Number.isInteger(chatIdNumber)) {
    console.error("[send-lead] invalid TELEGRAM_CHAT_ID:", JSON.stringify(chatId));
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
      body: JSON.stringify({ chat_id: chatIdNumber, text }),
      signal: AbortSignal.timeout(8000),
    });
    const result = (await res.json()) as { ok?: boolean; error_code?: number; description?: string };
    if (result.ok !== true) {
      console.error("[send-lead] telegram rejected:", res.status, result.error_code, result.description);
      return new Response(JSON.stringify({ ok: false, message: "Не удалось доставить заявку" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-lead] telegram request failed:", err);
    return new Response(JSON.stringify({ ok: false, message: "Не удалось доставить заявку" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}