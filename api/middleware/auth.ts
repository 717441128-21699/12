import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import type { UserRole, MemberLevel, JwtPayload } from '../types';

export type AuthRequest = Request & {
  user?: JwtPayload;
};

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: '未提供认证令牌' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { user: AuthRequest['user'] };
    req.user = decoded.user;
    next();
  } catch {
    res.status(403).json({ error: '无效的认证令牌' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: '未登录' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `需要以下角色之一: ${roles.join(', ')}` });
      return;
    }
    next();
  };
}
