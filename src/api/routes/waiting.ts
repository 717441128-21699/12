import type { WaitingQueue } from '../../types';
import { getDb, saveDb, ApiContext, ApiResponse, ok, fail } from '../db';

export interface WaitingQueueWithPosition extends WaitingQueue {
  myPosition?: number;
}

export function getWaitingQueues(ctx: ApiContext): ApiResponse<WaitingQueueWithPosition[]> {
  const db = getDb();
  const { currentUserId, currentUserRole } = ctx;

  if (!currentUserId) {
    return fail<WaitingQueueWithPosition[]>('未登录');
  }

  if (currentUserRole === 'member') {
    const result: WaitingQueueWithPosition[] = [];
    for (const wq of db.waitingQueues) {
      const idx = wq.members.findIndex((m) => m.memberId === currentUserId);
      if (idx !== -1) {
        result.push({ ...wq, myPosition: idx + 1 });
      }
    }
    return ok(result);
  }

  if (currentUserRole === 'coach') {
    const coachCourseIds = db.courses.filter((c) => c.coachId === currentUserId).map((c) => c.id);
    const result = db.waitingQueues.filter((wq) => coachCourseIds.includes(wq.courseId));
    return ok(result);
  }

  if (currentUserRole === 'manager' || currentUserRole === 'owner') {
    return ok([...db.waitingQueues]);
  }

  return fail<WaitingQueueWithPosition[]>('无权访问');
}

export function deleteWaitingQueue(ctx: ApiContext, courseId: string): ApiResponse<{ removed: boolean; position: number }> {
  const db = getDb();
  const { currentUserId, currentUserRole } = ctx;

  if (!currentUserId) {
    return fail('未登录');
  }

  if (currentUserRole !== 'member') {
    return fail('只有会员可以退出候补');
  }

  const wqIdx = db.waitingQueues.findIndex((wq) => wq.courseId === courseId);
  if (wqIdx === -1) {
    return fail('候补队列不存在');
  }

  const queue = db.waitingQueues[wqIdx];
  const memberIdx = queue.members.findIndex((m) => m.memberId === currentUserId);
  if (memberIdx === -1) {
    return fail('您不在该课程的候补队列中');
  }

  const removedPosition = memberIdx + 1;

  db.waitingQueues[wqIdx] = {
    ...queue,
    members: queue.members.filter((m) => m.memberId !== currentUserId),
  };

  if (db.waitingQueues[wqIdx].members.length === 0) {
    db.waitingQueues.splice(wqIdx, 1);
  }

  saveDb(db);

  return ok({ removed: true, position: removedPosition });
}
