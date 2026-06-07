import type { Message, MessageType, UserRole } from '../../types';
import { getDb, saveDb, generateId, ApiContext, ApiResponse, ok, fail } from '../db';

export function getMessages(ctx: ApiContext, query?: { type?: MessageType }): ApiResponse<Message[]> {
  const db = getDb();
  const { currentUserId, currentUserRole } = ctx;

  if (!currentUserId || !currentUserRole) {
    return fail<Message[]>('未登录');
  }

  let messages = db.messages.filter(
    (m) => m.userId === currentUserId && m.role === (currentUserRole as UserRole)
  );

  if (query?.type) {
    messages = messages.filter((m) => m.type === query.type);
  }

  messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return ok(messages);
}

export function markMessageRead(ctx: ApiContext, messageId: string): ApiResponse<Message> {
  const db = getDb();
  const { currentUserId } = ctx;

  if (!currentUserId) {
    return fail('未登录');
  }

  const idx = db.messages.findIndex((m) => m.id === messageId);
  if (idx === -1) {
    return fail('消息不存在');
  }

  if (db.messages[idx].userId !== currentUserId) {
    return fail('无权操作他人的消息');
  }

  db.messages[idx] = { ...db.messages[idx], read: true };
  saveDb(db);

  return ok(db.messages[idx]);
}

export function markAllMessagesRead(ctx: ApiContext): ApiResponse<{ updated: number }> {
  const db = getDb();
  const { currentUserId, currentUserRole } = ctx;

  if (!currentUserId || !currentUserRole) {
    return fail('未登录');
  }

  let count = 0;
  for (let i = 0; i < db.messages.length; i++) {
    if (
      db.messages[i].userId === currentUserId &&
      db.messages[i].role === (currentUserRole as UserRole) &&
      !db.messages[i].read
    ) {
      db.messages[i] = { ...db.messages[i], read: true };
      count++;
    }
  }

  saveDb(db);

  return ok({ updated: count });
}

export function getUnreadCount(ctx: ApiContext): ApiResponse<{ count: number }> {
  const db = getDb();
  const { currentUserId, currentUserRole } = ctx;

  if (!currentUserId || !currentUserRole) {
    return fail('未登录');
  }

  const count = db.messages.filter(
    (m) => m.userId === currentUserId && m.role === (currentUserRole as UserRole) && !m.read
  ).length;

  return ok({ count });
}
