import Input from "@component/Input";
import Button from "@component/Button"
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { AppDispatch, RootState } from "../store/config";
import { loginThunk } from "../store/slice/authSlice";

export default function Login() {
  const [email,setemail]= useState<string>("");
  const [password,setpassword]= useState<string>("");
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error, email: userEmail } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (userEmail) {
      navigate("/chat");
    }
  }, [userEmail, navigate]);

  const onLogin = async () => {
    if (!email || !password) return;
    try {
      await dispatch(loginThunk({ email, password })).unwrap();
      navigate("/chat");
    } catch (err) {
      console.error("Login failed:", err);
    }
  };


  return (
    <div className="flex justify-center items-center w-screen h-screen bg-[#000000] text-white">
      <div className="p-20 rounded-2xl bg-[#101010] w-full max-w-md">
        <h2 className="text-2xl font-bold">Login</h2>
        {error && (
          <div className="mt-4 p-3 bg-red-950/50 border border-red-500/30 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-between gap-5 flex-col mt-6">
      
          <Input
            type="email"
            placeholder="email"
            value={email}
            onSet={setemail}
          />
          <Input
            type="password"
            placeholder="password"
            value={password}
            onSet={setpassword}
          />
          <Button text={loading?"loading...":"sign in"} onClick={onLogin} disable={loading}/>
          <p className="text-center text-xs text-gray-500 mt-2">
            Don't have an account?{" "}
            <button 
              onClick={() => navigate("/register")} 
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors duration-300 outline-none"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
