/** Synthetic Telegram updates for tests. Fake chat ids only. */

export const FAKE_CHAT_ID = 100200300;

export function messageUpdate(
  message: Record<string, unknown>,
  updateId = 1,
  chatType = "private",
) {
  return {
    update_id: updateId,
    message: {
      message_id: 10,
      date: 1763650000,
      chat: { id: FAKE_CHAT_ID, type: chatType },
      ...message,
    },
  };
}

export function callbackUpdate(data: string, updateId = 2) {
  return {
    update_id: updateId,
    callback_query: {
      id: "cbq-1",
      data,
      message: {
        message_id: 11,
        date: 1763650000,
        chat: { id: FAKE_CHAT_ID, type: "private" },
      },
    },
  };
}
