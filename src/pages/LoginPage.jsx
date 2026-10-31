import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api, { buildOtpPayload } from "../services/api";

const GOLD = "#C8974A";
const LIGHT_GOLD = "#E0B968";
const NAVY = "#071321";
const CREAM = "#FBF9F4";

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  maxLength,
  inputMode,
  rightElement,
  showPrefix = false,
}) {
  return (
    <div className="field">
      <label>{label}</label>

      <div className="input-wrap">
        {showPrefix && (
          <span className="inline-prefix" aria-hidden="true">+91</span>
        )}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
        />

        {rightElement}
      </div>
    </div>
  );
}

function LoginCard({ children }) {
  return (
    <div className="login-card">
      {children}
    </div>
  );
}

function SignIn() {
  const { loginWithOtp, loginWithCredential } = useAuth();
  const [loginMethod, setLoginMethod] = useState("otp");

  const [otpIdentifier, setOtpIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(30);
  const [credentialIdentifier, setCredentialIdentifier] = useState("");
  const [credentialValue, setCredentialValue] = useState("");

  const [rememberMe, setRememberMe] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] =
    useState(false);
  const [userNotFound, setUserNotFound] = useState(false);

  const [forgotMode, setForgotMode] =
    useState(false);

  const [forgotOtpSent, setForgotOtpSent] =
    useState(false);

  const [forgotOtpTimer, setForgotOtpTimer] =
    useState(30);

  const [forgotIdentifier, setForgotIdentifier] =
    useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotCredentialType, setForgotCredentialType] = useState("password");
  const [forgotCredential, setForgotCredential] = useState("");
  const [forgotCredentialConfirmation, setForgotCredentialConfirmation] = useState("");

  const pageRef = useRef(null);

  const navigate = useCallback((path) => {
    window.location.href = path;
  }, []);

  useEffect(() => {
    if (!otpSent || otpTimer <= 0) {
      return undefined;
    }

    const interval = setInterval(() => {
      setOtpTimer((value) =>
        Math.max(0, value - 1)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [otpSent, otpTimer]);

  useEffect(() => {
    if (
      !forgotOtpSent ||
      forgotOtpTimer <= 0
    ) {
      return undefined;
    }

    const interval = setInterval(() => {
      setForgotOtpTimer((value) =>
        Math.max(0, value - 1)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [forgotOtpSent, forgotOtpTimer]);

  useEffect(() => {
    pageRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [forgotMode]);

  const accountExistsForLogin = async (payload) => {
    try {
      const response = await api.post("/auth/check-signup-account", payload);
      return !response.data?.data?.available;
    } catch (error) {
      if (
        error.response?.status === 409 &&
        error.response?.data?.code === "ACCOUNT_EXISTS"
      ) {
        return true;
      }
      throw error;
    }
  };

  const identifierPayload = (value) => {
    const identifier = String(value || "").trim();
    return identifier.includes("@")
      ? buildOtpPayload({ email: identifier.toLowerCase() })
      : buildOtpPayload({ phone: identifier.replace(/\D/g, "") });
  };

  const sendOtp = async () => {
    const identifier = otpIdentifier.trim();
    const payload = identifierPayload(identifier);
    if (
      (!payload.email && !payload.phone) ||
      (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) ||
      (payload.phone && !/^[0-9]{10}$/.test(identifier))
    ) {
      window.alert("Enter a valid email address or 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setUserNotFound(false);
    try {
      if (!(await accountExistsForLogin(payload))) {
        setUserNotFound(true);
        setOtpSent(false);
        return;
      }
      await api.post("/auth/send-login-otp", payload);
      setOtpSent(true);
      setOtpTimer(30);
      setOtp("");
    } catch (error) {
      window.alert(error.response?.data?.message || "Unable to check account or send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!otpSent || otpTimer > 0) return;

    setLoading(true);
    try {
      await api.post("/auth/send-login-otp", identifierPayload(otpIdentifier));
      setOtpTimer(30);
    } catch (error) {
      window.alert(error.response?.data?.message || "Unable to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    const isOtpLogin = loginMethod === "otp";
    const credentialLoginType = /^\d{6}$/.test(credentialValue) ? "pin" : "password";
    if (isOtpLogin && otp.length !== 6) {
      window.alert("Enter the 6-digit OTP.");
      return;
    }
    if (!isOtpLogin && !/^(?:[^\s@]+@[^\s@]+\.[^\s@]+|[0-9]{10})$/.test(credentialIdentifier.trim())) {
      window.alert("Enter a valid email address or 10-digit mobile number.");
      return;
    }
    if (!isOtpLogin && !credentialValue) {
      window.alert("Enter your password or 6-digit PIN.");
      return;
    }

    setLoading(true);
    try {
      if (isOtpLogin) {
        await loginWithOtp(otpIdentifier, otp);
      } else {
        const normalizedIdentifier = identifierPayload(credentialIdentifier);
        const loginIdentifier = normalizedIdentifier.email || normalizedIdentifier.phone;
        if (!(await accountExistsForLogin(normalizedIdentifier))) {
          setUserNotFound(true);
          return;
        }
        await loginWithCredential(loginIdentifier, credentialValue, credentialLoginType);
      }
      setLoginSuccess(true);
    } catch (error) {
      if (error.response?.data?.code === "USER_NOT_FOUND") {
        setUserNotFound(true);
      } else {
        window.alert(error.response?.data?.message || error.message || "Unable to sign in.");
      }
    } finally {
      setLoading(false);
    }
  };

  const sendForgotOtp = async () => {
    const payload = identifierPayload(forgotIdentifier);
    if (!payload.email && !payload.phone) {
      window.alert("Enter a valid registered email address or 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/send-recovery-otp", payload);
      setForgotOtpSent(true);
      setForgotOtpTimer(30);
      setForgotOtp("");
      setForgotCredential("");
      setForgotCredentialConfirmation("");
    } catch (error) {
      window.alert(error.response?.data?.message || "Unable to send recovery OTP.");
    } finally {
      setLoading(false);
    }
  };

  const resendForgotOtp = async () => {
    if (
      !forgotOtpSent ||
      forgotOtpTimer > 0
    ) {
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/send-recovery-otp", identifierPayload(forgotIdentifier));
      setForgotOtpTimer(30);
      setForgotOtp("");
    } catch (error) {
      window.alert(error.response?.data?.message || "Unable to resend recovery OTP.");
    } finally {
      setLoading(false);
    }
  };

  const resetForgotCredential = async () => {
    const payload = identifierPayload(forgotIdentifier);
    const isValidCredential = forgotCredentialType === "pin"
      ? /^\d{6}$/.test(forgotCredential)
      : /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(forgotCredential);

    if (!payload.email && !payload.phone) {
      window.alert("Enter your registered email address or mobile number.");
      return;
    }
    if (!/^\d{6}$/.test(forgotOtp)) {
      window.alert("Enter the 6-digit verification OTP.");
      return;
    }
    if (!isValidCredential) {
      window.alert(forgotCredentialType === "pin"
        ? "Set a 6-digit PIN."
        : "Set a password with at least 8 characters, including uppercase, lowercase, and a number.");
      return;
    }
    if (forgotCredential !== forgotCredentialConfirmation) {
      window.alert("Your password or PIN confirmation does not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-credential", {
        ...payload,
        otp: forgotOtp,
        credentialType: forgotCredentialType,
        credential: forgotCredential,
      });
      window.alert(`${forgotCredentialType === "pin" ? "PIN" : "Password"} reset successfully. Please log in.`);
      setForgotMode(false);
      setLoginMethod(forgotCredentialType);
      setCredentialIdentifier(forgotIdentifier.trim());
      setCredentialValue("");
      setForgotOtpSent(false);
      setForgotOtp("");
    } catch (error) {
      window.alert(error.response?.data?.message || "Unable to reset your password or PIN.");
    } finally {
      setLoading(false);
    }
  };

  if (loginSuccess) {
    return (
      <>
        <style>{styles}</style>

        <div className="success-page">
          <motion.div
            className="success-card"
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
          >
            <div className="success-logo">
              DHANVO
            </div>

            <div className="success-icon">
              <CheckCircle2 size={52} />
            </div>

            <span className="success-label">
              SIGN IN SUCCESSFUL
            </span>

            <h1>
              Welcome Back to Dhanvo
            </h1>

            <p>
              You have been signed in
              successfully.
            </p>

            <button
              type="button"
              className="primary-button full"
              onClick={() =>
                navigate("/dashboard/explore")
              }
            >
              Go to Dashboard
              <ArrowRight size={17} />
            </button>

            <button
              type="button"
              className="secondary-button full"
              onClick={() =>
                navigate("/")
              }
            >
              Back to Dhanvo
            </button>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>

      <div
        className="signin-page"
        ref={pageRef}
      >
        {/* LEFT BRAND PANEL */}

        <aside className="brand-panel">
          <div className="brand-panel-content">
            <div className="brand">
              DHANVO
            </div>

            <p className="brand-eyebrow">
              TRUST · TECHNOLOGY · TRANSPARENCY
            </p>

            <h1 className="brand-title">
              Welcome back to Dhanvo.
            </h1>

            <p className="brand-copy">
              Log in to continue your investment journey with DHANVO.
            </p>

            <div className="brand-line" />

            <div className="trust-list">
              <div>
                <span className="trust-icon">
                  <Check size={13} />
                </span>

                <div>
                  <strong>Trust</strong>
                  <small>Regulated &amp; 100% Secure</small>
                </div>
              </div>

              <div>
                <span className="trust-icon">
                  <Check size={13} />
                </span>

                <div>
                  <strong>Technology</strong>
                  <small>Fast, Paperless &amp; Smart Setup</small>
                </div>
              </div>

              <div>
                <span className="trust-icon">
                  <Check size={13} />
                </span>

                <div>
                  <strong>Transparency</strong>
                  <small>Zero Hidden Charges, Pure Clarity</small>
                </div>
              </div>
            </div>
          </div>

          <div className="brand-footer">
            <strong>Dhanlakshya Securities Private Limited</strong>
            <span>DHANVO · Empowering your wealth with Trust, Technology &amp; Transparency.</span>
          </div>
        </aside>

        {/* RIGHT LOGIN AREA */}

        <main className="login-area">
          <div className="mobile-header">
            <button
              type="button"
              onClick={() =>
                navigate("/")
              }
            >
              <ArrowLeft size={14} />
              Back
            </button>

            <div className="brand">
              DHANVO
            </div>
          </div>

          <div className="login-container">
            <div className="login-top">
              <div className="secure-login">
                <LockKeyhole size={15} />
                Secure login
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!forgotMode ? (
                <motion.div
                  key="signin"
                  initial={{
                    opacity: 0,
                    y: 12,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -12,
                  }}
                  transition={{
                    duration: 0.22,
                  }}
                >
                  <LoginCard>
                    <div className="login-heading">
                      <h1>
                        Log in
                      </h1>

                      <p>
                        Access your Dhanvo account to track and manage your investments.
                      </p>
                    </div>

                    {/* LOGIN METHOD */}

                    <div className="method-tabs" role="group" aria-label="Choose login method">
                      <button
                        type="button"
                        className={loginMethod === "otp" ? "active" : ""}
                        onClick={() => {
                          setLoginMethod("otp");
                          setUserNotFound(false);
                          setOtpSent(false);
                          setOtp("");
                        }}
                      >
                        <Mail size={14} />
                        Email / Phone
                      </button>

                      <button
                        type="button"
                        className={loginMethod === "credential" ? "active" : ""}
                        onClick={() => {
                          setLoginMethod("credential");
                          setUserNotFound(false);
                          setOtpSent(false);
                        }}
                      >
                        <LockKeyhole size={14} />
                        Password / PIN
                      </button>
                    </div>

                    {loginMethod === "otp" ? (
                      <>
                        <Field
                          label="Email ID or Mobile Number"
                          value={otpIdentifier}
                          placeholder="Enter your email or 10-digit mobile"
                          onChange={(value) => {
                            setOtpIdentifier(value);
                            setUserNotFound(false);
                            setOtpSent(false);
                            setOtp("");
                          }}
                        />

                        <div className="otp-action">
                          <button
                            type="button"
                            className="send-otp"
                            onClick={
                              sendOtp
                            }
                            disabled={
                              loading
                            }
                          >
                            {loading ? (
                              <Loader2
                                size={15}
                                className="spin"
                              />
                            ) : (
                              <ShieldCheck
                                size={15}
                              />
                            )}
                            Send OTP
                          </button>
                        </div>

                        {otpSent && (
                          <motion.div
                            className="otp-area"
                            initial={{
                              opacity: 0,
                              height: 0,
                            }}
                            animate={{
                              opacity: 1,
                              height: "auto",
                            }}
                          >
                            <Field
                              label="Enter OTP"
                              value={otp}
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="Enter 6-digit OTP"
                              onChange={(value) =>
                                setOtp(
                                  value
                                    .replace(
                                      /\D/g,
                                      ""
                                    )
                                    .slice(
                                      0,
                                      6
                                    )
                                )
                              }
                            />

                            <div className="otp-status">
                              <span>
                                OTP sent to your registered {otpIdentifier.includes("@") ? "email" : "mobile number"}.
                              </span>

                              {otpTimer >
                              0 ? (
                                <strong>
                                  Resend in{" "}
                                  {
                                    otpTimer
                                  }
                                  s
                                </strong>
                              ) : (
                                <button
                                  type="button"
                                  onClick={resendOtp}
                                >
                                  Resend OTP
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </>
                    ) : (
                      <>
                        <Field
                          label="Email ID or Mobile Number"
                          value={credentialIdentifier}
                          placeholder="Enter your email or 10-digit mobile"
                          onChange={(value) => {
                            setCredentialIdentifier(value);
                            setUserNotFound(false);
                          }}
                        />
                        <Field
                          label="Password / PIN"
                          type="password"
                          value={credentialValue}
                          placeholder="Enter your password or 6-digit PIN"
                          onChange={setCredentialValue}
                        />
                      </>
                    )}

                    {userNotFound && (
                      <div className="user-not-found" role="alert">
                        <span>User does not exist</span>
                        <button type="button" onClick={() => navigate("/signup")}>
                          Sign Up
                        </button>
                      </div>
                    )}

                    {/* REMEMBER / FORGOT */}

                    <div className="login-options">
                      <label className="remember">
                        <input
                          type="checkbox"
                          checked={
                            rememberMe
                          }
                          onChange={(e) =>
                            setRememberMe(
                              e.target
                                .checked
                            )
                          }
                        />

                        <span className="custom-check">
                          {rememberMe && (
                            <Check
                              size={11}
                            />
                          )}
                        </span>

                        Remember me
                      </label>

                      <button
                        type="button"
                        className="forgot-button"
                        onClick={() => {
                          setForgotMode(true);
                          setForgotOtpSent(false);
                          setForgotOtp("");
                        }}
                      >
                        Forgot Password / PIN?
                      </button>
                    </div>

                    {/* SIGN IN */}

                    <button
                      type="button"
                      className="primary-button login-button"
                      onClick={
                        signIn
                      }
                      disabled={
                        loading
                      }
                    >
                      {loading ? (
                        <>
                          <Loader2
                            size={17}
                            className="spin"
                          />
                          Signing In...
                        </>
                      ) : (
                        <>
                          Log in
                          <ArrowRight
                            size={17}
                          />
                        </>
                      )}
                    </button>

                    {/* SECURITY */}

                    <div className="security-note">
                      <LockKeyhole
                        size={14}
                      />

                      <span>
                        Your login session is
                        protected with secure
                        authentication.
                      </span>
                    </div>
                  </LoginCard>

                  <div className="bottom-links">
                    <button
                      type="button"
                      onClick={() =>
                        navigate("/")
                      }
                    >
                      Dhanvo Home
                    </button>

                    <span>�</span>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          "/signup"
                        )
                      }
                    >
                      Open Account
                    </button>

                    <span>�</span>

                    <span>
                      www.dhanvo.in
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="forgot"
                  initial={{
                    opacity: 0,
                    x: 15,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: -15,
                  }}
                  transition={{
                    duration: 0.22,
                  }}
                >
                  <LoginCard>
                    <button
                      type="button"
                      className="back-login"
                      onClick={() =>
                        setForgotMode(
                          false
                        )
                      }
                    >
                      <ArrowLeft
                        size={14}
                      />
                      Back to Sign In
                    </button>

                    <div className="login-heading forgot-heading">
                      <div className="heading-icon">
                        <LockKeyhole
                          size={20}
                        />
                      </div>

                      <span className="eyebrow">
                        ACCOUNT RECOVERY
                      </span>

                      <h1>
                        Forgot Password / PIN?
                      </h1>

                      <p>
                        Use the same registered email or mobile number as signup. The verification OTP is sent to your registered email.
                      </p>
                    </div>

                    <Field
                      label="Registered Mobile / Email"
                      value={
                        forgotIdentifier
                      }
                      placeholder="Enter mobile or email"
                      onChange={(value) => {
                        setForgotIdentifier(value);
                        setForgotOtpSent(false);
                        setForgotOtp("");
                      }}
                    />

                    <div className="recovery-method-tabs" role="group" aria-label="Choose credential to recover">
                      <button
                        type="button"
                        className={forgotCredentialType === "password" ? "active" : ""}
                        aria-pressed={forgotCredentialType === "password"}
                        onClick={() => {
                          setForgotCredentialType("password");
                          setForgotCredential("");
                          setForgotCredentialConfirmation("");
                        }}
                      >
                        Reset Password
                      </button>
                      <button
                        type="button"
                        className={forgotCredentialType === "pin" ? "active" : ""}
                        aria-pressed={forgotCredentialType === "pin"}
                        onClick={() => {
                          setForgotCredentialType("pin");
                          setForgotCredential("");
                          setForgotCredentialConfirmation("");
                        }}
                      >
                        Reset PIN
                      </button>
                    </div>

                    {!forgotOtpSent ? (
                      <button
                        type="button"
                        className="primary-button login-button"
                        onClick={
                          sendForgotOtp
                        }
                        disabled={
                          loading
                        }
                      >
                        {loading ? (
                          <>
                            <Loader2
                              size={17}
                              className="spin"
                            />
                            Sending OTP...
                          </>
                        ) : (
                          <>
                            Send OTP
                            <ArrowRight
                              size={
                                17
                              }
                            />
                          </>
                        )}
                      </button>
                    ) : (
                      <>
                        <motion.div
                          initial={{
                            opacity: 0,
                            y: 7,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                        >
                          <div className="forgot-otp">
                            <Field
                              label="Enter OTP"
                              value={forgotOtp}
                              maxLength={
                                6
                              }
                              inputMode="numeric"
                              placeholder="Enter 6-digit OTP"
                              onChange={(value) => setForgotOtp(value.replace(/\D/g, "").slice(0, 6))}
                            />

                            <div className="otp-status">
                              <span>
                                Verification
                                OTP sent
                                successfully.
                              </span>

                              {forgotOtpTimer >
                              0 ? (
                                <strong>
                                  Resend in{" "}
                                  {
                                    forgotOtpTimer
                                  }
                                  s
                                </strong>
                              ) : (
                                <button
                                  type="button"
                                  onClick={
                                    resendForgotOtp
                                  }
                                >
                                  Resend OTP
                                </button>
                              )}
                            </div>
                          </div>

                          <Field
                            label={forgotCredentialType === "pin" ? "New 6-digit PIN" : "New Password"}
                            type="password"
                            value={forgotCredential}
                            inputMode={forgotCredentialType === "pin" ? "numeric" : undefined}
                            maxLength={forgotCredentialType === "pin" ? 6 : undefined}
                            placeholder={forgotCredentialType === "pin" ? "Enter new 6-digit PIN" : "At least 8 characters"}
                            onChange={(value) => setForgotCredential(
                              forgotCredentialType === "pin" ? value.replace(/\D/g, "").slice(0, 6) : value
                            )}
                          />
                          <Field
                            label={forgotCredentialType === "pin" ? "Confirm PIN" : "Confirm Password"}
                            type="password"
                            value={forgotCredentialConfirmation}
                            inputMode={forgotCredentialType === "pin" ? "numeric" : undefined}
                            maxLength={forgotCredentialType === "pin" ? 6 : undefined}
                            placeholder={forgotCredentialType === "pin" ? "Re-enter new PIN" : "Re-enter new password"}
                            onChange={(value) => setForgotCredentialConfirmation(
                              forgotCredentialType === "pin" ? value.replace(/\D/g, "").slice(0, 6) : value
                            )}
                          />
                          <p className="recovery-hint">
                            {forgotCredentialType === "pin"
                              ? "PIN must contain exactly 6 digits."
                              : "Password must contain uppercase, lowercase, and a number (8 characters minimum)."}
                          </p>
                          <button
                            type="button"
                            className="primary-button login-button"
                            onClick={resetForgotCredential}
                            disabled={
                              loading
                            }
                          >
                            {loading ? (
                              <>
                                <Loader2
                                  size={
                                    17
                                  }
                                  className="spin"
                                />
                                Resetting...
                              </>
                            ) : (
                              <>
                                Reset {forgotCredentialType === "pin" ? "PIN" : "Password"}
                                <ArrowRight
                                  size={
                                    17
                                  }
                                />
                              </>
                            )}
                          </button>
                        </motion.div>
                      </>
                    )}

                    <div className="security-note">
                      <ShieldCheck
                        size={14}
                      />

                      <span>
                        Your credential is updated only after the server verifies your recovery OTP.
                      </span>
                    </div>
                  </LoginCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap');

* { box-sizing: border-box; }

html, body, #root {
  width: 100%;
  min-height: 100%;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Manrope', Arial, Helvetica, sans-serif;
  background: ${CREAM};
  color: ${NAVY};
}

button, input { font-family: inherit; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; }

/* =========================================================
   PAGE
   ========================================================= */

.signin-page {
  min-height: 100vh;
  width: 100%;
  display: flex;
  background: ${CREAM};
}

/* =========================================================
   LEFT � SAME PREMIUM LANGUAGE AS DHANVO REFERENCE
   ========================================================= */

.brand-panel {
  position: fixed;
  inset: 0 auto 0 0;
  width: 44%;
  max-width: 650px;
  padding: 34px 54px;
  background:
    radial-gradient(circle at 82% 15%, #17334f 0%, ${NAVY} 52%, #081420 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.brand-panel::before,
.brand-panel::after {
  content: "";
  position: absolute;
  border: 1px solid rgba(231,201,140,.11);
  border-radius: 50%;
  pointer-events: none;
}

.brand-panel::before {
  width: 620px;
  height: 620px;
  right: -330px;
  bottom: -330px;
}

.brand-panel::after {
  width: 390px;
  height: 390px;
  right: -205px;
  bottom: -205px;
  border-color: rgba(231,201,140,.07);
}

.back-home {
  position: relative;
  z-index: 2;
  width: max-content;
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(231,201,140,.28);
  border-radius: 999px;
  background: rgba(231,201,140,.045);
  color: rgba(255,255,255,.78);
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  font-weight: 700;
  transition: .15s ease;
}

.back-home:hover {
  border-color: ${GOLD};
  color: ${GOLD};
}

.brand-panel-content {
  position: relative;
  z-index: 2;
  margin-top: -25px;
}

.brand {
  color: ${GOLD} !important;
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  letter-spacing: 2.5px;
  line-height: 1;
}

.brand-panel .brand {
  font-size: clamp(46px, 5vw, 66px);
}

.tagline {
  max-width: 430px;
  margin: 22px 0 0;
  color: rgba(251,249,244,.70);
  font-family: 'Fraunces', Georgia, serif;
  font-size: clamp(19px, 2vw, 25px);
  line-height: 1.35;
}

.brand-line {
  width: 62px;
  height: 2px;
  margin: 34px 0 28px;
  background: ${GOLD};
}

.trust-list {
  display: flex;
  flex-direction: column;
  gap: 21px;
}

.trust-list > div {
  display: flex;
  align-items: flex-start;
  gap: 13px;
}

.trust-icon {
  width: 42px;
  height: 42px;
  min-width: 42px;
  border: 1px solid rgba(231,201,140,.20);
  border-radius: 12px;
  background: rgba(231,201,140,.075);
  color: ${LIGHT_GOLD};
  display: flex;
  align-items: center;
  justify-content: center;
}

.trust-list strong,
.trust-list small { display: block; }

.trust-list strong {
  margin-top: 1px;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.trust-list small {
  max-width: 320px;
  margin-top: 5px;
  color: rgba(255,255,255,.46);
  font-size: 9.5px;
  line-height: 1.55;
}

.brand-footer {
  position: relative;
  z-index: 2;
  padding-top: 18px;
  border-top: 1px solid rgba(255,255,255,.09);
  display: flex;
  justify-content: space-between;
  color: rgba(255,255,255,.35);
  font-size: 9px;
}

/* =========================================================
   RIGHT
   ========================================================= */

.login-area {
  width: 56%;
  min-height: 100vh;
  margin-left: 44%;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 92% 5%, rgba(201,151,74,.085), transparent 26%),
    ${CREAM};
}

.login-container {
  width: min(570px, calc(100% - 80px));
  padding: 48px 0;
}

.login-top {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 28px;
}

.desktop-brand { display: none; }

.account-question {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
}

.account-question span {
  color: #758296;
  font-size: 10px;
}

.account-question button {
  border: 0;
  background: transparent;
  color: ${GOLD};
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 800;
}

/* =========================================================
   MAIN CARD
   ========================================================= */

.login-card {
  padding: 42px;
  border: 1px solid rgba(10,25,41,.095);
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 30px 75px -42px rgba(10,25,41,.28);
}

.login-heading {
  text-align: center;
}

.heading-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 16px;
  border-radius: 14px;
  background: rgba(201,151,74,.10);
  color: ${GOLD};
  display: flex;
  align-items: center;
  justify-content: center;
}

.eyebrow {
  display: block;
  color: ${GOLD};
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.6px;
}

.login-heading h1 {
  margin: 9px 0 10px;
  color: ${NAVY};
  font-family: 'Fraunces', Georgia, serif;
  font-size: clamp(32px, 3vw, 40px);
  line-height: 1.12;
  font-weight: 600;
  letter-spacing: -.02em;
}

.login-heading p {
  max-width: 430px;
  margin: 0 auto;
  color: #718096;
  font-size: 11px;
  line-height: 1.7;
}

/* =========================================================
   METHOD TABS
   ========================================================= */

.method-tabs {
  margin: 29px 0 24px;
  padding: 4px;
  border-radius: 12px;
  background: #EEF1F3;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.method-tabs button {
  height: 43px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #7A8798;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 10px;
  font-weight: 800;
  transition: .15s ease;
}

.method-tabs button.active {
  background: #fff;
  color: ${NAVY};
  box-shadow: 0 5px 15px rgba(7,19,33,.075);
}

.method-tabs button.active svg { color: ${GOLD}; }

/* =========================================================
   FIELDS
   ========================================================= */

.field {
  width: 100%;
  margin-bottom: 18px;
}

.field label {
  display: block;
  margin-bottom: 7px;
  color: #354354;
  font-size: 10px;
  font-weight: 800;
}

.input-wrap {
  position: relative;
  width: 100%;
}

.field input {
  width: 100%;
  height: 52px;
  padding: 0 15px;
  border: 1px solid #DCE2E8;
  border-radius: 11px;
  outline: none;
  background: #fff;
  color: ${NAVY};
  font-size: 12px;
  transition: .15s ease;
}

.field input::placeholder { color: #A6B0BB; }

.field input:focus {
  border-color: ${GOLD};
  box-shadow: 0 0 0 4px rgba(201,151,74,.08);
}

/*  is INLINE � no separate box */
.inline-prefix {
  position: absolute;
  z-index: 2;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #536174;
  font-size: 11px;
  font-weight: 800;
  pointer-events: none;
}

.input-wrap .inline-prefix + input {
  padding-left: 48px;
}

.eye-button {
  position: absolute;
  right: 7px;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #7A8798;
  display: flex;
  align-items: center;
  justify-content: center;
}

.eye-button:hover { color: ${GOLD}; }

/* =========================================================
   OTP
   ========================================================= */

.otp-action {
  margin-top: -2px;
  margin-bottom: 4px;
}

.send-otp {
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid rgba(201,151,74,.55);
  border-radius: 999px;
  background: #fff;
  color: ${NAVY};
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 9.5px;
  font-weight: 800;
}

.send-otp svg { color: ${GOLD}; }

.otp-area {
  margin-top: 15px;
  padding: 16px 14px 2px;
  border: 1px solid rgba(201,151,74,.20);
  border-radius: 12px;
  background: rgba(201,151,74,.035);
}

.otp-status {
  min-height: 34px;
  margin-top: -4px;
  padding-bottom: 7px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.otp-status span {
  color: #7A8798;
  font-size: 8.5px;
}

.otp-status strong,
.otp-status button {
  white-space: nowrap;
  font-size: 8.5px;
}

.otp-status strong { color: #657388; }

.otp-status button {
  border: 0;
  background: transparent;
  color: ${GOLD};
  font-weight: 800;
}

/* =========================================================
   OPTIONS + BUTTONS
   ========================================================= */

.login-options {
  margin: 6px 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.remember {
  color: #657388;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 9px;
}

.remember input { display: none; }

.custom-check {
  width: 18px;
  height: 18px;
  border: 1px solid #C9D1DA;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remember input:checked + .custom-check {
  border-color: ${GOLD};
  background: ${GOLD};
  color: #fff;
}

.forgot-button {
  border: 0;
  background: transparent;
  color: ${GOLD};
  font-size: 9px;
  font-weight: 800;
}

.primary-button {
  min-height: 52px;
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  background: ${GOLD};
  color: ${NAVY};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 12px 28px -12px rgba(201,151,74,.65);
  transition: .15s ease;
}

.primary-button:hover {
  background: ${LIGHT_GOLD};
  transform: translateY(-1px);
}

.primary-button:disabled { opacity: .62; }

.login-button { width: 100%; }

.secondary-button {
  min-height: 48px;
  padding: 0 18px;
  border: 1px solid #DCE2E8;
  border-radius: 999px;
  background: #fff;
  color: #657388;
  font-size: 9.5px;
  font-weight: 800;
}

.secondary-button.full {
  width: 100%;
  margin-top: 10px;
}

/* =========================================================
   SECURITY + FOOT LINKS
   ========================================================= */

.security-note {
  margin-top: 21px;
  padding-top: 16px;
  border-top: 1px solid #EDF0F3;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #8A96A6;
  font-size: 8.5px;
  line-height: 1.45;
  text-align: center;
}

.security-note svg {
  color: #1D6F64;
  flex: 0 0 auto;
}

.bottom-links {
  margin-top: 19px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: #A0A9B4;
  font-size: 8.5px;
}

.bottom-links button {
  border: 0;
  background: transparent;
  color: #7A8798;
  font-size: 8.5px;
}

.bottom-links button:hover { color: ${GOLD}; }

.back-login {
  min-height: 32px;
  padding: 0 10px;
  margin-bottom: 20px;
  border: 0;
  border-radius: 999px;
  background: #F2F4F5;
  color: #657388;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 8.5px;
  font-weight: 700;
}

.forgot-heading { margin-bottom: 24px; }

/* =========================================================
   MOBILE HEADER
   ========================================================= */

.mobile-header { display: none; }

/* =========================================================
   SUCCESS
   ========================================================= */

.success-page {
  width: 100%;
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(circle at 78% 15%, #17334f 0%, ${NAVY} 55%, #081420 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-card {
  width: min(500px, 100%);
  padding: 44px;
  border: 1px solid rgba(231,201,140,.18);
  border-radius: 22px;
  background: #fff;
  text-align: center;
  box-shadow: 0 30px 75px -25px rgba(0,0,0,.38);
}

.success-logo {
  color: ${GOLD} !important;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 31px;
  font-weight: 700;
  letter-spacing: 2.5px;
}

.success-icon {
  width: 88px;
  height: 88px;
  margin: 26px auto 18px;
  border-radius: 50%;
  background: rgba(29,111,100,.08);
  color: #1D6F64;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-label {
  display: inline-block;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(29,111,100,.07);
  color: #1D6F64;
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: .9px;
}

.success-card h1 {
  margin: 15px 0 9px;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 31px;
  font-weight: 600;
}

.success-card > p {
  margin: 0;
  color: #657388;
  font-size: 10.5px;
}

.spin { animation: spin 1s linear infinite; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* =========================================================
   TABLET
   ========================================================= */

@media (max-width: 1050px) {
  .brand-panel {
    width: 40%;
    padding: 32px 32px;
  }

  .login-area {
    width: 60%;
    margin-left: 40%;
  }

  .brand-panel .brand { font-size: 49px; }
  .tagline { font-size: 18px; }
  .login-container { width: min(520px, calc(100% - 48px)); }
  .login-card { padding: 34px; }
}

/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 760px) {
  .signin-page {
    display: block;
    min-height: 100vh;
  }

  .brand-panel { display: none; }

  .login-area {
    width: 100%;
    min-height: 100vh;
    margin: 0;
    display: block;
  }

  .mobile-header {
    min-height: 64px;
    padding: 0 18px;
    background:
      radial-gradient(circle at 78% 15%, #17334f 0%, ${NAVY} 55%, #081420 100%);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mobile-header button {
    min-height: 34px;
    padding: 0 11px;
    border: 1px solid rgba(231,201,140,.28);
    border-radius: 999px;
    background: transparent;
    color: rgba(255,255,255,.76);
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 8.5px;
    font-weight: 700;
  }

  .mobile-header .brand { font-size: 25px; }

  .login-container {
    width: calc(100% - 28px);
    max-width: 540px;
    margin: 0 auto;
    padding: 22px 0 30px;
  }

  .login-top {
    margin-bottom: 18px;
  }

  .account-question {
    justify-content: space-between;
  }

  .account-question span { font-size: 9px; }
  .account-question button { font-size: 9.5px; }

  .login-card {
    padding: 28px 20px;
    border-radius: 18px;
  }

  .login-heading h1 { font-size: 30px; }
  .login-heading p { font-size: 9.5px; }

  .method-tabs { margin-top: 22px; }

  .field input { height: 50px; }

  .success-card {
    padding: 32px 20px;
  }

  .success-card h1 { font-size: 27px; }
}

@media (max-width: 390px) {
  .login-container { width: calc(100% - 18px); }

  .login-card { padding: 24px 15px; }

  .login-heading h1 { font-size: 27px; }

  .login-options {
    align-items: flex-start;
  }

  .bottom-links {
    flex-wrap: wrap;
  }
}

/* Login page alignment with the reference composition */
.signin-page {
  background: #fff;
}

.brand-panel {
  width: 36%;
  max-width: none;
  padding: 44px 40px;
}

.brand-panel-content {
  margin: 0;
}

.brand-panel .brand {
  color: #E7C98C !important;
  font-family: 'Manrope', Arial, sans-serif;
  font-size: 26px;
  letter-spacing: .5px;
}

.brand-eyebrow {
  margin: 40px 0 0;
  color: #E7C98C;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.6px;
}

.brand-title {
  max-width: 420px;
  margin: 13px 0 14px;
  color: #fff;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 36px;
  font-weight: 600;
  letter-spacing: -1.2px;
  line-height: 1.12;
}

.brand-copy {
  max-width: 400px;
  margin: 0;
  color: #CBD5DF;
  font-size: 13.5px;
  line-height: 1.65;
}

.brand-line {
  display: none;
}

.trust-list {
  gap: 14px;
  margin-top: 32px;
}

.trust-list > div {
  align-items: center;
  gap: 11px;
}

.trust-icon {
  width: 21px;
  height: 21px;
  min-width: 21px;
  border: 1px solid rgba(216,179,107,.5);
  border-radius: 50%;
  background: transparent;
  color: #E7C98C;
}

.trust-list strong {
  display: inline;
  margin: 0;
  color: #E7C98C;
  font-size: 13px;
  font-weight: 700;
}

.trust-list small {
  display: inline;
  margin: 0 0 0 4px;
  color: #fff;
  font-size: 13px;
}

.brand-footer {
  padding-top: 24px;
  border: 0;
  display: block;
  color: #8FA0B0;
  font-size: 10.5px;
  line-height: 1.6;
}

.brand-footer strong {
  display: block;
  color: #E7C98C;
  font-weight: 700;
}

.brand-footer span {
  display: block;
}

.login-area {
  width: 64%;
  margin-left: 36%;
  background: #fff;
}

.login-container {
  width: min(420px, calc(100% - 80px));
  padding: 48px 0;
}

.login-top {
  justify-content: flex-end;
  margin-bottom: 24px;
}

.secure-login {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #9FB3C8;
  font-size: 12px;
}

.secure-login svg {
  color: #AAB4BE;
}

.login-card {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.login-heading {
  text-align: left;
}

.login-heading h1 {
  margin: 0 0 9px;
  color: ${NAVY};
  font-size: 32px;
  letter-spacing: -.6px;
}

.login-heading p {
  max-width: none;
  margin: 0 0 26px;
  color: #45526A;
  font-size: 14px;
  line-height: 1.65;
}

.method-tabs {
  margin: 0 0 24px;
  padding: 4px;
  border-radius: 9px;
  background: #EEF1F4;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.method-tabs button {
  height: 39px;
  border-radius: 7px;
  gap: 5px;
  font-size: 11px;
}

.method-tabs button.active {
  box-shadow: 0 1px 3px rgba(10,25,41,.08);
}

.field {
  margin-bottom: 18px;
}

.field label {
  margin-bottom: 8px;
  color: ${NAVY};
  font-size: 12px;
}

.field input {
  height: 49px;
  border-color: rgba(10,25,41,.10);
  border-radius: 8px;
  font-size: 13px;
}

.field input:focus {
  box-shadow: 0 0 0 3px rgba(201,151,74,.14);
}

.input-wrap .inline-prefix + input {
  padding-left: 48px;
}

.otp-action {
  margin: -2px 0 4px;
}

.send-otp {
  min-height: 40px;
  border-color: rgba(201,151,74,.55);
  border-radius: 8px;
  font-size: 11px;
}

.otp-area {
  border-radius: 8px;
}

.login-options {
  margin: 6px 0 22px;
}

.user-not-found {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 14px 0 18px;
  padding: 12px 14px;
  border: 1px solid rgba(201,151,74,.35);
  border-radius: 8px;
  background: rgba(201,151,74,.08);
  color: ${NAVY};
  font-size: 13px;
}

.user-not-found button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #A87832;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.remember,
.forgot-button {
  font-size: 12px;
}

.primary-button {
  min-height: 50px;
  border-radius: 8px;
  font-size: 13px;
  box-shadow: none;
}

.primary-button:hover {
  background: #A87832;
  transform: none;
}

.security-note {
  margin-top: 21px;
  padding-top: 16px;
  font-size: 10px;
}

.bottom-links {
  margin-top: 24px;
  font-size: 10px;
}

.bottom-links button,
.bottom-links span {
  font-size: 10px;
}

.back-login {
  font-size: 11px;
}

.forgot-heading {
  margin-bottom: 24px;
}

.forgot-button {
  padding: 0;
  border: 0;
  background: transparent;
  color: ${GOLD};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.recovery-method-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0 0 18px;
}

.recovery-method-tabs button {
  min-height: 40px;
  border: 1px solid #DCE2E8;
  border-radius: 8px;
  background: #fff;
  color: #657388;
  font-size: 11px;
  font-weight: 700;
}

.recovery-method-tabs button.active {
  border-color: ${GOLD};
  background: rgba(201,151,74,.09);
  color: ${NAVY};
}

.recovery-hint {
  margin: -9px 0 17px;
  color: #7A8798;
  font-size: 10px;
}

@media (max-width: 900px) {
  .signin-page {
    display: block;
  }

  .brand-panel {
    position: relative;
    display: flex;
    width: 100%;
    min-height: auto;
    padding: 26px 22px 24px;
  }

  .brand-panel .brand {
    font-size: 26px;
  }

  .brand-eyebrow {
    margin-top: 22px;
  }

  .brand-title {
    font-size: 30px;
  }

  .trust-list {
    display: none;
  }

  .brand-footer {
    margin-top: 20px;
    padding-top: 0;
  }

  .login-area {
    display: flex;
    width: 100%;
    min-height: auto;
    margin: 0;
    padding: 32px 20px 48px;
    align-items: flex-start;
  }

  .login-container {
    width: 100%;
    max-width: 420px;
    padding: 0;
  }

  .login-card {
    padding: 0;
    border-radius: 0;
  }

  .mobile-header {
    display: none;
  }
}

@media (max-width: 520px) {
}

@media (max-width: 390px) {
  .login-area {
    padding: 28px 20px 40px;
  }

  .login-container {
    width: 100%;
  }

  .login-card {
    padding: 0;
  }
}
`;


export default SignIn;