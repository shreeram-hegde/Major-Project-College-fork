import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Sparkles, Mail, Lock } from "lucide-react";
import toast from 'react-hot-toast';
import { validateEmail } from "../../utils/helper";
import { API_PATHS } from "../../utils/apiPaths";
import axiosInstance from "../../utils/axiosInstance";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isHoveringLogin, setIsHoveringLogin] = useState(false);
  const [hoverGoogle, setHoverGoogle] = useState(false);
  const [hoverApple, setHoverApple] = useState(false);
  const [hoverSignUp, setHoverSignUp] = useState(false);
  const [colorPhase, setColorPhase] = useState(0);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // Handle login form submit
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    setError("");

    // Login API call
    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
        email,
        password,
      });
      const { token } = response.data;
      if (token) {
        localStorage.setItem("token", token);
        toast.success("Login successful!");
        navigate("/dashboard"); // Redirect to dashboard
      }
    } catch (error) {
      console.error(error); // Log full error for debugging
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message);
        toast.error(error.response.data.message);
      } else {
        setError("An error occurred while logging in. Please try again.");
      }
    }
  };

  // Animate color gradients continuously
  useEffect(() => {
    const interval = setInterval(() => {
      setColorPhase((prev) => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const getGradientStyle = (offset = 0) => {
    const hue = (colorPhase + offset) % 360;
    return {
      background: `linear-gradient(135deg, 
        hsl(${hue}, 70%, 50%) 0%, 
        hsl(${(hue + 60) % 360}, 70%, 50%) 50%, 
        hsl(${(hue + 120) % 360}, 70%, 50%) 100%)`,
    };
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={getGradientStyle(0)}
      />

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full mix-blend-overlay filter blur-3xl opacity-30 animate-pulse"
          style={getGradientStyle(120)}
        ></div>
        <div
          className="absolute top-1/3 right-1/4 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full mix-blend-overlay filter blur-3xl opacity-30 animate-pulse"
          style={{ ...getGradientStyle(240), animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-1/4 left-1/3 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full mix-blend-overlay filter blur-3xl opacity-30 animate-pulse"
          style={{ ...getGradientStyle(60), animationDelay: "2s" }}
        ></div>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-[90%] sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl">
        {/* Liquid glass effect container */}
        <div className="relative backdrop-blur-2xl bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-10 shadow-2xl border border-white/20 transition-all duration-300 hover:border-white/30 hover:bg-white/15">
          {/* Shimmer effect overlay */}
          <div className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden pointer-events-none">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: `linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)`,
                backgroundSize: "200% 200%",
                animation: "shimmer 3s infinite",
              }}
            ></div>
          </div>
          <style>{`
            @keyframes shimmer {
              0% { background-position: 200% 200%; }
              100% { background-position: -200% -200%; }
            }
          `}</style>

          {/* Content */}
          <div className="relative z-10">
            {/* Logo/Icon */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <div className="relative transition-transform duration-300 hover:scale-110 cursor-pointer">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-lg transition-all duration-500"
                  style={getGradientStyle(180)}
                >
                  <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
                </div>
                <div
                  className="absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse"
                  style={getGradientStyle(180)}
                ></div>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-1 sm:mb-2 transition-all duration-300 hover:scale-105">
              Welcome Back
            </h2>
            <p className="text-sm sm:text-base text-white/70 text-center mb-6 sm:mb-8">
              Sign in to continue
            </p>

            {/* FORM Starts Here */}
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
              {/* Email Input */}
              <div className="space-y-1 sm:space-y-2">
                <label className="text-white/90 text-xs sm:text-sm font-medium block">
                  Email
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/50 group-focus-within:text-white/80 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all duration-300 hover:bg-white/12"
                  />
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-500/0 via-green-500/0 to-yellow-500/0 group-focus-within:from-blue-500/10 group-focus-within:via-green-500/10 group-focus-within:to-yellow-500/10 transition-all duration-500 pointer-events-none group-hover:from-blue-500/5 group-hover:via-green-500/5 group-hover:to-yellow-500/5"></div>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1 sm:space-y-2">
                <label className="text-white/90 text-xs sm:text-sm font-medium block">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/50 group-focus-within:text-white/80 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all duration-300 hover:bg-white/12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="cursor-pointer absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-all duration-300 hover:scale-110"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-500/0 via-green-500/0 to-yellow-500/0 group-focus-within:from-blue-500/10 group-focus-within:via-green-500/10 group-focus-within:to-yellow-500/10 transition-all duration-500 pointer-events-none group-hover:from-blue-500/5 group-hover:via-green-500/5 group-hover:to-yellow-500/5"></div>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <label className="flex items-center text-white/70 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="mr-1.5 sm:mr-2 rounded accent-green-500 cursor-pointer w-3.5 h-3.5 sm:w-4 sm:h-4"
                  />
                  <span className="group-hover:text-white transition-colors">
                    Remember me
                  </span>
                </label>
                <button
                  type="button"
                  className="cursor-pointer text-white/70 hover:text-white transition-all duration-300 hover:scale-105"
                >
                  Forgot password?
                </button>
              </div>
              {error && <p className="text-red-500 text-sm pb-2.5">{error}</p>}

              {/* Liquid Button */}
              <button
                type="submit"
                onMouseEnter={() => setIsHoveringLogin(true)}
                onMouseLeave={() => setIsHoveringLogin(false)}
                className={`cursor-pointer relative w-full py-3 sm:py-4 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold text-white overflow-hidden group transition-all duration-300 ${
                  isHoveringLogin ? "scale-105 shadow-2xl" : "scale-100"
                }`}
              >
                {/* Animated gradient background */}
                <div
                  className="absolute inset-0 transition-all duration-500"
                  style={getGradientStyle(90)}
                ></div>

                {/* Liquid effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                {/* Glow effect */}
                <div
                  className={`absolute -inset-1 blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-500`}
                  style={getGradientStyle(90)}
                ></div>

                <span className="relative z-10 flex items-center justify-center gap-2">
                  Sign In
                  <Sparkles
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${
                      isHoveringLogin ? "rotate-180" : ""
                    }`}
                  />
                </span>
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-xs sm:text-sm">
                  <span className="px-3 sm:px-4 bg-transparent text-white/60">
                    or continue with
                  </span>
                </div>
              </div>

              {/* Social Buttons */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button
                  type="button"
                  onMouseEnter={() => setHoverGoogle(true)}
                  onMouseLeave={() => setHoverGoogle(false)}
                  className={`cursor-pointer relative py-2.5 sm:py-3 text-sm sm:text-base rounded-xl sm:rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 text-white font-medium overflow-hidden group transition-all duration-300 hover:bg-white/15 hover:scale-105 hover:shadow-xl ${
                    hoverGoogle ? "border-white/40" : ""
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-blue-500/30 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                  <span className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2">
                    <svg
                      className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${
                        hoverGoogle ? "scale-125 rotate-12" : ""
                      }`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span className="hidden xs:inline sm:inline">Google</span>
                  </span>
                </button>
                <button
                  type="button"
                  onMouseEnter={() => setHoverApple(true)}
                  onMouseLeave={() => setHoverApple(false)}
                  className={`cursor-pointer relative py-2.5 sm:py-3 text-sm sm:text-base rounded-xl sm:rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 text-white font-medium overflow-hidden group transition-all duration-300 hover:bg-white/15 hover:scale-105 hover:shadow-xl ${
                    hoverApple ? "border-white/40" : ""
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 to-green-500/30 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                  <span className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2">
                    <svg
                      className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${
                        hoverApple ? "scale-125 -rotate-12" : ""
                      }`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    <span className="hidden xs:inline sm:inline">Apple</span>
                  </span>
                </button>
              </div>

              {/* Sign Up Link */}
              <p className="text-center text-white/70 mt-6 sm:mt-8 text-xs sm:text-sm md:text-base">
                Don't have an account?{" "}
                <button
                  type="button"
                  onMouseEnter={() => setHoverSignUp(true)}
                  onMouseLeave={() => setHoverSignUp(false)}
                  className={`cursor-pointer text-white font-semibold transition-all duration-300 hover:scale-105 inline-block ${
                    hoverSignUp ? "underline" : ""
                  }`}
                >
                  <Link to="/signup">Sign up</Link>
                </button>
              </p>
            </form>
            {/* FORM Ends Here */}
          </div>
        </div>

        {/* Outer glow effect */}
        <div
          className="absolute inset-0 rounded-2xl sm:rounded-3xl blur-2xl -z-10 opacity-50 transition-opacity duration-300"
          style={getGradientStyle(45)}
        ></div>
      </div>
      
    </div>
  );
}
