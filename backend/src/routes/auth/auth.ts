import { Router } from "express";
import { signJwt, verifyJwt, type JwtPayload } from "@/lib/jwt.js";
import ENV from "@/ENV.js";
import { users } from "@/lib/db/index.js";
import bcrypt from "bcrypt"

const router = Router();

router.get("/login", (req, res) => {
  const { username, password } = req.query;
  if (username == "" || password == "") {
    res
      .status(400)
      .json({ success: false, message: "Username and password are required" });
  } else if (username === "admin" && password === "password") {
    res
      .cookie(
        "refreshToken",
        signJwt({ username }, ENV.JWT_REFRESH_SECRET_KEY, { expiresIn: "7d" }),
        {
          httpOnly: true,
          secure: false,
          sameSite: "strict",
          path: "/api/auth/refresh",
        },
      )
      .json({
        success: true,
        infoToken: signJwt({ username }, " "),
        authToken: signJwt({ username }, ENV.JWT_ACCESS_SECRET_KEY, {
          expiresIn: "1m",
        }),
      });
  } else {
    res.json({ success: false, message: "Invalid credentials" });
  }
});

router.get("/refresh", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  const { iat, exp, ...payload } = verifyJwt(
    refreshToken,
    ENV.JWT_REFRESH_SECRET_KEY,
  ) as JwtPayload;
  if (!payload) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid refresh token" });
  }
  res.json({
    success: true,
    authToken: signJwt(payload, ENV.JWT_ACCESS_SECRET_KEY, { expiresIn: "1m" }),
  });
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
