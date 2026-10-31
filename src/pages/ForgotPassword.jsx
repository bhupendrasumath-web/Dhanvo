import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, ShieldCheck, TrendingUp, Loader2 } from "lucide-react";
import api, { buildOtpPayload } from "../services/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [credentialType, setCredentialType] = useState("password");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [credential, setCredential] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const getIdentifierPayload = () => {
    const value = identifier.trim();
    return value.includes("@")
      ? buildOtpPayload({ email: value.toLowerCase() })
      : buildOtpPayload({ phone: value.replace(/\D/g, "") });
  };

  const sendOtp = async () => {
    const payload = getIdentifierPayload();
    if (!payload.email && !payload.phone) {
      setErrorMessage("Enter a valid registered email or 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await api.post("/auth/send-recovery-otp", payload);
      setOtpSent(true);
      setOtp("");
      setCredential("");
      setConfirmation("");
      setSuccessMessage("Recovery OTP sent to your registered email.");
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to send recovery OTP.");
    } finally {
      setLoading(false);
    }
  };

  const resetCredential = async (event) => {
    event.preventDefault();
    const payload = getIdentifierPayload();
    const validCredential = credentialType === "pin"
      ? /^\d{6}$/.test(credential)
      : /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(credential);

    if (!/^\d{6}$/.test(otp)) {
      setErrorMessage("Enter the 6-digit verification OTP.");
      return;
    }
    if (!validCredential) {
      setErrorMessage(credentialType === "pin"
        ? "Choose a 6-digit PIN."
        : "Password needs at least 8 characters, including uppercase, lowercase, and a number.");
      return;
    }
    if (credential !== confirmation) {
      setErrorMessage("Your password or PIN confirmation does not match.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await api.post("/auth/reset-credential", {
        ...payload,
        otp,
        credentialType,
        credential,
      });
      setSuccessMessage(`${credentialType === "pin" ? "PIN" : "Password"} reset successfully. You can now log in.`);
      setOtpSent(false);
      setOtp("");
      setCredential("");
      setConfirmation("");
      window.setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to reset your password or PIN.");
    } finally {
      setLoading(false);
    }
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
            Forgot Password / PIN?
          </h2>

          <p className="text-slate-400 mt-2 mb-8">
            Enter the email or mobile number you used during signup. If you use mobile, the recovery OTP will be sent to your registered email.
          </p>

          <form
            onSubmit={(event) => {
              if (!otpSent) {
                event.preventDefault();
                sendOtp();
                return;
              }
              resetCredential(event);
            }}
          >
            <div className="relative mb-4">
              <Mail className="absolute left-4 top-4 text-slate-400 w-5 h-5" />

              <input
                type="text"
                value={identifier}
                onChange={(event) => {
                  setIdentifier(event.target.value);
                  setOtpSent(false);
                  setOtp("");
                }}
                placeholder="Mobile Number or Email Address"
                className="w-full bg-slate-800 text-white pl-12 pr-4 py-4 rounded-xl outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
              {["password", "pin"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setCredentialType(type);
                    setCredential("");
                    setConfirmation("");
                  }}
                  className={`rounded-xl border py-3 font-semibold transition-colors ${
                    credentialType === type
                      ? "border-amber-400 bg-amber-400/10 text-amber-300"
                      : "border-slate-700 bg-slate-800 text-slate-300"
                  }`}
                >
                  Reset {type === "pin" ? "PIN" : "Password"}
                </button>
              ))}
            </div>

            {otpSent && (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit verification OTP"
                  className="w-full bg-slate-800 text-white px-4 py-4 rounded-xl outline-none mb-4"
                />
                <input
                  type="password"
                  inputMode={credentialType === "pin" ? "numeric" : undefined}
                  maxLength={credentialType === "pin" ? 6 : undefined}
                  value={credential}
                  onChange={(event) => setCredential(credentialType === "pin"
                    ? event.target.value.replace(/\D/g, "").slice(0, 6)
                    : event.target.value)}
                  placeholder={credentialType === "pin" ? "New 6-digit PIN" : "New password"}
                  className="w-full bg-slate-800 text-white px-4 py-4 rounded-xl outline-none mb-4"
                />
                <input
                  type="password"
                  inputMode={credentialType === "pin" ? "numeric" : undefined}
                  maxLength={credentialType === "pin" ? 6 : undefined}
                  value={confirmation}
                  onChange={(event) => setConfirmation(credentialType === "pin"
                    ? event.target.value.replace(/\D/g, "").slice(0, 6)
                    : event.target.value)}
                  placeholder={credentialType === "pin" ? "Confirm PIN" : "Confirm password"}
                  className="w-full bg-slate-800 text-white px-4 py-4 rounded-xl outline-none mb-4"
                />
                <p className="text-xs text-slate-400 mb-5">
                  {credentialType === "pin"
                    ? "PIN must contain exactly 6 digits."
                    : "Password needs at least 8 characters, uppercase, lowercase, and a number."}
                </p>
              </>
            )}

            {errorMessage && <p role="alert" className="text-sm text-red-300 mb-4">{errorMessage}</p>}
            {successMessage && <p role="status" className="text-sm text-emerald-300 mb-4">{successMessage}</p>}

            {!otpSent ? (
              <button
                type="button"
                onClick={sendOtp}
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 disabled:opacity-60 text-black font-bold py-4 rounded-xl transition-all duration-300"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "Send Verification OTP"}
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 disabled:opacity-60 text-black font-bold py-4 rounded-xl transition-all duration-300"
                >
                  {loading ? <Loader2 className="animate-spin mx-auto" /> : `Reset ${credentialType === "pin" ? "PIN" : "Password"}`}
                </button>
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full text-amber-300 text-sm font-semibold py-2 disabled:opacity-60"
                >
                  Resend OTP
                </button>
              </div>
            )}
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
