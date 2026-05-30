import { Router } from "express";
import { signJwt, verifyJwt, type JwtPayload } from "@/lib/jwt.js";
import ENV from "@/ENV.js";
import { users } from "@/lib/db/index.js";
import bcrypt from "bcrypt"

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const user: any = await users.getUserByEmail(email);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const payload = { email: user.email, name: user.name };
    const signedAuthToken = signJwt(payload, " ", {
      expiresIn: "1m",
    });

    res
      .cookie(
        "authToken",
        signedAuthToken,
        {
          httpOnly: false,
          secure: false,
          sameSite: "strict",
          path: "/",
        }
      )
      .cookie(
        "refreshToken",
        signJwt(payload, ENV.JWT_REFRESH_SECRET_KEY, { expiresIn: "7d" }),
        {
          httpOnly: true,
          secure: false,
          sameSite: "strict",
          path: "/api/auth/refresh",
        },
      )
      .json({
        success: true,
        infoToken: signJwt(payload, " "),
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/refresh", (req, res): any => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res
        .status(401)
        .json({ success: false, message: "Refresh token missing" });
    }

    const decoded = verifyJwt(refreshToken, ENV.JWT_REFRESH_SECRET_KEY) as JwtPayload | null;
    if (!decoded) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });
    }

    const { iat, exp, ...payload } = decoded;
    const newAuthToken = signJwt(payload, ENV.JWT_ACCESS_SECRET_KEY, { expiresIn: "1m" });

    res
      .cookie("authToken", newAuthToken, {
        httpOnly: false,
        secure: false,
        sameSite: "strict",
        path: "/",
      })
      .json({
        success: true,
        authToken: newAuthToken,
      });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, code } = req.body;
    if (!name || !email || !password || !code) {
      res.status(400).json({
        success: false,
        message: "name, email, password, code Required",
      });
    } else if (code == "1111") {
      if (await users.isEmailExist(email))
        res.status(409).json({ success: false, message: "Email Exists" });
      else{
        const hash = await bcrypt.hash(password,10);
        await users.createNewUser(email,hash,name);
        res.status(201).json({success:true, message:"User Created"});
      }
    } else {
      res
        .status(401)
        .json({ success: false, message: "Code Verification Failed" });
    }
  } catch (err) {
    console.log(err);
  }
});

export default router;
