import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, ShieldCheck, TrendingUp } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/verify-otp");
  };

  return (
    <div className="min-h-screen bg-[#050A15] flex">
      <div className="hidden lg:flex w-1/2 border-r border-amber-500/10 p-12">
        <div className="max-w-xl my-auto">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <TrendingUp className="text-black w-8 h-8" />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-white">DHANVO</h1>
              <p className="text-slate-400">
                Trust • Technology • Transparency
              </p>
            </div>
          </div>

          <h2 className="text-5xl font-bold text-white leading-tight mb-6">
            Recover Your
            <span className="block text-amber-400">
              Account Access
            </span>
          </h2>

          <p className="text-slate-400 text-lg mb-10">
            Secure password recovery designed to protect your account
            and investment information.
          </p>

          <div className="space-y-4">
            {[
              "Secure Password Recovery",
              "OTP Verification",
              "Encrypted Authentication",
              "Investor Account Protection",
            ].map((item) => (
              <div
                key={item}
                className="bg-slate-900/60 border border-amber-500/10 rounded-2xl p-4 flex gap-3"
              >
                <ShieldCheck className="text-amber-400" />
                <span className="text-white">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900/50 backdrop-blur border border-amber-500/10 rounded-3xl p-8"
        >
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400"
          >
            <ArrowLeft size={18} />
            Back to Login
          </Link>

          <h2 className="text-3xl font-bold text-white mt-8">
            Forgot Password?
          </h2>

          <p className="text-slate-400 mt-2 mb-8">
            Enter your registered mobile number or email address to
            receive a verification code.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="relative mb-6">
              <Mail className="absolute left-4 top-4 text-slate-400 w-5 h-5" />

              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Mobile Number or Email Address"
                className="w-full bg-slate-800 text-white pl-12 pr-4 py-4 rounded-xl outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-bold py-4 rounded-xl transition-all duration-300"
            >
              Send Verification Code
            </button>
          </form>

          <div className="mt-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-amber-400" size={18} />
              <span className="text-white font-medium">
                Security First
              </span>
            </div>

            <p className="text-slate-400 text-sm mt-2">
              For your protection, password reset requests require
              identity verification before access can be restored.
            </p>
          </div>

          <p className="text-center text-xs text-slate-500 mt-8">
            Need help? Contact our support team for assistance.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
