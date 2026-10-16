import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { randomUUID } from 'node:crypto';

if(process.env.NODE_ENV==='production' && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET.length<32 || process.env.JWT_REFRESH_SECRET.length<32 || process.env.JWT_SECRET===process.env.JWT_REFRESH_SECRET)) {
  throw new Error('Production requires distinct JWT keys of at least 32 characters');
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_dev_key_cd09";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "15m") as any;

const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "default_jwt_refresh_secret_dev_key_cd09";
const JWT_REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN || "30d") as any;

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: JWT_EXPIRES_IN,
    jwtid: randomUUID(),
  });
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    algorithm: "HS256",
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    jwtid: randomUUID(),
  });
};

export const verifyAccessToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as JwtPayload;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, { algorithms: ["HS256"] }) as JwtPayload;
  } catch (error) {
    return null;
  }
};
