import jwt, { type JwtPayload } from "jsonwebtoken";
export const signJwt = (
  payload: JwtPayload,
  secret: string,
  options?: jwt.SignOptions,
) => {
  return jwt.sign(payload, secret, options);
};
export type { JwtPayload }
export const verifyJwt = (token: string, secret: string) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};
