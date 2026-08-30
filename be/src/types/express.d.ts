import "express";

export interface JwtPayloadUser {
  id: string;
  username?: string;
  role: "admin" | "user";
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayloadUser;
      file?: any;
    }
  }
}
