import type { Request, Response, NextFunction } from "express";
import { verifyJwt } from "./jwt.js";
import ENV from "../ENV.js";
import { users } from "./db/index.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    let token = req.cookies.authToken;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts[0] === "Bearer") {
        token = parts[1];
      } else {
        token = req.headers.authorization;
      }
    }

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    let decoded: any = verifyJwt(token, ENV.JWT_ACCESS_SECRET_KEY);
    if (!decoded) {
      decoded = verifyJwt(token, " ");
    }

    if (!decoded || !decoded.email) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
    }

    const user = await users.getUserByEmail(decoded.email);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
