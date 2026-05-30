import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store/config";
import Input from "../components/Input";
import Button from "../components/Button";
import { makeANetworkCall } from "../network/network";
import { register } from "../network/endpoint";

export default function Register() {
  const navigate = useNavigate();
  const { email: userEmail } = useSelector((state: RootState) => state.auth);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // If user is already logged in, redirect them to chat page
  useEffect(() => {
    if (userEmail) {
      navigate("/chat");
    }
  }, [userEmail, navigate]);

  // Countdown timer for redirection on success
  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (success && countdown === 0) {
      navigate("/");
    }
  }, [success, countdown, navigate]);

  const onRegister = async () => {
    if (!name || !email || !password || !code) {
      setError("All fields are required");
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      const response = await makeANetworkCall(register, "POST", {
        name,
        email,
        password,
        code
      });

      if (response.data.success) {
        setSuccess(true);
      } else {
        setError(response.data.message || "Registration failed");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        err.message || 
        "Something went wrong during registration."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center w-screen h-screen bg-[#07070d] text-white overflow-hidden relative">
      
      {/* Background neon glows */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-[120px]"></div>
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-600/10 blur-[120px]"></div>

      <div className="relative p-10 md:p-12 rounded-3xl bg-[#0f0f18]/85 border border-white/10 w-full max-w-md shadow-2xl backdrop-blur-xl transition-all duration-500">
        
        {success ? (
          /* SUCCESS STATE PANEL */
          <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
            <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto mb-6 shadow-lg shadow-emerald-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight text-white mb-3">Account Created!</h2>
            <p className="text-sm text-gray-400 mb-8 leading-relaxed">
              Your profile has been created successfully. Redirecting you to the sign-in screen in <span className="text-indigo-400 font-bold text-base">{countdown}</span> seconds.
            </p>

            <Button 
              text="Go to Login" 
              onClick={() => navigate("/")} 
              disable={false}
            />
          </div>
        ) : (
          /* REGISTRATION FORM STATE */
          <>
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Create Account</h2>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Join us today! Enter your details below to register.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-950/40 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium animate-shake">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4.5">
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide pl-1">Full Name</label>
                <Input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={name}
                  onSet={setName}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide pl-1">Email Address</label>
                <Input
                  type="email"
                  placeholder="e.g. alex@example.com"
                  value={email}
                  onSet={setEmail}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide pl-1">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onSet={setPassword}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center pr-1">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide pl-1">Verification Code</label>
                  <span className="text-[10px] font-bold text-indigo-400/80 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/15">Use: 1111</span>
                </div>
                <Input
                  type="text"
                  placeholder="Enter registration code"
                  value={code}
                  onSet={setCode}
                />
              </div>

              <div className="mt-4">
                <Button 
                  text={loading ? "Registering..." : "Sign Up"} 
                  onClick={onRegister} 
                  disable={loading}
                />
              </div>

              <p className="text-center text-xs text-gray-500 mt-4">
                Already have an account?{" "}
                <button 
                  onClick={() => navigate("/")} 
                  className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors duration-300 outline-none"
                >
                  Sign In
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
