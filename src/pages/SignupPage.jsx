import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  FileText,
  Home,
  Landmark,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  MoreVertical,
  Plus,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  User,
  Users,
} from "lucide-react";
import api, { buildOtpPayload } from "../services/api";
import { useAuth } from "../context/AuthContext";

const GOLD = "#C8974A";
const LIGHT_GOLD = "#E0B968";
const NAVY = "#071321";

const simulateDelay = (ms = 400) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const STEPS = [
  { id: 1, name: "Mobile & OTP", icon: Smartphone },
  { id: 2, name: "KYC & Account", icon: ShieldCheck },
  { id: 3, name: "Address", icon: Home },
  { id: 4, name: "Bank Account", icon: Landmark },
  { id: 5, name: "Nominee", icon: User },
  { id: 6, name: "Review", icon: FileText },
  { id: 7, name: "Declaration & Submit", icon: CheckCircle2 },
];

const INDIA_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const INDIA_CITIES_BY_STATE = {
  "Andhra Pradesh": ["Amaravati", "Guntur", "Kakinada", "Vijayawada", "Visakhapatnam"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat"],
  Assam: ["Dibrugarh", "Guwahati", "Jorhat", "Silchar"],
  Bihar: ["Bhagalpur", "Gaya", "Muzaffarpur", "Patna"],
  Chhattisgarh: ["Bilaspur", "Durg", "Raipur"],
  Goa: ["Margao", "Panaji", "Vasco da Gama"],
  Gujarat: ["Ahmedabad", "Gandhinagar", "Rajkot", "Surat", "Vadodara"],
  Haryana: ["Faridabad", "Gurugram", "Hisar", "Panipat"],
  "Himachal Pradesh": ["Dharamshala", "Manali", "Shimla", "Solan"],
  Jharkhand: ["Bokaro", "Dhanbad", "Jamshedpur", "Ranchi"],
  Karnataka: ["Bengaluru", "Belagavi", "Hubballi", "Mysuru"],
  Kerala: ["Kochi", "Kozhikode", "Thiruvananthapuram", "Thrissur"],
  "Madhya Pradesh": ["Bhopal", "Gwalior", "Indore", "Jabalpur"],
  Maharashtra: ["Chhatrapati Sambhajinagar", "Mumbai", "Nagpur", "Nashik", "Pune"],
  Manipur: ["Imphal", "Thoubal"],
  Meghalaya: ["Shillong", "Tura"],
  Mizoram: ["Aizawl", "Lunglei"],
  Nagaland: ["Dimapur", "Kohima"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela"],
  Punjab: ["Amritsar", "Jalandhar", "Ludhiana", "Patiala"],
  Rajasthan: ["Ajmer", "Jaipur", "Jodhpur", "Kota", "Udaipur"],
  Sikkim: ["Gangtok", "Namchi"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"],
  Telangana: ["Hyderabad", "Karimnagar", "Khammam", "Warangal"],
  Tripura: ["Agartala", "Udaipur"],
  "Uttar Pradesh": ["Agra", "Kanpur", "Lucknow", "Noida", "Varanasi"],
  Uttarakhand: ["Dehradun", "Haridwar", "Nainital", "Rishikesh"],
  "West Bengal": ["Asansol", "Durgapur", "Howrah", "Kolkata", "Siliguri"],
  "Andaman and Nicobar Islands": ["Diglipur", "Port Blair"],
  Chandigarh: ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Silvassa"],
  Delhi: ["Delhi", "New Delhi"],
  "Jammu and Kashmir": ["Jammu", "Srinagar"],
  Ladakh: ["Kargil", "Leh"],
  Lakshadweep: ["Kavaratti"],
  Puducherry: ["Karaikal", "Puducherry"],
};

const createHolder = () => ({
  firstName: "",
  middleName: "",
  lastName: "",
  pan: "",
  dob: "",
  mobile: "",
  email: "",
  kycType: "Aadhaar e-KYC",
  ckyc: "",
});

const createGuardian = () => ({
  firstName: "",
  middleName: "",
  lastName: "",
  dob: "",
  pan: "",
  kyc: "Aadhaar e-KYC",
  relationship: "",
});

const createBank = () => ({
  bankName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifsc: "",
  accountType: "Savings",
  primary: false,
  proof: null,
  verified: false,
  bankStatus: "",
  bankRemark: "",
});

const createNominee = () => ({
  fullName: "",
  relationship: "",
  percentage: "",
  dob: "",
  minor: "No",
  identityType: "PAN",
  identityNumber: "",
  mobile: "",
  email: "",
  address: "",
  city: "",
  pincode: "",
  country: "India",
  guardianName: "",
  guardianPan: "",
  emailOtp: "",
  emailOtpSent: false,
  emailOtpVerified: false,
  emailOtpTarget: "",
  emailOtpSentAt: 0,
});

const Field = forwardRef(function Field(
  {
    label,
    value,
    onChange,
    type = "text",
    placeholder = "",
    maxLength,
    inputMode,
    list,
    suggestions = [],
  },
  ref
) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        ref={ref}
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        list={list}
        onChange={(e) => onChange?.(e.target.value)}
      />
      {list && (
        <datalist id={list}>
          {suggestions.map((suggestion) => (
            <option value={suggestion} key={suggestion} />
          ))}
        </datalist>
      )}
    </div>
  );
});

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function Section({ title, subtitle, icon: Icon, children, action }) {
  return (
    <section className="card">
      <div className="card-head">
        <div className="section-title">
          {Icon && (
            <span className="section-icon">
              <Icon size={18} />
            </span>
          )}
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>

        {action}
      </div>

      <div className="card-body">{children}</div>
    </section>
  );
}

function Info({ children }) {
  return (
    <div className="info">
      <CircleHelp size={16} />
      <span>{children}</span>
    </div>
  );
}

function RadioCard({
  title,
  description,
  selected,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`radio-card ${selected ? "selected" : ""}`}
      onClick={onClick}
    >
      <span className={`radio ${selected ? "checked" : ""}`}>
        {selected && <span />}
      </span>

      <span className="radio-content">
        <strong>{title}</strong>
        {description && <small>{description}</small>}
      </span>
    </button>
  );
}

function UploadBox({ title, file, onChange }) {
  const inputRef = useRef(null);

  return (
    <div className="upload-box">
      <div className="upload-icon">
        <Upload size={20} />
      </div>

      <div className="upload-content">
        <strong>{title}</strong>
        <span>
          {file ? file.name : "Accepted: PDF, JPG, JPEG or PNG"}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => {
          const selectedFile = e.target.files?.[0] || null;
          onChange(selectedFile);
        }}
      />

      <button
        type="button"
        className="upload-button"
        onClick={() => inputRef.current?.click()}
      >
        {file ? "Change" : "Upload"}
      </button>
    </div>
  );
}

function HolderFields({
  title,
  data,
  onChange,
  onRemove,
}) {
  return (
    <div className="holder-box">
      <div className="holder-header">
        <div>
          <strong>{title}</strong>
          <span>Holder identification details</span>
        </div>

        {onRemove && (
          <button
            type="button"
            className="icon-danger"
            onClick={onRemove}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div className="grid">
        <Field
          label="First Name"
          value={data.firstName}
          onChange={(v) => onChange("firstName", v)}
        />

        <Field
          label="Middle Name"
          value={data.middleName}
          onChange={(v) => onChange("middleName", v)}
        />

        <Field
          label="Last Name"
          value={data.lastName}
          onChange={(v) => onChange("lastName", v)}
        />

        <Field
          label="PAN"
          value={data.pan}
          onChange={(v) => onChange("pan", v.toUpperCase())}
        />

        <Field
          label="Date of Birth"
          type="date"
          value={data.dob}
          onChange={(v) => onChange("dob", v)}
        />

        <Field
          label="Mobile"
          value={data.mobile}
          onChange={(v) => onChange("mobile", v)}
        />

        <Field
          label="Email"
          type="email"
          value={data.email}
          onChange={(v) => onChange("email", v)}
        />

        <SelectField
          label="KYC Type"
          value={data.kycType}
          onChange={(v) => onChange("kycType", v)}
          options={[
            "Aadhaar e-KYC",
            "CKYC",
            "Biometric KYC",
          ]}
        />

        {data.kycType === "CKYC" && (
          <Field
            label="CKYC Number"
            value={data.ckyc}
            onChange={(v) => onChange("ckyc", v)}
          />
        )}
      </div>
    </div>
  );
}

/* =========================================================
   STEP 1
========================================================= */

function Step1({
  form,
  update,
  onIdentityChange,
  credentialType,
  setCredentialType,
  credential,
  setCredential,
  credentialConfirmation,
  setCredentialConfirmation,
  otpSent,
  otpVerified,
  otpTimer,
  sendOtp,
  verifyOtp,
  resendOtp,
  loading,
}) {
  return (
    <div className="stack">
      <Section
        title="Mobile & Email Verification"
        subtitle="The same OTP will be sent to your mobile number and email ID."
        icon={Smartphone}
      >
        <div className="verification-grid">
          <div className="field">
            <label>Mobile Number</label>

            <div className="mobile-input">
              <span>+91</span>

              <input
                value={form.mobile}
                maxLength={10}
                inputMode="numeric"
                placeholder="10-digit mobile number"
                onChange={(e) =>
                  onIdentityChange(
                    "mobile",
                    e.target.value.replace(/\D/g, "").slice(0, 10)
                  )
                }
              />
            </div>
          </div> 

          <Field
            label="Email ID"
            type="email"
            value={form.email}
            placeholder="name@example.com"
            onChange={(v) => onIdentityChange("email", v)}
          />

          <div className="send-otp-container">
            <label>&nbsp;</label>

            <button
              type="button"
              className="outline-button send-otp-button"
              onClick={sendOtp}
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              Send OTP
            </button>
          </div>
        </div>

        {otpSent && (
          <div className="otp-section">
            <div className="otp-success">
              <Mail size={17} />

              <div>
                <strong>OTP sent successfully</strong>
                <span>
                  The same OTP has been sent to your mobile number and email ID.
                </span>
              </div>
            </div>

            <div className="otp-grid">
              <Field
                label="Enter OTP"
                value={form.otp}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                inputMode="numeric"
                onChange={(v) =>
                  update(
                    "otp",
                    v.replace(/\D/g, "").slice(0, 6)
                  )
                }
              />

              {form.otp.length === 6 && !otpVerified && (
                <div className="signup-credential-panel">
                  <div>
                    <strong>Sign Up – set PIN &amp; Password</strong>
                    <span>Choose one login method for your account.</span>
                  </div>

                  <div className="signup-credential-options" role="group" aria-label="Choose a login credential">
                    <button
                      type="button"
                      className={credentialType === "password" ? "active" : ""}
                      aria-pressed={credentialType === "password"}
                      onClick={() => {
                        setCredentialType("password");
                        setCredential("");
                        setCredentialConfirmation("");
                      }}
                    >
                      Password
                    </button>
                    <button
                      type="button"
                      className={credentialType === "pin" ? "active" : ""}
                      aria-pressed={credentialType === "pin"}
                      onClick={() => {
                        setCredentialType("pin");
                        setCredential("");
                        setCredentialConfirmation("");
                      }}
                    >
                      6-digit PIN
                    </button>
                  </div>

                  <div className="signup-credential-fields">
                    <Field
                      label={credentialType === "pin" ? "Set 6-digit PIN" : "Set Password"}
                      type="password"
                      value={credential}
                      inputMode={credentialType === "pin" ? "numeric" : undefined}
                      maxLength={credentialType === "pin" ? 6 : undefined}
                      placeholder={credentialType === "pin" ? "Enter 6-digit PIN" : "At least 8 characters"}
                      onChange={(value) => setCredential(
                        credentialType === "pin" ? value.replace(/\D/g, "").slice(0, 6) : value
                      )}
                    />
                    <Field
                      label={credentialType === "pin" ? "Confirm PIN" : "Confirm Password"}
                      type="password"
                      value={credentialConfirmation}
                      inputMode={credentialType === "pin" ? "numeric" : undefined}
                      maxLength={credentialType === "pin" ? 6 : undefined}
                      placeholder={credentialType === "pin" ? "Re-enter 6-digit PIN" : "Re-enter password"}
                      onChange={(value) => setCredentialConfirmation(
                        credentialType === "pin" ? value.replace(/\D/g, "").slice(0, 6) : value
                      )}
                    />
                  </div>
                  <p className="signup-credential-hint">
                    {credentialType === "pin"
                      ? "Your PIN must contain exactly 6 digits."
                      : "Use at least 8 characters with uppercase, lowercase, and a number."}
                  </p>
                </div>
              )}

              <button
                type="button"
                className="primary-button otp-verify-button"
                onClick={verifyOtp}
                disabled={loading || otpVerified || form.otp.length !== 6}
              >
                {otpVerified ? "OTP Verified" : "Verify OTP"}
              </button>

              <div className="resend-box">
                <span>Didn't receive OTP?</span>

                {otpTimer > 0 ? (
                  <strong>Resend OTP in {otpTimer}s</strong>
                ) : (
                  <button
                    type="button"
                    onClick={resendOtp}
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

/* =========================================================
   STEP 2
========================================================= */

function Step2({
  form,
  setForm,
  update,
  panVerified,
  panChecked,
  setPanVerified,
  setPanChecked,
  verifyPan,
  loading,
}) {
  const [kycMenuOpen, setKycMenuOpen] = useState(false);

  const updateHolder = (holderName, key, value) => {
    setForm((prev) => ({
      ...prev,
      [holderName]: {
        ...(prev[holderName] || createHolder()),
        [key]: value,
      },
    }));
  };

  const updateGuardian = (key, value) => {
    setForm((prev) => ({
      ...prev,
      guardian: {
        ...prev.guardian,
        [key]: value,
      },
    }));
  };

  const selectAccountType = (type) => {
    setForm((prev) => ({
      ...prev,
      accountType: type,
      accountTypeOpen: false,
      holdingType: type === "Individual" ? "" : prev.holdingType,
      secondHolder:
        type === "Joint"
          ? prev.secondHolder || createHolder()
          : null,
      thirdHolder:
        type === "Joint"
          ? prev.thirdHolder || null
          : null,
    }));
  };

  return (
    <div className="stack">
      <Section
        title="KYC & Account Details"
        subtitle="KYC, personal information, account type and holder details are handled together."
        icon={ShieldCheck}
      >
        <div className="pan-grid">
          <Field
            label="PAN Number"
            value={form.pan}
            placeholder="ABCDE1234F"
            maxLength={10}
            onChange={(v) => {
              update("pan", v.toUpperCase().slice(0, 10));
              setPanVerified(false);
              setPanChecked(false);
              update("kycStatus", "Not Verified");
              update("panStatusRemark", "");
            }}
          />

          <div className="verify-pan">
            <label>&nbsp;</label>

            <button
              type="button"
              className="outline-button"
              onClick={verifyPan}
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              Verify PAN
            </button>
          </div>

          <div className="kyc-status-box">
            <span>KYC Status</span>

            <strong
              className={
                panVerified
                  ? "status-green"
                  : form.kycStatus === "Under Process" || form.kycStatus === "Not Available"
                    ? "status-orange"
                    : "status-red"
              }
            >
              <i />
              {panChecked ? "PAN Checked" : "PAN Not Checked"}
            </strong>

            {form.kycStatus && (
              <small className="kyc-status-note">
                {form.kycStatus}
              </small>
            )}

            {form.panStatusRemark && (
              <small className="kyc-status-note">
                {form.panStatusRemark}
              </small>
            )}
          </div>
        </div>

        <div className="sub-heading">
          Personal Information
        </div>

        <div className="grid">
          <Field
            label="Full Name"
            value={form.fullName}
            onChange={(v) => update("fullName", v)}
          />

          <Field
            label="Date of Birth"
            type="date"
            value={form.dob}
            onChange={(v) => update("dob", v)}
          />

          <SelectField
            label="Gender"
            value={form.gender}
            onChange={(v) => update("gender", v)}
            options={["Male", "Female", "Other"]}
          />

          <Field
            label="Occupation"
            value={form.occupation}
            onChange={(v) => update("occupation", v)}
          />

          <SelectField
            label="Tax Status"
            value={form.taxStatus}
            onChange={(v) => update("taxStatus", v)}
            options={[
              "Individual",
              "HUF",
              "NRI",
              "PIO",
              "Company",
              "Trust",
              "Partnership",
              "LLP",
            ]}
          />
        </div>

        {/* KYC METHOD */}

        <div className="sub-heading method-heading">
          <span>KYC Verification Method</span>

          <div className="menu-container">
            <button
              type="button"
              className="three-dot-button"
              onClick={() => setKycMenuOpen((v) => !v)}
              aria-label="KYC verification methods"
            >
              <MoreVertical size={18} />
            </button>

            {kycMenuOpen && (
              <div className="method-menu">
                {[
                  "Aadhaar e-KYC",
                  "CKYC",
                  "Biometric KYC",
                ].map((method) => (
                  <button
                    type="button"
                    key={method}
                    onClick={() => {
                      update("kycType", method);
                      setKycMenuOpen(false);
                    }}
                  >
                    <span>{method}</span>

                    {form.kycType === method && (
                      <Check size={14} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="selected-kyc">
          <div className="selected-kyc-left">
            <div className="selected-kyc-icon">
              <ShieldCheck size={19} />
            </div>

            <div>
              <strong>
                {form.kycType || "Aadhaar e-KYC"}
              </strong>

              <span>
                Selected KYC verification method
              </span>
            </div>
          </div>

          <span className="default-pill">
            {form.kycType === "Aadhaar e-KYC"
              ? "Default"
              : "Selected"}
          </span>
        </div>

        {form.kycType === "CKYC" && (
          <div className="conditional-box">
            <Field
              label="CKYC Number"
              value={form.ckyc}
              onChange={(v) => update("ckyc", v)}
            />
          </div>
        )}

        {/* ACCOUNT TYPE */}

        <div className="sub-heading account-heading">
          <span>Account Type</span>
          <small>Default: Individual</small>
        </div>

        <button
          type="button"
          className="account-selector"
          onClick={() =>
            update(
              "accountTypeOpen",
              !form.accountTypeOpen
            )
          }
        >
          <div>
            <span>Account Type</span>
            <strong>
              {form.accountType || "Individual"}
            </strong>
          </div>

          <span className="selector-arrow">?</span>
        </button>

        {form.accountTypeOpen && (
          <motion.div
            className="account-type-grid"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <RadioCard
              title="Individual"
              description="Single investor account"
              selected={form.accountType === "Individual"}
              onClick={() =>
                selectAccountType("Individual")
              }
            />

            <RadioCard
              title="Joint"
              description="Two or more holders"
              selected={form.accountType === "Joint"}
              onClick={() => selectAccountType("Joint")}
            />

            <RadioCard
              title="Minor"
              description="Minor account with guardian"
              selected={form.accountType === "Minor"}
              onClick={() => selectAccountType("Minor")}
            />
          </motion.div>
        )}

        {/* Holding type only appears for Joint/Minor.
            Individual NEVER shows holding type. */}

        {form.accountType !== "Individual" && (
          <motion.div
            className="holding-section"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <div className="sub-heading">
              Holding Type
            </div>

            <div className="choice-grid">
              <RadioCard
                title="Joint"
                description="All holders operate jointly"
                selected={
                  form.holdingType === "Joint"
                }
                onClick={() =>
                  update("holdingType", "Joint")
                }
              />

              <RadioCard
                title="Anyone / Survivor"
                description="Any holder can operate"
                selected={
                  form.holdingType ===
                  "Anyone / Survivor"
                }
                onClick={() =>
                  update(
                    "holdingType",
                    "Anyone / Survivor"
                  )
                }
              />
            </div>
          </motion.div>
        )}
      </Section>

      {/* HOLDER / GUARDIAN IS INSIDE STEP 2 */}

      {form.accountType === "Joint" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Section
            title="Joint Holder Details"
            subtitle="This section automatically appears after selecting Joint."
            icon={Users}
          >
            <HolderFields
              title="Second Holder"
              data={form.secondHolder || createHolder()}
              onChange={(key, value) =>
                updateHolder(
                  "secondHolder",
                  key,
                  value
                )
              }
            />

            {!form.thirdHolder ? (
              <button
                type="button"
                className="add-button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    thirdHolder: createHolder(),
                  }))
                }
              >
                <Plus size={16} />
                Add Third Holder
              </button>
            ) : (
              <>
                <div className="divider" />

                <HolderFields
                  title="Third Holder"
                  data={form.thirdHolder}
                  onChange={(key, value) =>
                    updateHolder(
                      "thirdHolder",
                      key,
                      value
                    )
                  }
                  onRemove={() =>
                    setForm((prev) => ({
                      ...prev,
                      thirdHolder: null,
                    }))
                  }
                />
              </>
            )}
          </Section>
        </motion.div>
      )}

      {form.accountType === "Minor" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Section
            title="Guardian Details"
            subtitle="This section automatically appears after selecting Minor."
            icon={Users}
          >
            <div className="grid">
              <Field
                label="First Name"
                value={form.guardian.firstName}
                onChange={(v) =>
                  updateGuardian("firstName", v)
                }
              />

              <Field
                label="Middle Name"
                value={form.guardian.middleName}
                onChange={(v) =>
                  updateGuardian("middleName", v)
                }
              />

              <Field
                label="Last Name"
                value={form.guardian.lastName}
                onChange={(v) =>
                  updateGuardian("lastName", v)
                }
              />

              <Field
                label="Date of Birth"
                type="date"
                value={form.guardian.dob}
                onChange={(v) =>
                  updateGuardian("dob", v)
                }
              />

              <Field
                label="PAN"
                value={form.guardian.pan}
                onChange={(v) =>
                  updateGuardian(
                    "pan",
                    v.toUpperCase()
                  )
                }
              />

              <SelectField
                label="KYC"
                value={form.guardian.kyc}
                onChange={(v) =>
                  updateGuardian("kyc", v)
                }
                options={[
                  "Aadhaar e-KYC",
                  "CKYC",
                  "Biometric KYC",
                ]}
              />

              <SelectField
                label="Relationship"
                value={form.guardian.relationship}
                onChange={(v) =>
                  updateGuardian(
                    "relationship",
                    v
                  )
                }
                options={[
                  "Father",
                  "Mother",
                  "Court Appointed Legal Guardian",
                ]}
              />
            </div>
          </Section>
        </motion.div>
      )}
    </div>
  );
}

/* =========================================================
   STEP 3
========================================================= */

function Step3({ form, update }) {
  return (
    <div className="stack">
      <Section
        title="Residential Address"
        subtitle="Enter your residential address."
        icon={Home}
      >
        <div className="grid">
          <Field
            label="Address Line 1"
            value={form.address1}
            onChange={(v) => update("address1", v)}
          />

          <Field
            label="Address Line 2"
            value={form.address2}
            onChange={(v) => update("address2", v)}
          />

          <Field
            label="Address Line 3"
            value={form.address3}
            onChange={(v) => update("address3", v)}
          />

          <Field
            label="City"
            value={form.city}
            list="signup-city-options"
            suggestions={form.country === "India" ? INDIA_CITIES_BY_STATE[form.state] || [] : []}
            onChange={(v) => update("city", v)}
          />

          <Field
            label="State"
            value={form.state}
            list="signup-state-options"
            suggestions={form.country === "India" ? INDIA_STATES : []}
            onChange={(v) => update("state", v)}
          />

          <Field
            label="Pincode"
            value={form.pincode}
            maxLength={6}
            inputMode="numeric"
            onChange={(v) =>
              update(
                "pincode",
                v.replace(/\D/g, "").slice(0, 6)
              )
            }
          />

          <SelectField
            label="Country"
            value={form.country}
            onChange={(v) => update("country", v)}
            options={[
              "India",
              "United States",
              "United Kingdom",
              "Other",
            ]}
          />
        </div>
      </Section>
    </div>
  );
}

/* =========================================================
   STEP 4
========================================================= */

function Step4({ form, setForm }) {
  const [checkingBank, setCheckingBank] =
    useState(null);

  const updateBank = (index, key, value) => {
    setForm((prev) => {
      const banks = [...prev.banks];

      banks[index] = {
        ...banks[index],
        [key]: value,
      };

      return {
        ...prev,
        banks,
      };
    });
  };

  const makePrimary = (index) => {
    setForm((prev) => ({
      ...prev,
      banks: prev.banks.map((bank, i) => ({
        ...bank,
        primary: i === index,
      })),
    }));
  };

  const verifyBank = async (index) => {
    const bank = form.banks[index];

    if (!bank?.accountNumber || !bank?.ifsc) {
      window.alert('Enter account number and IFSC before verification.');
      return;
    }

    setCheckingBank(index);

    try {
      const response = await api.post('/auth/verify-bank', {
        email: form.email,
        phone: form.mobile,
        bank_dtl: [
          {
            action_type: 'ADD',
            account_type: (bank.accountType || 'SB').toUpperCase().slice(0, 2),
            account_no: bank.accountNumber,
            micr_no: '',
            ifsc_code: bank.ifsc,
            default_bank_flag: bank.primary ? 'Y' : 'N',
          },
        ],
      });

      const result = response.data?.data || {};
      const details = Array.isArray(result.bank_dtl) ? result.bank_dtl : [];
      const bankResult = details[0] || {};
      const status = String(bankResult.status || '').trim().toUpperCase();
      const isVerified = status === 'SUCCESS' || status === 'SUCCESSFUL';

      setForm((prev) => {
        const banks = [...prev.banks];

        banks[index] = {
          ...banks[index],
          verified: isVerified,
          bankStatus: status || 'FAIL',
          bankRemark: bankResult.error_remark || bankResult.errorRemark || '',
        };

        return {
          ...prev,
          banks,
        };
      });

      if (!isVerified) {
        window.alert(bankResult.error_remark || 'NSE bank verification failed.');
      }
    } catch (error) {
      setForm((prev) => {
        const banks = [...prev.banks];

        banks[index] = {
          ...banks[index],
          verified: false,
          bankStatus: 'FAIL',
          bankRemark: error.response?.data?.message || 'Unable to verify bank account right now.',
        };

        return {
          ...prev,
          banks,
        };
      });

      window.alert(error.response?.data?.message || 'Unable to verify bank account right now.');
    } finally {
      setCheckingBank(null);
    }
  };

  const addBank = () => {
    if (form.banks.length >= 3) return;

    setForm((prev) => ({
      ...prev,
      banks: [...prev.banks, createBank()],
    }));
  };

  const removeBank = (index) => {
    setForm((prev) => ({
      ...prev,
      banks: prev.banks.filter(
        (_, i) => i !== index
      ),
    }));
  };

  return (
    <div className="stack">
      <Section
        title="Add Your Bank Account"
        subtitle="You can add up to three bank accounts."
        icon={Landmark}
      >
        {form.banks.map((bank, index) => (
          <div className="bank-box" key={index}>
            <div className="bank-header">
              <div>
                <strong>Bank {index + 1}</strong>

                {bank.primary && (
                  <span className="primary-badge">
                    Primary Bank
                  </span>
                )}
              </div>

              {form.banks.length > 1 && (
                <button
                  type="button"
                  className="icon-danger"
                  onClick={() => removeBank(index)}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            <div className="grid">
              <Field
                label="Bank Name"
                value={bank.bankName}
                onChange={(v) =>
                  updateBank(
                    index,
                    "bankName",
                    v
                  )
                }
              />

              <Field
                label="Account Number"
                value={bank.accountNumber}
                maxLength={18}
                inputMode="numeric"
                onChange={(v) =>
                  updateBank(
                    index,
                    "accountNumber",
                    v.replace(/\D/g, "").slice(0, 18)
                  )
                }
              />

              <Field
                label="Confirm Account Number"
                value={bank.confirmAccountNumber}
                maxLength={18}
                inputMode="numeric"
                onChange={(v) =>
                  updateBank(
                    index,
                    "confirmAccountNumber",
                    v.replace(/\D/g, "").slice(0, 18)
                  )
                }
              />

              <Field
                label="IFSC"
                value={bank.ifsc}
                maxLength={11}
                onChange={(v) =>
                  updateBank(
                    index,
                    "ifsc",
                    v.toUpperCase()
                  )
                }
              />

              <SelectField
                label="Account Type"
                value={bank.accountType}
                onChange={(v) =>
                  updateBank(
                    index,
                    "accountType",
                    v
                  )
                }
                options={["Savings", "Current"]}
              />
            </div>

            <div className="bank-actions">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={bank.primary}
                  onChange={() =>
                    makePrimary(index)
                  }
                />

                <span>
                  Make this Primary Bank
                </span>
              </label>

              {/* <button
                type="button"
                className="outline-button compact"
                onClick={() =>
                  verifyBank(index)
                }
              >
                {checkingBank === index ? (
                  <Loader2
                    size={15}
                    className="spin"
                  />
                ) : (
                  <ShieldCheck size={15} />
                )}

                {bank.verified
                  ? "Bank Verified"
                  : "Verify Bank Account"}
              </button> */}
            </div>
          </div>
        ))}

        {form.banks.length < 3 && (
          <button
            type="button"
            className="add-button"
            onClick={addBank}
          >
            <Plus size={16} />
            Add Another Bank Account
          </button>
        )}
      </Section>

      <Section
        title="Bank Proof"
        subtitle="Upload cancelled cheque or other bank proof."
        icon={FileText}
      >
        <UploadBox
          title="Cancelled Cheque / Bank Proof"
          file={form.bankProof}
          onChange={(file) =>
            setForm((prev) => ({
              ...prev,
              bankProof: file,
            }))
          }
        />
      </Section>
    </div>
  );
}

/* =========================================================
   STEP 5
========================================================= */

function Step5({
  form,
  update,
  addNominee,
  updateNominee,
  removeNominee,
}) {
  const [otpLoadingIndex, setOtpLoadingIndex] = useState(null);
  const [otpBatchLoading, setOtpBatchLoading] = useState(false);
  const [authenticationMessage, setAuthenticationMessage] = useState("");
  const [authenticationMessageType, setAuthenticationMessageType] = useState("info");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const allocation = form.nominees.reduce(
    (total, item) =>
      total + (Number(item.percentage) || 0),
    0
  );

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const verifyNomineeOtp = async (index, nominee) => {
    const normalizedEmail = String(nominee.email || "").trim().toLowerCase();
    const otp = String(nominee.emailOtp || "").trim();
    if (!nominee.emailOtpSent || nominee.emailOtpTarget !== normalizedEmail) {
      window.alert("Send an OTP to this nominee email address first.");
      return;
    }
    if (!/^[0-9]{6}$/.test(otp)) {
      window.alert("Enter the 6-digit OTP sent to the nominee email.");
      return;
    }

    setOtpLoadingIndex(index);
    try {
      await api.post("/auth/verify-otp", buildOtpPayload({ email: normalizedEmail, otp }));
      updateNominee(index, "emailOtpVerified", true);
      window.alert("Nominee email verified successfully.");
    } catch (error) {
      updateNominee(index, "emailOtpVerified", false);
      window.alert(error.response?.data?.message || "Invalid or expired nominee email OTP.");
    } finally {
      setOtpLoadingIndex(null);
    }
  };

  const resendNomineeOtp = async (index, email) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    setOtpLoadingIndex(index);
    try {
      await api.post("/auth/send-otp", buildOtpPayload({ email: normalizedEmail }));
      const sentAt = Date.now();
      form.nominees.forEach((nominee, nomineeIndex) => {
        if (String(nominee.email || "").trim().toLowerCase() === normalizedEmail) {
          updateNominee(nomineeIndex, "emailOtp", "");
          updateNominee(nomineeIndex, "emailOtpSent", true);
          updateNominee(nomineeIndex, "emailOtpVerified", false);
          updateNominee(nomineeIndex, "emailOtpTarget", normalizedEmail);
          updateNominee(nomineeIndex, "emailOtpSentAt", sentAt);
        }
      });
      setAuthenticationMessage(`A new OTP was sent to ${normalizedEmail}.`);
      setAuthenticationMessageType("success");
    } catch (error) {
      setAuthenticationMessage(error.response?.data?.message || "Unable to resend nominee email OTP.");
      setAuthenticationMessageType("error");
    } finally {
      setOtpLoadingIndex(null);
    }
  };

  const sendOtpToAllNominees = async () => {
    update("nominationAuthentication", "OTP");
    setAuthenticationMessage("");
    setAuthenticationMessageType("info");

    if (!form.nominees.length) {
      setAuthenticationMessage("Add at least one nominee before requesting OTP.");
      setAuthenticationMessageType("error");
      return;
    }

    const nomineeEmails = form.nominees.map((nominee, index) => ({
      index,
      email: String(nominee.email || "").trim().toLowerCase(),
    }));
    const invalidEmail = nomineeEmails.find(({ email }) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (invalidEmail) {
      setAuthenticationMessage(`Enter a valid email for Nominee ${invalidEmail.index + 1} first.`);
      setAuthenticationMessageType("error");
      return;
    }

    setOtpBatchLoading(true);
    try {
      const uniqueEmails = [...new Set(nomineeEmails.map(({ email }) => email))];
      for (const email of uniqueEmails) {
        await api.post("/auth/send-otp", buildOtpPayload({ email }));
        const sentAt = Date.now();
        nomineeEmails
          .filter((nominee) => nominee.email === email)
          .forEach(({ index }) => {
            updateNominee(index, "emailOtp", "");
            updateNominee(index, "emailOtpSent", true);
            updateNominee(index, "emailOtpVerified", false);
            updateNominee(index, "emailOtpTarget", email);
            updateNominee(index, "emailOtpSentAt", sentAt);
          });
      }
      setAuthenticationMessage(`OTP sent to ${uniqueEmails.length} nominee email${uniqueEmails.length === 1 ? "" : "s"}. Enter ${uniqueEmails.length === 1 ? "the code" : "each code"} below, then select Verify OTP.`);
      setAuthenticationMessageType("success");
    } catch (error) {
      setAuthenticationMessage(error.response?.data?.message || "Unable to send nominee email OTP.");
      setAuthenticationMessageType("error");
    } finally {
      setOtpBatchLoading(false);
    }
  };

  return (
    <div className="stack">
      <Section
        title="Add Nominee"
        subtitle="Choose whether you want to add a nominee."
        icon={User}
      >
        <div className="choice-grid">
          <RadioCard
            title="Yes"
            description="Add nominee details"
            selected={
              form.nomineeChoice === "Yes"
            }
            onClick={() => {
              update("nomineeChoice", "Yes");

              if (!form.nominees.length) {
                addNominee();
              }
            }}
          />

          <RadioCard
            title="No"
            description="Continue without nominee"
            selected={
              form.nomineeChoice === "No"
            }
            onClick={() =>
              update("nomineeChoice", "No")
            }
          />
        </div>

        {form.nomineeChoice === "No" && (
          <Info>
            You can continue without adding a nominee.
          </Info>
        )}
      </Section>

      {form.nomineeChoice === "Yes" &&
        form.nominees.map((item, index) => (
          <Section
            key={index}
            title={`Nominee ${index + 1}`}
            subtitle="Enter nominee details."
            icon={User}
            action={
              form.nominees.length > 1 ? (
                <button
                  type="button"
                  className="icon-danger"
                  onClick={() =>
                    removeNominee(index)
                  }
                >
                  <Trash2 size={15} />
                </button>
              ) : null
            }
          >
            <div className="grid">
              <Field
                label="Full Name"
                value={item.fullName}
                onChange={(v) =>
                  updateNominee(
                    index,
                    "fullName",
                    v
                  )
                }
              />

              <Field
                label="Relationship"
                value={item.relationship}
                onChange={(v) =>
                  updateNominee(
                    index,
                    "relationship",
                    v
                  )
                }
              />

              <Field
                label="Percentage"
                value={item.percentage}
                inputMode="numeric"
                maxLength={3}
                onChange={(v) =>
                  updateNominee(
                    index,
                    "percentage",
                    v.replace(/\D/g, "").slice(0, 3)
                  )
                }
              />

              <Field
                label="Date of Birth"
                type="date"
                value={item.dob}
                onChange={(v) =>
                  updateNominee(
                    index,
                    "dob",
                    v
                  )
                }
              />

              <SelectField
                label="Is Minor?"
                value={item.minor}
                onChange={(v) =>
                  updateNominee(
                    index,
                    "minor",
                    v
                  )
                }
                options={["Yes", "No"]}
              />

              <SelectField
                label="Identity Type"
                value={item.identityType}
                onChange={(v) =>
                  updateNominee(
                    index,
                    "identityType",
                    v
                  )
                }
                options={[
                  "PAN",
                  "Aadhaar - last 4 digits",
                  "Driving Licence",
                  "OCI/Passport",
                ]}
              />

              <Field
                label="Identity Number (optional)"
                value={item.identityNumber}
                onChange={(v) =>
                  updateNominee(
                    index,
                    "identityNumber",
                    v
                  )
                }
              />

              <Field
                label="Mobile"
                value={item.mobile}
                maxLength={10}
                inputMode="numeric"
                onChange={(v) =>
                  updateNominee(
                    index,
                    "mobile",
                    v.replace(/\D/g, "").slice(0, 10)
                  )
                }
              />

              <Field
                label="Email"
                type="email"
                value={item.email}
                onChange={(v) => {
                  updateNominee(index, "email", v);
                  if (String(v).trim().toLowerCase() !== item.emailOtpTarget) {
                    updateNominee(index, "emailOtpSent", false);
                    updateNominee(index, "emailOtpVerified", false);
                    updateNominee(index, "emailOtp", "");
                    updateNominee(index, "emailOtpSentAt", 0);
                  }
                }}
              />

              <Field
                label="Address"
                value={item.address}
                onChange={(v) =>
                  updateNominee(
                    index,
                    "address",
                    v
                  )
                }
              />

              <Field
                label="City"
                value={item.city}
                onChange={(v) =>
                  updateNominee(
                    index,
                    "city",
                    v
                  )
                }
              />

              <Field
                label="Pincode"
                value={item.pincode}
                onChange={(v) =>
                  updateNominee(
                    index,
                    "pincode",
                    v
                  )
                }
              />

              <SelectField
                label="Country"
                value={item.country}
                onChange={(v) =>
                  updateNominee(
                    index,
                    "country",
                    v
                  )
                }
                options={[
                  "India",
                  "United States",
                  "United Kingdom",
                  "Other",
                ]}
              />
            </div>

            {item.minor === "Yes" && (
              <div className="conditional-box">
                <div className="grid">
                  <Field
                    label="Guardian Name"
                    value={item.guardianName}
                    onChange={(v) =>
                      updateNominee(
                        index,
                        "guardianName",
                        v
                      )
                    }
                  />

                  <Field
                    label="Guardian PAN"
                    value={item.guardianPan}
                    onChange={(v) =>
                      updateNominee(
                        index,
                        "guardianPan",
                        v.toUpperCase()
                      )
                    }
                  />
                </div>
              </div>
            )}
          </Section>
        ))}

      {form.nomineeChoice === "Yes" && (
        <>
          <div className="allocation-box">
            <div className="allocation-top">
              <span>Total Allocation</span>
              <strong>{allocation}%</strong>
            </div>

            <div className="allocation-track">
              <div
                style={{
                  width: `${Math.min(
                    allocation,
                    100
                  )}%`,
                }}
              />
            </div>

            <small>
              Percentage validation is disabled in this
              frontend preview.
            </small>
          </div>

          {form.nominees.length < 3 && (
            <button
              type="button"
              className="add-button"
              onClick={addNominee}
            >
              <Plus size={16} />
              Add Nominee {form.nominees.length + 1}
            </button>
          )}

          <Section
            title="Nomination Authentication"
            subtitle="Choose your preferred authentication method."
            icon={ShieldCheck}
          >
            <div className="auth-options">
              {[
                "OTP",
              ].map((method) => (
                <button
                  type="button"
                  key={method}
                  className={`auth-method-button ${form.nominationAuthentication === method ? "auth-active" : ""}`}
                  disabled={otpBatchLoading}
                  onClick={sendOtpToAllNominees}
                >
                  <span className="auth-method-icon">
                    {otpBatchLoading ? <Loader2 size={15} className="spin" /> : <Mail size={15} />}
                  </span>
                  <span>{otpBatchLoading ? "Sending..." : `Send ${method}`}</span>
                </button>
              ))}
            </div>
            {authenticationMessage && (
              <div
                role={authenticationMessageType === "error" ? "alert" : "status"}
                className={`nominee-auth-message nominee-auth-message-${authenticationMessageType}`}
              >
                {authenticationMessageType === "success" ? <CheckCircle2 size={17} /> : authenticationMessageType === "error" ? <CircleHelp size={17} /> : <Mail size={17} />}
                {authenticationMessage}
              </div>
            )}
            {form.nominees.map((nominee, index) => (
              <div key={index} className="nominee-otp-item">
                <div className="nominee-otp-heading">
                  <strong>Nominee {index + 1}</strong>
                  <span>{nominee.email || "Email not entered"}</span>
                  {nominee.emailOtpVerified && nominee.emailOtpTarget === String(nominee.email || "").trim().toLowerCase() && (
                    <small className="nominee-otp-verified"><CheckCircle2 size={13} /> Verified</small>
                  )}
                </div>
                <div className="nominee-otp-controls">
                  <input
                    value={nominee.emailOtp || ""}
                    maxLength={6}
                    inputMode="numeric"
                    placeholder={nominee.emailOtpSent ? "Enter 6-digit OTP" : "Send OTP first"}
                    disabled={!nominee.emailOtpSent || nominee.emailOtpVerified}
                    aria-label={`Nominee ${index + 1} email OTP`}
                    onChange={(event) =>
                      updateNominee(index, "emailOtp", event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                  />
                  {nominee.emailOtpSent && !nominee.emailOtpVerified && (
                    <button
                      type="button"
                      className="outline-button"
                      disabled={otpLoadingIndex === index || String(nominee.emailOtp || "").length !== 6}
                      onClick={() => verifyNomineeOtp(index, nominee)}
                    >
                      {otpLoadingIndex === index ? <Loader2 size={15} className="spin" /> : <ShieldCheck size={15} />}
                      Verify OTP
                    </button>
                  )}
                </div>
                {nominee.emailOtpSent &&
                  !nominee.emailOtpVerified &&
                  nominee.emailOtpTarget === String(nominee.email || "").trim().toLowerCase() && (() => {
                    const secondsRemaining = Math.max(
                      0,
                      30 - Math.floor((currentTime - Number(nominee.emailOtpSentAt || 0)) / 1000)
                    );
                    return (
                      <button
                        type="button"
                        className="nominee-otp-resend"
                        disabled={otpBatchLoading || otpLoadingIndex === index || secondsRemaining > 0}
                        onClick={() => resendNomineeOtp(index, nominee.email)}
                      >
                        {otpLoadingIndex === index ? <Loader2 size={13} className="spin" /> : <Mail size={13} />}
                        {otpLoadingIndex === index ? "Sending..." : secondsRemaining > 0 ? `Resend OTP in ${secondsRemaining}s` : "Resend OTP"}
                      </button>
                    );
                  })()}
              </div>
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

/* =========================================================
   REVIEW COMPONENTS
========================================================= */

function ReviewRow({ label, value }) {
  return (
    <div className="review-row">
      <span>{label}</span>
      <strong>{value || "\u2014"}</strong>
    </div>
  );
}

function ReviewSection({
  title,
  icon: Icon,
  onEdit,
  children,
}) {
  return (
    <div className="review-card">
      <div className="review-head">
        <div>
          <Icon size={16} />
          <h3>{title}</h3>
        </div>

        <button
          type="button"
          onClick={onEdit}
        >
          Edit
        </button>
      </div>

      <div className="review-grid">
        {children}
      </div>
    </div>
  );
}

function fullName(data) {
  if (!data) return "";

  return [
    data.firstName,
    data.middleName,
    data.lastName,
  ]
    .filter(Boolean)
    .join(" ");
}

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    if (!(file instanceof Blob)) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const convertNseDateToInput = (value) => {
  if (!value) return "";

  const trimmed = String(value).trim();
  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (!match) return trimmed;

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const buildAccountOpeningPayload = async (form, otpVerified, panVerified) => ({
  kyc_verified: Boolean(panVerified),
  identity: {
    phone: form.mobile,
    email: form.email,
    otp_verified: otpVerified,
  },
  client: {
    pan: form.pan,
    full_name: form.fullName,
    date_of_birth: form.dob,
    gender: form.gender,
    occupation: form.occupation,
    tax_status: form.taxStatus,
    kyc_type: form.kycType,
    ckyc_number: form.ckyc,
    account_type: form.accountType,
    holding_type: form.holdingType,
    kyc_status: form.kycStatus,
    kyc_verified: Boolean(panVerified),
    occupation_code: form.occupationCode || "01",
  },
  holders: {
    primary: {
      first_name: form.fullName,
      pan: form.pan,
      date_of_birth: form.dob,
      mobile: form.mobile,
      email: form.email,
      kyc_type: form.kycType,
      ckyc_number: form.ckyc,
    },
    second: form.secondHolder,
    third: form.thirdHolder,
    guardian: form.accountType === "Minor" ? form.guardian : null,
  },
  address: {
    address_1: form.address1,
    address_2: form.address2,
    address_3: form.address3,
    city: form.city,
    state: form.state,
    pincode: form.pincode,
    country: form.country,
  },
  banks: form.banks.map((bank) => ({
    bank_name: bank.bankName,
    account_number: bank.accountNumber,
    ifsc: bank.ifsc,
    account_type: bank.accountType,
    is_primary: bank.primary,
    verified: bank.verified,
  })),
  nominees: form.nomineeChoice === "Yes"
    ? form.nominees.map(({ emailOtp, emailOtpSent, emailOtpVerified, emailOtpTarget, emailOtpSentAt, ...nominee }) => nominee)
    : [],
  nomination_authentication:
    form.nomineeChoice === "Yes" ? form.nominationAuthentication : null,
  declarations: {
    information_correct: form.declaration1,
    terms_accepted: form.declaration2,
    data_processing_consent: form.declaration3,
  },
  protocol: {
    source: "DHANVO_FRONTEND",
    version: "1.9.8",
    nse_mapping_required: true,
    bank_in_183: true,
  },
  bank_proof: form.bankProof instanceof Blob
    ? {
        file_name: form.bankProof.name,
        file_data: await fileToBase64(form.bankProof),
      }
    : null,
});

/* =========================================================
   STEP 6
========================================================= */

function Step6({ form, goToStep }) {
  const primaryBank =
    form.banks.find((item) => item.primary) ||
    form.banks[0] ||
    {};

  const maskedAccount = primaryBank.accountNumber
    ? `XXXX${primaryBank.accountNumber.slice(-4)}`
    : "XXXX1234";

  return (
    <div className="stack">
      <Info>
        Review your application before final verification.
        You can edit any section.
      </Info>

      <ReviewSection
        title="Mobile & Email"
        icon={Smartphone}
        onEdit={() => goToStep(1)}
      >
        <ReviewRow
          label="Mobile"
          value={form.mobile}
        />

        <ReviewRow
          label="Email"
          value={form.email}
        />

        <ReviewRow
          label="OTP"
          value={
            form.otp
              ? "Entered"
              : "Not Entered"
          }
        />
      </ReviewSection>

      <ReviewSection
        title="KYC & Account"
        icon={ShieldCheck}
        onEdit={() => goToStep(2)}
      >
        <ReviewRow
          label="Full Name"
          value={form.fullName}
        />

        <ReviewRow
          label="PAN"
          value={form.pan}
        />

        <ReviewRow
          label="Date of Birth"
          value={form.dob}
        />

        <ReviewRow
          label="Gender"
          value={form.gender}
        />

        <ReviewRow
          label="Occupation"
          value={form.occupation}
        />

        <ReviewRow
          label="Tax Status"
          value={form.taxStatus}
        />

        <ReviewRow
          label="KYC Status"
          value={form.kycStatus}
        />

        <ReviewRow
          label="KYC Verification"
          value={
            form.kycType ||
            "Aadhaar e-KYC"
          }
        />

        <ReviewRow
          label="Account Type"
          value={form.accountType}
        />

        {form.accountType !==
          "Individual" && (
          <ReviewRow
            label="Holding Type"
            value={form.holdingType}
          />
        )}

        {form.accountType ===
          "Joint" && (
          <>
            <ReviewRow
              label="Second Holder"
              value={fullName(
                form.secondHolder
              )}
            />

            <ReviewRow
              label="Third Holder"
              value={fullName(
                form.thirdHolder
              )}
            />
          </>
        )}

        {form.accountType ===
          "Minor" && (
          <ReviewRow
            label="Guardian"
            value={fullName(
              form.guardian
            )}
          />
        )}
      </ReviewSection>

      <ReviewSection
        title="Address"
        icon={MapPin}
        onEdit={() => goToStep(3)}
      >
        <ReviewRow
          label="Address"
          value={[
            form.address1,
            form.address2,
            form.address3,
          ]
            .filter(Boolean)
            .join(", ")}
        />

        <ReviewRow
          label="City"
          value={form.city}
        />

        <ReviewRow
          label="State"
          value={form.state}
        />

        <ReviewRow
          label="Pincode"
          value={form.pincode}
        />

        <ReviewRow
          label="Country"
          value={form.country}
        />
      </ReviewSection>

      <ReviewSection
        title="Bank Account"
        icon={Landmark}
        onEdit={() => goToStep(4)}
      >
        <ReviewRow
          label="Bank"
          value={primaryBank.bankName}
        />

        <ReviewRow
          label="Account"
          value={maskedAccount}
        />

        <ReviewRow
          label="IFSC"
          value={primaryBank.ifsc}
        />

        <ReviewRow
          label="Account Type"
          value={primaryBank.accountType}
        />

        <ReviewRow
          label="Primary Bank"
          value={
            primaryBank.primary
              ? "Yes"
              : "No"
          }
        />
      </ReviewSection>

      <ReviewSection
        title="Nominee"
        icon={User}
        onEdit={() => goToStep(5)}
      >
        <ReviewRow
          label="Nominee Choice"
          value={form.nomineeChoice}
        />

        <ReviewRow
          label="Nominee"
          value={
            form.nominees[0]?.fullName
          }
        />

        <ReviewRow
          label="Relationship"
          value={
            form.nominees[0]?.relationship
          }
        />

        <ReviewRow
          label="Percentage"
          value={
            form.nominees[0]
              ?.percentage
              ? `${form.nominees[0].percentage}%`
              : ""
          }
        />
      </ReviewSection>
    </div>
  );
}

/* =========================================================
   STEP 7
========================================================= */

function Step7({
  form,
  update,
  submit,
  loading,
  panVerified,
  ekycStartedForPan,
  ekycVerificationUrl,
  kycPolling,
}) {
  const isPendingEkyc =
    ekycStartedForPan === String(form.pan || "").trim().toUpperCase() &&
    !panVerified;

  return (
    <div className="stack">
      <Section
        title="Declaration"
        subtitle="Review the declarations before final verification."
        icon={CheckCircle2}
      >
        <div className="declaration-list">
          <label>
            <input
              type="checkbox"
              checked={form.declaration1}
              onChange={(e) =>
                update(
                  "declaration1",
                  e.target.checked
                )
              }
            />

            <span className="custom-check">
              {form.declaration1 && (
                <Check size={12} />
              )}
            </span>

            <span>
              I confirm that all information provided by
              me is true and correct.
            </span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.declaration2}
              onChange={(e) =>
                update(
                  "declaration2",
                  e.target.checked
                )
              }
            />

            <span className="custom-check">
              {form.declaration2 && (
                <Check size={12} />
              )}
            </span>

            <span>
              I agree to the applicable Terms &
              Conditions and Privacy Policy.
            </span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.declaration3}
              onChange={(e) =>
                update(
                  "declaration3",
                  e.target.checked
                )
              }
            />

            <span className="custom-check">
              {form.declaration3 && (
                <Check size={12} />
              )}
            </span>

            <span>
              I consent to the processing of my information
              for account opening and investment services.
            </span>
          </label>
        </div>
      </Section>

      <Section
        title="Final Verification"
        subtitle={`Your selected KYC verification method: ${
          form.kycType ||
          "Aadhaar e-KYC"
        }`}
        icon={ShieldCheck}
      >
        <div className="final-verification">
          <div className="final-icon">
            <LockKeyhole size={22} />
          </div>

          <div className="final-copy">
            <strong>{panVerified ? "KYC Verified" : "KYC Verification Required"}</strong>

            <span>
              KYC Method:{" "}
              <b>
                {form.kycType ||
                  "Aadhaar e-KYC"}
              </b>
            </span>

            <p>
              {panVerified
                ? "Your KYC is verified. Continue to submit your account opening request."
                : ekycStartedForPan === String(form.pan || "").trim().toUpperCase()
                  ? "Complete Aadhaar eKYC using the link below, then continue to check your KYC status."
                  : "Continue will check your KYC. If it is not verified, Aadhaar eKYC will be started."}
            </p>
            {ekycVerificationUrl && ekycStartedForPan === String(form.pan || "").trim().toUpperCase() && (
              <div className="mt-3 min-w-0">
                <p className="text-xs font-semibold text-[#354354]">Aadhaar eKYC link</p>
                <a
                  className="ekyc-verification-link"
                  href={ekycVerificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {ekycVerificationUrl}
                </a>
                <p className="mt-2 text-xs text-[#657388]">
                  Open this link on the device you will use for verification. CAMS may ask for location permission.
                </p>
                <a
                  className="outline-button mt-3 w-fit"
                  href={ekycVerificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Aadhaar eKYC
                  <ArrowRight size={15} />
                </a>
              </div>
            )}
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={submit}
            disabled={loading || (isPendingEkyc && !kycPolling) || kycPolling}
          >
            {loading ? (
              <>
                <Loader2
                  size={17}
                  className="spin"
                />
                Submitting...
              </>
            ) : kycPolling || isPendingEkyc ? (
              <>
                <Loader2
                  size={17}
                  className="spin"
                />
                Checking KYC...
              </>
            ) : (
              <>
                {panVerified ? "Verify & Continue" : ekycStartedForPan === String(form.pan || "").trim().toUpperCase() ? "Check KYC & Continue" : "Verify KYC & Continue"}
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </div>
      </Section>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

function OpenAccount() {
  const { completeLogin } = useAuth();
  const SIGNUP_SESSION_KEY = 'dhanvo_signup_session';
  const SIGNUP_OTP_LOCK_KEY = 'dhanvo_signup_otp_lock';

  const readSignupSession = () => {
    try {
      const raw = sessionStorage.getItem(SIGNUP_SESSION_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const initialForm = {
    mobile: "",
    email: "",
    otp: "",

    pan: "",
    fullName: "",
    dob: "",
    gender: "",
    occupation: "",
    taxStatus: "",

    kycStatus: "Not Verified",
    panStatusRemark: "",
    kycType: "Aadhaar e-KYC",
    ckyc: "",

    accountType: "Individual",
    accountTypeOpen: false,
    holdingType: "",

    secondHolder: null,
    thirdHolder: null,

    guardian: createGuardian(),

    address1: "",
    address2: "",
    address3: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",

    banks: [createBank()],
    bankProof: null,

    nomineeChoice: "",
    nominees: [],
    nominationAuthentication: "OTP",

    declaration1: false,
    declaration2: false,
    declaration3: false,
  };

  const savedSession = readSignupSession();

  const [step, setStep] = useState(() => Math.min(STEPS.length, Math.max(1, Number(savedSession.step || 1))));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [otpSent, setOtpSent] = useState(Boolean(savedSession.otpSent));
  const [otpVerified, setOtpVerified] = useState(Boolean(savedSession.otpVerified));
  const [otpTimer, setOtpTimer] = useState(Number(savedSession.otpTimer || 30));
  const [credentialType, setCredentialType] = useState("password");
  const [credential, setCredential] = useState("");
  const [credentialConfirmation, setCredentialConfirmation] = useState("");

  const [panVerified, setPanVerified] =
    useState(Boolean(savedSession.panVerified));
  const [panChecked, setPanChecked] =
    useState(Boolean(savedSession.panChecked));
  const [ekycStartedForPan, setEkycStartedForPan] = useState(savedSession.ekycStartedForPan || "");
  const [ekycVerificationUrl, setEkycVerificationUrl] = useState(savedSession.ekycVerificationUrl || "");
  const [ekycLastRequestedAt, setEkycLastRequestedAt] = useState(Number(savedSession.ekycLastRequestedAt || 0));
  const [kycPolling, setKycPolling] = useState(false);

  const [applicationId, setApplicationId] =
    useState(savedSession.applicationId || "");

  const pageTopRef = useRef(null);
  const submitApplicationRef = useRef(null);

  const [form, setForm] = useState(() => {
    const savedForm = savedSession.form || {};
    return {
      ...initialForm,
      ...savedForm,
      guardian: {
        ...createGuardian(),
        ...(savedForm.guardian || {}),
      },
      banks: Array.isArray(savedForm.banks) && savedForm.banks.length
        ? savedForm.banks
        : [createBank()],
    };
  });

  const update = useCallback((key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  /* OTP countdown starts ONLY after Send OTP */

  useEffect(() => {
    if (!otpSent || otpTimer <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setOtpTimer((previous) =>
        Math.max(0, previous - 1)
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [otpSent, otpTimer]);

  useEffect(() => {
    pageTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [step]);

  useEffect(() => {
    try {
      const payload = {
        step,
        otpSent,
        otpVerified,
        otpTimer,
        panVerified,
        panChecked,
        ekycStartedForPan,
        ekycVerificationUrl,
        ekycLastRequestedAt,
        applicationId,
        form,
      };
      sessionStorage.setItem(SIGNUP_SESSION_KEY, JSON.stringify(payload));
    } catch {
      // no-op
    }
  }, [step, otpSent, otpVerified, otpTimer, panVerified, panChecked, ekycStartedForPan, ekycVerificationUrl, ekycLastRequestedAt, applicationId, form]);

  useEffect(() => {
    if (success) {
      sessionStorage.removeItem(SIGNUP_SESSION_KEY);
      sessionStorage.removeItem(SIGNUP_OTP_LOCK_KEY);
    }
  }, [success]);

  useEffect(() => {
    const pan = String(form.pan || "").trim().toUpperCase();
    const isPendingEkyc = Boolean(
      ekycStartedForPan &&
      pan &&
      ekycStartedForPan === pan &&
      !panVerified
    );

    if (!isPendingEkyc || step !== 7) {
      return undefined;
    }

    let cancelled = false;

    const pollKycStatus = async () => {
      if (cancelled) {
        return;
      }

      setKycPolling(true);

      try {
        const response = await api.post("/auth/check-kyc-status", { pan: ekycStartedForPan });
        const kycResult = response.data?.data || {};
        const statusText = String(kycResult.kycStatus || kycResult.status || "").toLowerCase();
        const verified = kycResult.verified === true;

        if (verified) {
          setPanVerified(true);
          setPanChecked(true);
          update("kycStatus", kycResult.kycStatus || "Verified");
          update("panStatusRemark", kycResult.statusRemark || "KYC verified");

          submitApplicationRef.current?.();
          return;
        }

        const failed = ["failed", "rejected", "declined", "not verified", "not_verified"].some((value) =>
          statusText.includes(value)
        );

        if (failed) {
          setPanVerified(false);
          setPanChecked(false);
          update("kycStatus", "Not Verified");
          update("panStatusRemark", kycResult.statusRemark || "Aadhaar eKYC failed. Please retry or choose another verification method.");
          return;
        }

        update("kycStatus", kycResult.kycStatus || "Aadhaar eKYC pending");
        update("panStatusRemark", kycResult.statusRemark || "Aadhaar eKYC is still pending. Complete the verification link and wait for confirmation.");
      } catch (error) {
        update("panStatusRemark", "Unable to confirm Aadhaar eKYC status right now. We will retry automatically.");
      } finally {
        if (!cancelled) {
          setKycPolling(false);
        }
      }
    };

    pollKycStatus();
    const timer = window.setInterval(pollKycStatus, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      setKycPolling(false);
    };
  }, [ekycStartedForPan, form.pan, panVerified, step, update]);

  const sendOtp = async () => {
    if (!/^[0-9]{10}$/.test(form.mobile)) {
      window.alert("Enter a valid 10-digit mobile number.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      window.alert("Enter a valid email address.");
      return;
    }

    const otpLockKey = `${form.mobile}:${form.email}`;
    const currentLock = (() => {
      try {
        return JSON.parse(sessionStorage.getItem(SIGNUP_OTP_LOCK_KEY) || '{}');
      } catch {
        return {};
      }
    })();

    if (currentLock.key === otpLockKey && currentLock.sentAt && Date.now() - currentLock.sentAt < 60000) {
      setOtpSent(true);
      setOtpVerified(false);
      setOtpTimer(30);
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/check-signup-account", buildOtpPayload({
        phone: form.mobile,
        email: form.email,
      }));
      await api.post("/auth/send-otp", buildOtpPayload({
        phone: form.mobile,
        email: form.email,
      }));
      setOtpSent(true);
      setOtpVerified(false);
      setOtpTimer(30);
      update("otp", "");
      sessionStorage.setItem(SIGNUP_OTP_LOCK_KEY, JSON.stringify({ key: otpLockKey, sentAt: Date.now() }));
    } catch (error) {
      const message = error.response?.data?.message || "Unable to send OTP.";
      if (error.response?.data?.code === "ACCOUNT_EXISTS") {
        window.alert(message);
        window.location.href = "/login";
        return;
      }
      window.alert(message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (form.otp.length !== 6) {
      window.alert("Enter the 6-digit OTP.");
      return;
    }
    const validCredential = credentialType === "pin"
      ? /^\d{6}$/.test(credential)
      : /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(credential);
    if (!validCredential) {
      window.alert(credentialType === "pin"
        ? "Set a 6-digit PIN."
        : "Set a password with at least 8 characters, including uppercase, lowercase, and a number.");
      return;
    }
    if (credential !== credentialConfirmation) {
      window.alert("Your password or PIN confirmation does not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/verify-otp", {
        ...buildOtpPayload({
          phone: form.mobile,
          email: form.email,
          otp: form.otp,
        }),
        credentialType,
        credential,
      });
      setOtpVerified(true);
      sessionStorage.removeItem(SIGNUP_OTP_LOCK_KEY);
      setStep(2);
    } catch (error) {
      setOtpVerified(false);
      window.alert(error.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!otpSent || otpTimer > 0) {
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/send-otp", buildOtpPayload({
        phone: form.mobile,
        email: form.email,
      }));
      setOtpVerified(false);
      update("otp", "");
      setOtpTimer(30);
    } catch (error) {
      window.alert(error.response?.data?.message || "Unable to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const updateIdentity = useCallback((key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      otp: "",
    }));
    setOtpVerified(false);
    setCredential("");
    setCredentialConfirmation("");
  }, []);

  const verifyPan = async () => {
    const pan = form.pan.trim().toUpperCase();

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      window.alert("Enter a valid 10-character PAN number.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/verify-pan", {
        pan,
        email: form.email,
        phone: form.mobile,
      });
      const result = response.data?.data;
      const status = result?.kycStatus || "Not Verified";
      const remark = result?.statusRemark || status;
      const verified = Boolean(result?.verified);
      const success = Boolean(response.data?.success);

      setPanVerified(verified);
      setPanChecked(success);
      update("kycStatus", status);
      update("panStatusRemark", remark);

      if (!success) {
        setPanChecked(false);
        update("kycStatus", "Not Verified");
        update("panStatusRemark", "");
        window.alert("PAN KYC verification failed.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        pan: result.pan || pan,
        fullName: result.name || prev.fullName,
        dob: result.dob ? convertNseDateToInput(result.dob) : prev.dob,
        kycStatus: result.kycStatus || status,
        panStatusRemark: result.statusRemark || remark,
      }));
    } catch (error) {
      setPanVerified(false);
      setPanChecked(false);
      update("kycStatus", "Not Verified");
      update("panStatusRemark", "");
      window.alert(
        error.response?.data?.message || "Unable to verify PAN right now."
      );
    } finally {
      setLoading(false);
    }
  };

  const splitFullName = (fullName) => {
    const value = String(fullName || "").trim();
    const parts = value.split(/\s+/).filter(Boolean);

    if (!parts.length) {
      return { firstName: "", middleName: "", lastName: "" };
    }

    if (parts.length === 1) {
      return { firstName: parts[0], middleName: "", lastName: "" };
    }

    if (parts.length === 2) {
      return { firstName: parts[0], middleName: "", lastName: parts[1] };
    }

    return {
      firstName: parts[0],
      middleName: parts.slice(1, -1).join(" "),
      lastName: parts[parts.length - 1],
    };
  };

  const taxStatusMap = {
    Individual: "01",
    HUF: "02",
    NRI: "03",
    PIO: "04",
    Company: "05",
    Trust: "06",
    Partnership: "07",
    LLP: "08",
  };

  const registerNseUcc = async () => {
    try {
      const names = splitFullName(form.fullName);
      const taxStatus = taxStatusMap[form.taxStatus] || "01";

      const response = await api.post("/auth/register-nse-ucc", {
        email: form.email,
        phone: form.mobile,
        firstName: names.firstName,
        middleName: names.middleName,
        lastName: names.lastName,
        pan: form.pan,
        dob: form.dob,
        gender:
          form.gender === "Female"
            ? "F"
            : form.gender === "Other"
              ? "O"
              : "M",
        taxStatus,
        occupationCode: "01",
        holdingNature:
          form.accountType === "Individual"
            ? "SI"
            : form.holdingType === "Joint"
              ? "JO"
              : "SI",
        address1: form.address1,
        address2: form.address2,
        address3: form.address3,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        country: form.country || "INDIA",
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "NSE UCC registration failed"
        );
      }

      return response.data.data;
    } catch (error) {
      const message = String(
        error.response?.data?.message || error.message || ""
      );

      if (/user not found.*nse ucc|nse ucc.*user not found/i.test(message) || error.response?.status === 404) {
        console.warn("Skipping NSE UCC registration because user does not exist yet during signup.");
        return { skipped: true };
      }

      console.error("NSE UCC registration error:", error);
      throw new Error(
        message || "Unable to register NSE UCC"
      );
    }
  };

  const nextStep = async () => {
    if (step >= STEPS.length) {
      return;
    }

    if (step === 1 && !otpVerified) {
      window.alert("Verify the OTP before continuing.");
      return;
    }

    if (step === 2 && !panChecked) {
      window.alert("Verify PAN first before continuing.");
      return;
    }

    if (step === 5) {
      if (!['Yes', 'No'].includes(form.nomineeChoice)) {
        window.alert("Choose whether you want to add a nominee before continuing.");
        return;
      }

      if (form.nomineeChoice === "Yes") {
        if (!form.nominees.length) {
          window.alert("Add at least one nominee before continuing.");
          return;
        }
      }
    }

    const requiredFields = [];
    const addRequiredField = (label, value) => {
      if (!String(value ?? "").trim()) {
        requiredFields.push(label);
      }
    };

    if (step === 4) {
      form.banks.forEach((bank, index) => {
        const bankLabel = `Bank ${index + 1}`;
        const accountNumber = String(bank.accountNumber || "").trim();
        const confirmedAccountNumber = String(bank.confirmAccountNumber || "").trim();
        const ifsc = String(bank.ifsc || "").trim().toUpperCase();

        addRequiredField(`${bankLabel} Name`, bank.bankName);
        addRequiredField(`${bankLabel} Account Number`, accountNumber);
        addRequiredField(`${bankLabel} Confirm Account Number`, confirmedAccountNumber);
        addRequiredField(`${bankLabel} IFSC`, ifsc);
        addRequiredField(`${bankLabel} Account Type`, bank.accountType);

        if (accountNumber && !/^\d{9,18}$/.test(accountNumber)) {
          requiredFields.push(`${bankLabel} Account Number must contain 9-18 digits`);
        }
        if (accountNumber && confirmedAccountNumber && accountNumber !== confirmedAccountNumber) {
          requiredFields.push(`${bankLabel} Account Number and confirmation do not match`);
        }
        if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
          requiredFields.push(`${bankLabel} IFSC must be in valid format (e.g. SBIN0001234)`);
        }
      });

      const primaryBankCount = form.banks.filter((bank) => bank.primary).length;
      if (primaryBankCount !== 1) {
        requiredFields.push("Select exactly one Primary Bank");
      }
    }

    if (step === 5 && form.nomineeChoice === "Yes") {
      let totalAllocation = 0;

      form.nominees.forEach((nominee, index) => {
        const nomineeLabel = `Nominee ${index + 1}`;
        const percentage = Number(nominee.percentage);
        const mobile = String(nominee.mobile || "").trim();
        const email = String(nominee.email || "").trim();
        const identityType = String(nominee.identityType || "");
        const identityNumber = String(nominee.identityNumber || "").trim().toUpperCase();
        const dob = String(nominee.dob || "").trim();

        addRequiredField(`${nomineeLabel} Full Name`, nominee.fullName);
        addRequiredField(`${nomineeLabel} Relationship`, nominee.relationship);
        addRequiredField(`${nomineeLabel} Percentage`, nominee.percentage);
        addRequiredField(`${nomineeLabel} Date of Birth`, dob);
        addRequiredField(`${nomineeLabel} Mobile`, mobile);
        addRequiredField(`${nomineeLabel} Email`, email);
        addRequiredField(`${nomineeLabel} Address`, nominee.address);
        addRequiredField(`${nomineeLabel} City`, nominee.city);
        addRequiredField(`${nomineeLabel} Pincode`, nominee.pincode);
        addRequiredField(`${nomineeLabel} Country`, nominee.country);

        if (Number.isFinite(percentage)) totalAllocation += percentage;
        if (!Number.isInteger(percentage) || percentage < 1 || percentage > 100) {
          requiredFields.push(`${nomineeLabel} Percentage must be a whole number from 1 to 100`);
        }

        if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
          requiredFields.push(`${nomineeLabel} Mobile must be a valid 10-digit Indian number`);
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          requiredFields.push(`${nomineeLabel} Email must be valid`);
        }
        if (nominee.country === "India" && nominee.pincode && !/^\d{6}$/.test(String(nominee.pincode).trim())) {
          requiredFields.push(`${nomineeLabel} Pincode must contain 6 digits`);
        }

        if (identityNumber && identityType === "PAN" && !/^[A-Z]{5}\d{4}[A-Z]$/.test(identityNumber)) {
          requiredFields.push(`${nomineeLabel} PAN must be in valid format`);
        } else if (identityNumber && identityType.toLowerCase().includes("aadhaar") && !/^\d{4}$/.test(identityNumber)) {
          requiredFields.push(`${nomineeLabel} Aadhaar must contain its last 4 digits`);
        }

        if (dob) {
          const birthDate = new Date(`${dob}T00:00:00`);
          if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) {
            requiredFields.push(`${nomineeLabel} Date of Birth must be a valid past date`);
          } else {
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const birthdayNotReached = today.getMonth() < birthDate.getMonth()
              || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
            if (birthdayNotReached) age -= 1;

            if (nominee.minor === "Yes" && age >= 18) {
              requiredFields.push(`${nomineeLabel} is marked minor but is 18 or older`);
            }
            if (nominee.minor === "No" && age < 18) {
              requiredFields.push(`${nomineeLabel} is under 18; mark as minor and add guardian details`);
            }
          }
        }

        if (nominee.minor === "Yes") {
          addRequiredField(`${nomineeLabel} Guardian Name`, nominee.guardianName);
          addRequiredField(`${nomineeLabel} Guardian PAN`, nominee.guardianPan);
          if (nominee.guardianPan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(String(nominee.guardianPan).trim().toUpperCase())) {
            requiredFields.push(`${nomineeLabel} Guardian PAN must be in valid format`);
          }
        }
      });

      if (form.nominees.length && totalAllocation !== 100) {
        requiredFields.push("Nominee percentage allocations must total exactly 100%");
      }
    }

    if (step === 2) {
      addRequiredField("Full Name", form.fullName);
      addRequiredField("Date of Birth", form.dob);
      addRequiredField("Gender", form.gender);
      addRequiredField("Occupation", form.occupation);
      addRequiredField("Tax Status", form.taxStatus);

      if (form.kycType === "CKYC") {
        addRequiredField("CKYC Number", form.ckyc);
      }

      if (form.accountType !== "Individual") {
        addRequiredField("Holding Type", form.holdingType);
      }

      if (form.accountType === "Joint") {
        [
          ["Second Holder", form.secondHolder],
          ...(form.thirdHolder ? [["Third Holder", form.thirdHolder]] : []),
        ].forEach(([holderLabel, holder]) => {
          addRequiredField(`${holderLabel} First Name`, holder?.firstName);
          addRequiredField(`${holderLabel} Last Name`, holder?.lastName);
          addRequiredField(`${holderLabel} PAN`, holder?.pan);
          addRequiredField(`${holderLabel} Date of Birth`, holder?.dob);
          addRequiredField(`${holderLabel} Mobile`, holder?.mobile);
          addRequiredField(`${holderLabel} Email`, holder?.email);
          if (holder?.kycType === "CKYC") {
            addRequiredField(`${holderLabel} CKYC Number`, holder?.ckyc);
          }
        });
      }

      if (form.accountType === "Minor") {
        addRequiredField("Guardian First Name", form.guardian?.firstName);
        addRequiredField("Guardian Last Name", form.guardian?.lastName);
        addRequiredField("Guardian Date of Birth", form.guardian?.dob);
        addRequiredField("Guardian PAN", form.guardian?.pan);
        addRequiredField("Guardian Relationship", form.guardian?.relationship);
      }
    }

    if (step === 3) {
      addRequiredField("Address Line 1", form.address1);
      addRequiredField("City", form.city);
      addRequiredField("State", form.state);
      addRequiredField("Pincode", form.pincode);
      addRequiredField("Country", form.country);

      if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
        requiredFields.push("a valid 6-digit Pincode");
      }
    }

    if (requiredFields.length) {
      window.alert(`Please complete the required fields: ${requiredFields.join(", ")}.`);
      return;
    }

    if (step === 5 && form.nomineeChoice === "Yes") {
      const unverifiedIndex = form.nominees.findIndex((nominee) =>
        !nominee.emailOtpVerified ||
        nominee.emailOtpTarget !== String(nominee.email || "").trim().toLowerCase()
      );
      if (unverifiedIndex !== -1) {
        window.alert(`Verify the email OTP for Nominee ${unverifiedIndex + 1} before continuing.`);
        return;
      }
    }

    setLoading(true);

    await simulateDelay(250);

    setStep((previous) =>
      Math.min(STEPS.length, previous + 1)
    );

    setLoading(false);
  };

  const previousStep = () => {
    if (step <= 2) {
      return;
    }

    setStep((previous) =>
      Math.max(1, previous - 1)
    );
  };

  const goToStep = (number) => {
    if (number === 1 && otpVerified) {
      return;
    }

    setStep(
      Math.max(
        1,
        Math.min(STEPS.length, number)
      )
    );
  };

  const addNominee = () => {
    setForm((prev) => {
      if (prev.nominees.length >= 3) {
        return prev;
      }

      return {
        ...prev,
        nominees: [
          ...prev.nominees,
          createNominee(),
        ],
      };
    });
  };

  const updateNominee = (
    index,
    key,
    value
  ) => {
    setForm((prev) => {
      const nominees = [...prev.nominees];

      nominees[index] = {
        ...nominees[index],
        [key]: value,
      };

      return {
        ...prev,
        nominees,
      };
    });
  };

  const removeNominee = (index) => {
    setForm((prev) => ({
      ...prev,
      nominees: prev.nominees.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const submitApplication = async () => {
    if (!form.declaration1 || !form.declaration2 || !form.declaration3) {
      window.alert("Accept all declarations before submitting.");
      return;
    }

    const primaryBank = form.banks.find((bank) => bank.primary) || form.banks[0];
    if (!primaryBank?.accountNumber || !primaryBank?.ifsc) {
      window.alert("Add a primary bank account before submitting.");
      return;
    }

    if (form.nomineeChoice === "Yes") {
      const unverifiedNominee = form.nominees.find((nominee) =>
        !nominee.emailOtpVerified ||
        nominee.emailOtpTarget !== String(nominee.email || "").trim().toLowerCase()
      );
      if (unverifiedNominee) {
        window.alert("Verify the email OTP for every nominee before submitting.");
        setStep(5);
        return;
      }
    }

    setLoading(true);
    try {
      const pan = String(form.pan || "").trim().toUpperCase();
      let kycVerifiedForSubmission = false;

      const kycResponse = await api.post("/auth/check-kyc-status", { pan });
      const kycResult = kycResponse.data?.data || {};
      kycVerifiedForSubmission = kycResult.verified === true;

      if (kycVerifiedForSubmission) {
        setPanVerified(true);
        setPanChecked(true);
        update("kycStatus", kycResult.kycStatus || "Verified");
        update("panStatusRemark", kycResult.statusRemark || "KYC verified");
      } else {
        if (form.kycType !== "Aadhaar e-KYC") {
          window.alert(`KYC is not verified. Complete the selected ${form.kycType || "KYC"} verification before submitting.`);
          return;
        }

        const isRetry = ekycStartedForPan === pan;
        const retryCooldownMs = 30 * 1000;
        const retryWaitMs = retryCooldownMs - (Date.now() - ekycLastRequestedAt);
        if (isRetry && ekycLastRequestedAt && retryWaitMs > 0) {
          update("kycStatus", kycResult.kycStatus || "Aadhaar eKYC pending");
          update("panStatusRemark", "Your earlier Aadhaar eKYC request is still pending. Complete the link below; you can request a fresh link shortly if needed.");
          window.alert(`Aadhaar eKYC is still pending. Complete the current link or wait ${Math.ceil(retryWaitMs / 1000)} seconds before requesting a new one.`);
          return;
        }

        const ekycResponse = await api.post("/auth/init-ekyc", {
          pan,
          mobile: form.mobile,
          email: form.email,
        });
        const ekycData = ekycResponse.data?.data || {};
        if (ekycData.alreadyVerified || ekycData.verified) {
          kycVerifiedForSubmission = true;
          setPanVerified(true);
          setPanChecked(true);
          update("kycStatus", ekycData.kycStatus || "Verified");
          update("panStatusRemark", ekycData.statusRemark || "KYC verified");
        } else {
          const verificationUrl = ekycData.verificationUrl || ekycData.ekycLink || ekycData.link || "";

          setEkycStartedForPan(pan);
          setEkycVerificationUrl(verificationUrl);
          setEkycLastRequestedAt(Date.now());
          update("kycStatus", ekycData.status || "Aadhaar eKYC initiated");
          update("panStatusRemark", verificationUrl
            ? "Aadhaar eKYC started. Complete the verification using the link below."
            : (ekycResponse.data?.message || "Aadhaar eKYC started. Complete it, then check your KYC status again."));
          window.alert(isRetry
            ? "KYC is still unverified. A fresh Aadhaar eKYC request has been sent. Complete the latest link, then continue again."
            : "Aadhaar eKYC has been started. Complete it, then select Continue again to check your status.");
          return;
        }
      }

      const application = await buildAccountOpeningPayload(form, otpVerified, kycVerifiedForSubmission);
      const response = await api.post("/auth/complete-account-opening", { application });
      const result = response.data?.data || {};

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Account opening failed.");
      }

      completeLogin(response.data);

      setApplicationId(
        result.applicationId || result.application_id || result.reg_id || "PENDING"
      );
      window.location.href = "/dashboard/explore";
    } catch (error) {
      if (error.response?.data?.code === "KYC_NOT_VERIFIED") {
        const kycResult = error.response.data?.data || {};
        setPanVerified(false);
        setPanChecked(false);
        update("kycStatus", kycResult.kycStatus || "Not Verified");
        update("panStatusRemark", kycResult.statusRemark || error.response.data.message);
      }
      if (error.response?.data?.code === "ACCOUNT_EXISTS") {
        window.alert(error.response.data.message || "This account already exists. Please sign in.");
        window.location.href = "/login";
        return;
      }
      window.alert(
        error.response?.data?.message || error.message || "Unable to submit account opening request."
      );
    } finally {
      setLoading(false);
    }
  };
  submitApplicationRef.current = submitApplication;

  /* =======================================================
     SUCCESS
  ======================================================= */

  if (success) {
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

            <div className="success-label">
              APPLICATION SUBMITTED
            </div>

            <h1>
              Account Opening Request
              Submitted
            </h1>

            <p>
              Your account opening request has
              been received successfully.
            </p>

            <div className="application-id">
              <span>Application ID</span>
              <strong>
                {applicationId}
              </strong>
            </div>

            <div className="application-status">
              <i />

              <div>
                <strong>
                  Under Verification
                </strong>

                <p>
                  We'll notify you once your
                  application progresses.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="primary-button full"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              Back to Dhanvo
              <ArrowRight size={17} />
            </button>
          </motion.div>
        </div>
      </>
    );
  }

  const CurrentIcon =
    STEPS[step - 1].icon;

  return (
    <>
      <style>{styles}</style>

      <div
        className="open-account-page"
        ref={pageTopRef}
      >
        {/* DESKTOP SIDEBAR */}

        <aside className="sidebar">
          <button
            type="button"
            className="back-to-dhanvo"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            <ArrowLeft size={14} />
            Back to Dhanvo
          </button>

          <div className="sidebar-brand">
            <div className="brand">
              DHANVO
            </div>

            <span className="sidebar-eyebrow">
              TRUST · TECHNOLOGY · TRANSPARENCY
            </span>

            <h1 className="sidebar-headline">
              Create your Dhanvo account.
            </h1>

            <p>
              Set up your profile once and start investment journey with DHANVO.
            </p>
          </div>

          <div className="sidebar-benefits">
            <div className="sidebar-benefit">
              <span className="benefit-check">✓</span>
              <div>
                <strong><b>Trust -</b> Regulated &amp; 100% Secure</strong>
                <p>Your data and investments are fully secure and protected under strict regulatory standards.</p>
              </div>
            </div>
            <div className="sidebar-benefit">
              <span className="benefit-check">✓</span>
              <div>
                <strong><b>Technology -</b> Fast, Paperless &amp; Smart Setup</strong>
                <p>Automated KYC, instant verification, and a seamless digital experience with zero paperwork.</p>
              </div>
            </div>
            <div className="sidebar-benefit">
              <span className="benefit-check">✓</span>
              <div>
                <strong><b>Transparency -</b> Zero Hidden Charges, Pure Clarity</strong>
                <p>Complete clarity at every step—no hidden terms, just an honest and straightforward platform.</p>
              </div>
            </div>
          </div>

          <div className="sidebar-progress">
            <div className="progress-header">
              <span>Account Opening</span>
              <strong>
                {Math.round(
                  (step / STEPS.length) * 100
                )}
                %
              </strong>
            </div>

            <div className="vertical-progress">
              <motion.div
                animate={{
                  height: `${
                    (step / STEPS.length) * 100
                  }%`,
                }}
              />
            </div>

            {STEPS.map((item) => {
              const Icon = item.icon;
              const completed =
                step > item.id;
              const active =
                step === item.id;

              return (
                <button
                  type="button"
                  key={item.id}
                  disabled
                  className={`sidebar-step ${
                    active
                      ? "active"
                      : ""
                  } ${
                    completed
                      ? "completed"
                      : ""
                  }`}
                  onClick={() =>
                    goToStep(item.id)
                  }
                >
                  <span className="step-circle">
                    {completed ? (
                      <Check size={12} />
                    ) : (
                      item.id
                    )}
                  </span>

                  <Icon size={15} />

                  <span>
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="sidebar-footer">
            <strong>Dhanlakshya Securities Private Limited</strong>
            <p>DHANVO | Empowering your wealth with trust, technology, and transparency.</p>
          </div>
        </aside>

        {/* MAIN */}

        <main className="main-content">
          {/* MOBILE HEADER */}

          <div className="mobile-top">
            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/";
              }}
            >
              <ArrowLeft size={14} />
              Back to Dhanvo
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/login";
              }}
            >
              Sign In
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="mobile-brand-row">
            <div className="brand">
              DHANVO
            </div>

            <span>
              Step {step} of {STEPS.length}
            </span>
          </div>

          <div className="mobile-intro">
            <span className="mobile-eyebrow">
              TRUST · TECHNOLOGY · TRANSPARENCY
            </span>
            <h1>Create your Dhanvo account.</h1>
            <p>
              Open your account with confidence: regulated security, paperless verification, and clear terms with no hidden charges.
            </p>
            <div className="mobile-values">
              <span>Trust</span>
              <span>Technology</span>
              <span>Transparency</span>
            </div>
            <div className="mobile-trust-copy">
              <p><strong>Trust</strong> — Regulated security protects your data and investments.</p>
              <p><strong>Technology</strong> — Paperless KYC and fast digital verification.</p>
              <p><strong>Transparency</strong> — Clear terms, with no hidden charges.</p>
            </div>
            <span>
              <LockKeyhole size={13} />
              Secure Account Opening
            </span>
          </div>

          <div className="mobile-progress">
            <motion.div
              animate={{
                width: `${
                  (step / STEPS.length) * 100
                }%`,
              }}
            />
          </div>

          <div className="content-wrapper">
            <div className="signup-topbar">
              <span>Step {step} of {STEPS.length}</span>
              <span className="onboarding-secure">
                <LockKeyhole size={16} />
                Secure onboarding
              </span>
            </div>

            <div className="signup-step-track" aria-label={`Step ${step} of ${STEPS.length}`}>
              {STEPS.map((item) => (
                <span
                  key={item.id}
                  className={`signup-step-segment ${
                    step === item.id ? "current" : step > item.id ? "done" : ""
                  }`}
                />
              ))}
            </div>

            <header className="page-header">
              <div>
                <div className="heading-row">
                  <CurrentIcon
                    size={20}
                  />

                  <h1>
                    {step === 1 ? "Verify mobile & email" : STEPS[step - 1].name}
                  </h1>
                </div>

                <p>
                  {step === 1
                    ? "Enter your mobile number and email. We'll send one OTP to verify both."
                    : "Complete your account opening journey with a simple digital process."}
                </p>
              </div>

              <div className="header-right">
                <span className="secure-pill">
                  <ShieldCheck size={14} />
                  Secure
                </span>

                <div className="signin-area">
                  <span>
                    Already have an
                    account?
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      window.location.href =
                        "/login";
                    }}
                  >
                    Sign In
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </header>

            <AnimatePresence mode="wait">
              <motion.div
                className={`step-view ${step === 1 ? "step-one" : ""}`}
                key={step}
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
                  duration: 0.2,
                }}
              >
                {step === 1 && (
                  <Step1
                    form={form}
                    update={update}
                    onIdentityChange={updateIdentity}
                    credentialType={credentialType}
                    setCredentialType={setCredentialType}
                    credential={credential}
                    setCredential={setCredential}
                    credentialConfirmation={credentialConfirmation}
                    setCredentialConfirmation={setCredentialConfirmation}
                    otpSent={otpSent}
                    otpVerified={otpVerified}
                    otpTimer={otpTimer}
                    sendOtp={sendOtp}
                    verifyOtp={verifyOtp}
                    resendOtp={resendOtp}
                    loading={loading}
                  />
                )}

                {step === 2 && (
                  <Step2
                    form={form}
                    setForm={setForm}
                    update={update}
                    panVerified={panVerified}
                    panChecked={panChecked}
                    setPanVerified={setPanVerified}
                    setPanChecked={setPanChecked}
                    verifyPan={verifyPan}
                    loading={loading}
                  />
                )}

                {step === 3 && (
                  <Step3
                    form={form}
                    update={update}
                  />
                )}

                {step === 4 && (
                  <Step4
                    form={form}
                    setForm={setForm}
                  />
                )}

                {step === 5 && (
                  <Step5
                    form={form}
                    update={update}
                    addNominee={
                      addNominee
                    }
                    updateNominee={
                      updateNominee
                    }
                    removeNominee={
                      removeNominee
                    }
                  />
                )}

                {step === 6 && (
                  <Step6
                    form={form}
                    goToStep={goToStep}
                  />
                )}

                {step === 7 && (
                  <Step7
                    form={form}
                    update={update}
                    submit={
                      submitApplication
                    }
                    loading={loading}
                    panVerified={panVerified}
                    ekycStartedForPan={ekycStartedForPan}
                    ekycVerificationUrl={ekycVerificationUrl}
                    kycPolling={kycPolling}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* NORMAL NAVIGATION FOR STEPS 1-6 */}

            {step < STEPS.length && (
              <div className={`navigation ${
                step === 1 && !otpVerified ? "step-one-navigation" : ""
              }`}>
                <button
                  type="button"
                  className="back-button"
                  onClick={
                    previousStep
                  }
                  disabled={
                    step <= 2 ||
                    loading
                  }
                >
                  <ArrowLeft size={17} />
                  Back
                </button>

                <button
                  type="button"
                  className="primary-button"
                  onClick={nextStep}
                  disabled={loading || (step === 1 && !otpVerified)}
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={17}
                        className="spin"
                      />
                      Processing
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight
                        size={17}
                      />
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="signup-login">
              Already have an account?
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/login";
                }}
              >
                Log in
              </button>
            </div>

            {/* STEP 7 HAS ONLY VERIFY & CONTINUE
                INSIDE THE STEP */}

            <footer className="footer">
              <span>
                © {new Date().getFullYear()}{" "}
                DHANVO
              </span>

              <strong>
                Trust · Technology ·
                Transparency
              </strong>

              <span>
                www.dhanvo.in
              </span>
            </footer>
          </div>
        </main>
      </div>
    </>
  );
}

/* =========================================================
   COMPLETE CSS
========================================================= */

const styles = `
* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  min-height: 100%;
  margin: 0;
  padding: 0;
}

body {
  font-family:
    "Manrope",
    "Inter",
    Arial,
    Helvetica,
    sans-serif;
  background: #FAF8F3;
  color: #071321;
}

button,
input,
select {
  font-family: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}

.open-account-page {
  width: 100%;
  min-height: 100vh;
  display: flex;
  background: #FAF8F3;
}

/* =========================================================
   SIDEBAR
========================================================= */

.sidebar {
  position: relative;
  z-index: 50;
  width: 36%;
  min-height: 100vh;
  padding: 44px 40px 24px;
  background: radial-gradient(circle at 82% 15%, #17334F 0%, #071321 52%, #081420 100%);
  color: #FFFFFF;
  display: flex;
  flex-direction: column;
}

.back-to-dhanvo {
  position: absolute;
  top: 20px;
  left: 24px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid rgba(216,179,107,.5);
  border-radius: 7px;
  background: rgba(200,151,74,.04);
  color: rgba(255,255,255,.72);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.back-to-dhanvo:hover {
  color: #E7C98C;
  border-color: #C8974A;
}

.brand {
  color: #E7C98C !important;
  font-family:
    "Fraunces",
    Georgia,
    "Times New Roman",
    serif;
  font-weight: 700;
  letter-spacing: 0.5px;
  line-height: 1;
  text-transform: uppercase;
}

.sidebar-brand {
  margin-top: 24px;
  padding: 4px 7px 23px;
  border-bottom: 1px solid rgba(255,255,255,.1);
}

.sidebar-brand .brand {
  font-size: 26px;
  letter-spacing: 1px;
}

.sidebar-brand p {
  max-width: 235px;
  margin: 12px 0 0;
  color: rgba(255,255,255,.65);
  font-size: 12px;
  line-height: 1.6;
}

.sidebar-progress {
  position: relative;
  flex: 1;
  min-height: 0;
  padding-top: 23px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin: 0 6px 15px;
  color: rgba(255,255,255,.55);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .8px;
}

.progress-header strong {
  color: #E0B968;
}

.vertical-progress {
  position: absolute;
  left: 19px;
  top: 70px;
  bottom: 12px;
  width: 1px;
  background: rgba(255,255,255,.12);
}

.vertical-progress > div {
  width: 1px;
  background: #C8974A;
}

.sidebar-step {
  position: relative;
  width: 100%;
  min-height: 50px;
  margin-bottom: 2px;
  padding: 4px 7px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: rgba(255,255,255,.45);
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: left;
}

.sidebar-step:hover {
  background: rgba(200,151,74,.06);
}

.sidebar-step.active {
  background: rgba(200,151,74,.1);
  color: #FFFFFF;
}

.sidebar-step.completed {
  color: rgba(255,255,255,.72);
}

.step-circle {
  position: relative;
  z-index: 3;
  width: 27px;
  min-width: 27px;
  height: 27px;
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 50%;
  background: #071321;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
}

.sidebar-step.active .step-circle {
  border-color: #C8974A;
  background: #C8974A;
  color: #071321;
  font-weight: 800;
}

.sidebar-step.completed .step-circle {
  border-color: #E0B968;
  background: #E0B968;
  color: #071321;
}

.sidebar-step > span:last-child {
  font-size: 10.5px;
}

.sidebar-footer {
  padding: 15px 6px 0;
  border-top: 1px solid rgba(255,255,255,.1);
  color: rgba(255,255,255,.52);
  font-size: 9px;
}

.sidebar-footer span {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
}

.sidebar-footer svg {
  color: #C8974A;
}

.sidebar-footer small {
  font-size: 8px;
}

/* =========================================================
   MAIN
========================================================= */

.main-content {
  width: 64%;
  min-height: 100vh;
  margin-left: 0;
  background: #FFFFFF;
}

.content-wrapper {
  width: min(560px, calc(100% - 72px));
  margin: 0 auto;
  padding: 48px 0 30px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 30px;
  margin-bottom: 28px;
}

.eyebrow {
  color: #C8974A;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

.heading-row {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 8px;
}

.heading-row svg {
  color: #C8974A;
}

.heading-row h1 {
  margin: 0;
  font-family:
    "Fraunces",
    Georgia,
    "Times New Roman",
    serif;
  font-size: 34px;
  line-height: 1.15;
  letter-spacing: -0.6px;
}

.page-header p {
  margin: 8px 0 0;
  color: #64748B;
  font-size: 13px;
  line-height: 1.6;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 9px;
}

.secure-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  border-radius: 20px;
  background: rgba(29,111,100,.07);
  color: #1D6F64;
  font-size: 9px;
  font-weight: 700;
}

.signin-area {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.signin-area span {
  color: #7A8798;
  font-size: 10px;
}

.signin-area button {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: #C8974A;
  font-size: 10px;
  font-weight: 800;
}

/* =========================================================
   GENERAL
========================================================= */

.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  border: 1px solid rgba(10,25,41,.1);
  border-radius: 14px;
  background: #FFFFFF;
  box-shadow: 0 8px 28px rgba(7,19,33,.04);
  overflow: visible;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 17px 20px;
  border-bottom: 1px solid #EDF0F3;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 11px;
}

.section-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: rgba(200,151,74,.09);
  color: #C8974A;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-head h3 {
  margin: 0;
  font-size: 13px;
}

.card-head p {
  margin: 4px 0 0;
  color: #7A8798;
  font-size: 9.5px;
}

.card-body {
  padding: 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 15px;
}

.field label,
.send-otp-container label,
.verify-pan label {
  display: block;
  margin-bottom: 6px;
  color: #354354;
  font-size: 9.5px;
  font-weight: 700;
}

.field input,
.field select {
  width: 100%;
  height: 46px;
  border: 1px solid rgba(10,25,41,.1);
  border-radius: 9px;
  background: #FFFFFF;
  color: #071321;
  padding: 0 13px;
  outline: none;
  font-size: 12px;
}

.field input::placeholder {
  color: #A5AFBB;
}

.field input:focus,
.field select:focus,
.mobile-input:focus-within {
  border-color: #C8974A;
  box-shadow: 0 0 0 3px rgba(200,151,74,.08);
}

.info {
  margin-top: 16px;
  padding: 11px 13px;
  border: 1px solid rgba(200,151,74,.18);
  border-radius: 9px;
  background: rgba(200,151,74,.045);
  color: #657388;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 9.5px;
  line-height: 1.5;
}

.info svg {
  flex: 0 0 auto;
  color: #C8974A;
}

.primary-button {
  min-height: 46px;
  padding: 0 17px;
  border: 0;
  border-radius: 9px;
  background: #C8974A;
  color: #071321;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 10px;
  font-weight: 800;
  box-shadow: 0 6px 16px rgba(200,151,74,.15);
}

.primary-button:hover {
  background: #E0B968;
}

.primary-button:disabled {
  opacity: .6;
}

.primary-button.full {
  width: 100%;
  margin-top: 17px;
}

.outline-button {
  height: 46px;
  padding: 0 15px;
  border: 1px solid rgba(200,151,74,.5);
  border-radius: 9px;
  background: #FFFFFF;
  color: #071321;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 10px;
  font-weight: 800;
}

.outline-button:hover {
  background: rgba(200,151,74,.06);
}

.outline-button.compact {
  height: 37px;
  font-size: 9px;
}

.sub-heading {
  margin: 20px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #EDF0F3;
  font-size: 10.5px;
  font-weight: 800;
}

/* =========================================================
   STEP 1
========================================================= */

.verification-grid {
  display: grid;
  grid-template-columns:
    minmax(0,1fr)
    minmax(0,1fr)
    auto;
  gap: 15px;
  align-items: end;
}

.mobile-input {
  height: 46px;
  border: 1px solid #DCE2E9;
  border-radius: 9px;
  display: flex;
  overflow: hidden;
  background: #FFFFFF;
}

.mobile-input > span {
  min-width: 49px;
  padding: 0 11px;
  border-right: 1px solid #DCE2E9;
  background: #F5F7F9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.mobile-input input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  padding: 0 12px;
  font-size: 12px;
}

.otp-section {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #EDF0F3;
}

.otp-success {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 14px;
}

.otp-success > svg {
  color: #1D6F64;
}

.otp-success strong,
.otp-success span {
  display: block;
}

.otp-success strong {
  font-size: 11px;
}

.otp-success span {
  margin-top: 3px;
  color: #7A8798;
  font-size: 9px;
}

.otp-grid {
  display: grid;
  grid-template-columns:
    minmax(0,1fr)
    minmax(0,1fr);
  gap: 15px;
  align-items: end;
}

.signup-credential-panel {
  grid-column: 1 / -1;
  padding: 16px;
  border: 1px solid rgba(201,151,74,.25);
  border-radius: 10px;
  background: #FFFCF6;
}

.signup-credential-panel > div:first-child strong,
.signup-credential-panel > div:first-child span {
  display: block;
}

.signup-credential-panel > div:first-child strong {
  color: var(--dh-ink);
  font-size: 12px;
}

.signup-credential-panel > div:first-child span {
  margin-top: 4px;
  color: var(--dh-mist);
  font-size: 10px;
}

.signup-credential-options {
  display: flex;
  gap: 8px;
  margin: 13px 0;
}

.signup-credential-options button {
  padding: 8px 13px;
  border: 1px solid var(--dh-line);
  border-radius: 7px;
  background: #fff;
  color: var(--dh-slate);
  font-size: 10px;
  font-weight: 700;
}

.signup-credential-options button.active {
  border-color: var(--dh-gold);
  background: rgba(201,151,74,.1);
  color: var(--dh-ink);
}

.signup-credential-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 14px;
}

.signup-credential-fields .field {
  margin-bottom: 0;
}

.signup-credential-hint {
  margin: 8px 0 0;
  color: var(--dh-mist);
  font-size: 9px;
}

.resend-box {
  min-height: 46px;
  padding: 0 12px;
  border: 1px solid #E3E8ED;
  border-radius: 9px;
  background: #FAFBFC;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.resend-box span {
  color: #7A8798;
  font-size: 9px;
}

.resend-box strong {
  color: #657388;
  font-size: 9px;
}

.resend-box button {
  border: 0;
  background: transparent;
  color: #C8974A;
  font-size: 9px;
  font-weight: 800;
}

/* =========================================================
   STEP 2
========================================================= */

.pan-grid {
  display: grid;
  grid-template-columns:
    minmax(0,1fr)
    auto
    190px;
  gap: 14px;
  align-items: end;
}

.kyc-status-box {
  min-height: 46px;
  padding: 8px 12px;
  border: 1px solid #E3E8ED;
  border-radius: 9px;
  background: #FAFBFC;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.kyc-status-box > span {
  color: #8A96A6;
  font-size: 8px;
}

.kyc-status-box strong {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  font-size: 10px;
}

.kyc-status-box strong i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: block;
  background: #B3261E;
}

.status-green {
  color: #1D6F64;
}

.status-green i {
  background: #1D6F64 !important;
}

.status-red {
  color: #B3261E;
}

.status-orange {
  color: #B7791F;
}

.status-orange i {
  background: #B7791F !important;
}

.kyc-status-note {
  margin-top: 4px;
  color: #5B6472;
  font-size: 9px;
  line-height: 1.4;
}

.method-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.menu-container {
  position: relative;
}

.three-dot-button {
  width: 31px;
  height: 31px;
  border: 1px solid #DCE2E8;
  border-radius: 8px;
  background: #FFFFFF;
  color: #657388;
  display: flex;
  align-items: center;
  justify-content: center;
}

.three-dot-button:hover {
  color: #C8974A;
  border-color: #C8974A;
}

.method-menu {
  position: absolute;
  z-index: 40;
  top: 38px;
  right: 0;
  width: 180px;
  padding: 5px;
  border: 1px solid #E0E5EA;
  border-radius: 9px;
  background: #FFFFFF;
  box-shadow:
    0 12px 30px rgba(7,19,33,.13);
}

.method-menu button {
  width: 100%;
  min-height: 35px;
  padding: 0 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #354354;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 9.5px;
  text-align: left;
}

.method-menu button:hover {
  background: rgba(200,151,74,.07);
  color: #9E7131;
}

.method-menu button svg {
  color: #C8974A;
}

.selected-kyc {
  min-height: 63px;
  padding: 10px 12px;
  border: 1px solid rgba(200,151,74,.38);
  border-radius: 10px;
  background: rgba(200,151,74,.045);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.selected-kyc-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.selected-kyc-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(200,151,74,.1);
  color: #C8974A;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selected-kyc strong,
.selected-kyc span {
  display: block;
}

.selected-kyc strong {
  font-size: 11px;
}

.selected-kyc-left span {
  margin-top: 3px;
  color: #7A8798;
  font-size: 8.5px;
}

.default-pill {
  padding: 4px 7px;
  border-radius: 20px;
  background: #C8974A;
  color: #071321 !important;
  font-size: 8px !important;
  font-weight: 800;
}

.conditional-box {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid #EDE4D4;
  border-radius: 10px;
  background: #FBFAF7;
}

.account-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.account-heading small {
  color: #8A96A6;
  font-size: 8.5px;
  font-weight: 500;
}

.account-selector {
  width: 100%;
  min-height: 58px;
  padding: 0 14px;
  border: 1px solid #C8974A;
  border-radius: 10px;
  background: rgba(200,151,74,.045);
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
}

.account-selector > div > span,
.account-selector > div > strong {
  display: block;
}

.account-selector > div > span {
  color: #8A96A6;
  font-size: 8px;
}

.account-selector > div > strong {
  margin-top: 4px;
  font-size: 12px;
}

.selector-arrow {
  color: #C8974A;
  font-size: 19px;
}

.account-type-grid {
  display: grid;
  grid-template-columns:
    repeat(3,minmax(0,1fr));
  gap: 10px;
  margin-top: 10px;
}

.radio-card {
  min-height: 65px;
  padding: 11px;
  border: 1px solid #E0E5EA;
  border-radius: 10px;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: left;
}

.radio-card:hover {
  border-color: #C8974A;
}

.radio-card.selected {
  border-color: #C8974A;
  background: rgba(200,151,74,.05);
}

.radio {
  width: 17px;
  height: 17px;
  min-width: 17px;
  border: 1px solid #AAB5C2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radio.checked {
  border-color: #C8974A;
}

.radio.checked span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #C8974A;
}

.radio-content strong,
.radio-content small {
  display: block;
}

.radio-content strong {
  font-size: 10.5px;
}

.radio-content small {
  margin-top: 3px;
  color: #7A8798;
  font-size: 8.5px;
}

.holding-section {
  overflow: hidden;
}

.choice-grid {
  display: grid;
  grid-template-columns:
    repeat(2,minmax(0,1fr));
  gap: 10px;
}

.holder-box {
  padding: 15px;
  border: 1px solid #E5E9ED;
  border-radius: 10px;
  background: #FCFDFC;
}

.holder-header,
.bank-header {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 15px;
}

.holder-header > div,
.bank-header > div {
  flex: 1;
}

.holder-header strong,
.bank-header strong {
  font-size: 11px;
}

.holder-header span {
  display: block;
  margin-top: 3px;
  color: #7A8798;
  font-size: 8.5px;
}

.icon-danger {
  width: 31px;
  height: 31px;
  border: 0;
  border-radius: 7px;
  background: rgba(179,38,30,.05);
  color: #B3261E;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-danger:hover {
  background: rgba(179,38,30,.1);
}

.add-button {
  min-height: 40px;
  margin-top: 13px;
  padding: 0 13px;
  border: 0;
  border-radius: 8px;
  background: #071321;
  color: #FFFFFF;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 9.5px;
  font-weight: 800;
}

.add-button:hover {
  background: #102237;
}

.divider {
  height: 1px;
  margin: 17px 0;
  background: #EDF0F3;
}

/* =========================================================
   STEP 4
========================================================= */

.bank-box {
  padding: 15px;
  margin-bottom: 13px;
  border: 1px solid #E5E9ED;
  border-radius: 10px;
  background: #FCFDFC;
}

.bank-header {
  justify-content: space-between;
}

.bank-header > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.primary-badge {
  padding: 4px 7px;
  border-radius: 20px;
  background: rgba(29,111,100,.08);
  color: #1D6F64;
  font-size: 7.5px;
  font-weight: 800;
}

.bank-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 15px;
  padding-top: 13px;
  border-top: 1px solid #EDF0F2;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #526074;
  font-size: 9px;
}

.checkbox-label input {
  accent-color: #C8974A;
}

/* =========================================================
   UPLOAD
========================================================= */

.upload-box {
  min-height: 78px;
  padding: 12px;
  border: 1px dashed #CCD4DD;
  border-radius: 10px;
  background: #FCFDFC;
  display: flex;
  align-items: center;
  gap: 10px;
}

.upload-icon {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: rgba(200,151,74,.08);
  color: #C8974A;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-content {
  flex: 1;
}

.upload-content strong,
.upload-content span {
  display: block;
}

.upload-content strong {
  font-size: 10px;
}

.upload-content span {
  margin-top: 4px;
  color: #7A8798;
  font-size: 8.5px;
}

.upload-button {
  min-height: 32px;
  padding: 0 11px;
  border: 1px solid #D8DEE5;
  border-radius: 7px;
  background: #FFFFFF;
  color: #071321;
  font-size: 8.5px;
  font-weight: 800;
}

.upload-button:hover {
  border-color: #C8974A;
}

/* =========================================================
   NOMINEE
========================================================= */

.allocation-box {
  padding: 13px;
  border: 1px solid #E4E8EC;
  border-radius: 10px;
  background: #FFFFFF;
}

.allocation-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.allocation-top span {
  color: #657388;
  font-size: 9px;
}

.allocation-top strong {
  color: #C8974A;
  font-size: 14px;
}

.allocation-track {
  height: 5px;
  margin-top: 9px;
  border-radius: 20px;
  background: #EEF1F4;
  overflow: hidden;
}

.allocation-track > div {
  height: 100%;
  background: #C8974A;
  transition: width .25s ease;
}

.allocation-box small {
  display: block;
  margin-top: 7px;
  color: #8A96A6;
  font-size: 8px;
}

.auth-options {
  width: max-content;
  max-width: 100%;
  padding: 3px;
  border-radius: 8px;
  background: #F2F4F6;
  display: flex;
}

.auth-options button {
  min-height: 30px;
  padding: 0 13px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #687588;
  font-size: 8.5px;
  font-weight: 700;
}

.auth-options .auth-method-button {
  min-width: 118px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  white-space: nowrap;
  line-height: 1;
}

.auth-method-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.auth-method-icon svg {
  display: block;
  flex: 0 0 auto;
}

.auth-options button.auth-active {
  background: #FFFFFF;
  color: #071321;
  box-shadow:
    0 2px 7px rgba(7,19,33,.07);
}

.nominee-otp-item {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid #E3E7EB;
  border-radius: 12px;
  background: #FAFBFC;
}

.nominee-auth-message {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 14px;
  padding: 11px 13px;
  border: 1px solid transparent;
  border-radius: 10px;
  font-size: 10px;
  line-height: 1.5;
}

.nominee-auth-message svg {
  flex: 0 0 auto;
  margin-top: 1px;
}

.nominee-auth-message-success {
  border-color: rgba(29,111,100,.18);
  background: rgba(29,111,100,.06);
  color: #1D6F64;
}

.nominee-auth-message-error {
  border-color: rgba(179,38,30,.18);
  background: rgba(179,38,30,.05);
  color: #B3261E;
}

.nominee-auth-message-info {
  border-color: rgba(201,151,74,.2);
  background: rgba(201,151,74,.06);
  color: #657388;
}

.nominee-otp-heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-bottom: 10px;
}

.nominee-otp-heading strong {
  color: #0A1929;
  font-size: 11px;
}

.nominee-otp-heading > span {
  min-width: 0;
  color: #657388;
  font-size: 10px;
  overflow-wrap: anywhere;
}

.nominee-otp-verified {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  color: #1D6F64;
  font-size: 9px;
  font-weight: 800;
}

.nominee-otp-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
}

.nominee-otp-controls input {
  width: 100%;
  min-width: 0;
  height: 46px;
  padding: 0 13px;
  border: 1px solid #DCE2E9;
  border-radius: 9px;
  outline: none;
  background: #FFFFFF;
  color: #0A1929;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 2px;
}

.nominee-otp-controls input:focus {
  border-color: #C8974A;
  box-shadow: 0 0 0 3px rgba(201,151,74,.10);
}

.nominee-otp-controls input:disabled {
  background: #F1F3F5;
  color: #687588;
}

.nominee-otp-controls .outline-button {
  min-width: 126px;
  white-space: nowrap;
}

.nominee-otp-resend {
  min-height: 30px;
  margin: 7px 0 0 auto;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: #9E7131;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  font-size: 9px;
  font-weight: 800;
}

.nominee-otp-resend:disabled {
  color: #8792A0;
}

/* =========================================================
   REVIEW
========================================================= */

.review-card {
  overflow: hidden;
  border: 1px solid #E3E7EB;
  border-radius: 11px;
  background: #FFFFFF;
}

.review-head {
  min-height: 53px;
  padding: 11px 15px;
  border-bottom: 1px solid #EDF0F3;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.review-head > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.review-head svg {
  color: #C8974A;
}

.review-head h3 {
  margin: 0;
  font-size: 11.5px;
}

.review-head button {
  border: 0;
  background: transparent;
  color: #C8974A;
  font-size: 8.5px;
  font-weight: 800;
}

.review-grid {
  display: grid;
  grid-template-columns:
    repeat(2,minmax(0,1fr));
}

.review-row {
  min-width: 0;
  padding: 9px 15px;
  border-bottom: 1px solid #F0F2F4;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.review-row span {
  color: #8792A0;
  font-size: 8px;
}

.review-row strong {
  overflow-wrap: anywhere;
  font-size: 9.5px;
}

/* =========================================================
   DECLARATION
========================================================= */

.declaration-list {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.declaration-list label {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  color: #4B596B;
  font-size: 9.5px;
  line-height: 1.6;
}

.declaration-list input {
  display: none;
}

.custom-check {
  width: 18px;
  height: 18px;
  min-width: 18px;
  border: 1px solid #C9D1DA;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.declaration-list input:checked + .custom-check {
  border-color: #C8974A;
  background: #C8974A;
  color: #FFFFFF;
}

.final-verification {
  padding: 14px;
  border: 1px solid #EDE4D4;
  border-radius: 10px;
  background: #FBFAF7;
  display: flex;
  align-items: center;
  gap: 12px;
}

.final-icon {
  width: 43px;
  height: 43px;
  min-width: 43px;
  border-radius: 10px;
  background: #071321;
  color: #C8974A;
  display: flex;
  align-items: center;
  justify-content: center;
}

.final-copy {
  flex: 1;
}

.final-copy strong,
.final-copy span,
.final-copy p {
  display: block;
}

.final-copy strong {
  font-size: 11px;
}

.final-copy span {
  margin-top: 4px;
  color: #657388;
  font-size: 8.5px;
}

.final-copy span b {
  color: #C8974A;
}

.final-copy p {
  margin: 5px 0 0;
  color: #7A8798;
  font-size: 8.5px;
  line-height: 1.45;
}

.ekyc-verification-link {
  display: block;
  max-width: 100%;
  margin-top: 6px;
  color: #9E7131;
  font-size: 9px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* =========================================================
   NAVIGATION
========================================================= */

.navigation {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.back-button {
  min-height: 44px;
  padding: 0 15px;
  border: 1px solid #D9DFE5;
  border-radius: 9px;
  background: transparent;
  color: #657388;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 9.5px;
  font-weight: 800;
}

.back-button:hover {
  border-color: #C8974A;
  color: #C8974A;
}

.back-button:disabled {
  opacity: .45;
}

/* =========================================================
   FOOTER
========================================================= */

.footer {
  margin-top: 27px;
  padding-top: 15px;
  border-top: 1px solid #E3E7EB;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #8A96A6;
  font-size: 8px;
}

.footer strong {
  color: #C8974A;
}

/* =========================================================
   MOBILE TOP
========================================================= */

.mobile-top,
.mobile-brand-row,
.mobile-progress,
.mobile-intro {
  display: none;
}

/* =========================================================
   SUCCESS
========================================================= */

.success-page {
  width: 100%;
  min-height: 100vh;
  padding: 20px;
  background: #071321;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-card {
  width: min(520px,100%);
  padding: 38px;
  border-radius: 20px;
  background: #FFFFFF;
  text-align: center;
  box-shadow:
    0 25px 70px rgba(0,0,0,.25);
}

.success-logo {
  color: #C8974A !important;
  font-family:
    Georgia,
    "Times New Roman",
    serif;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 2.5px;
}

.success-icon {
  width: 82px;
  height: 82px;
  margin: 25px auto 17px;
  border-radius: 50%;
  background: rgba(29,111,100,.08);
  color: #1D6F64;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-label {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 20px;
  background: rgba(29,111,100,.07);
  color: #1D6F64;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .8px;
}

.success-card h1 {
  max-width: 420px;
  margin: 14px auto 8px;
  font-family:
    Georgia,
    "Times New Roman",
    serif;
  font-size: 28px;
  line-height: 1.2;
}

.success-card > p {
  margin: 0;
  color: #657388;
  font-size: 10.5px;
  line-height: 1.6;
}

.application-id {
  margin-top: 23px;
  padding: 14px;
  border: 1px solid #EDE4D4;
  border-radius: 10px;
  background: #FBFAF7;
}

.application-id span,
.application-id strong {
  display: block;
}

.application-id span {
  color: #8A96A6;
  font-size: 8px;
  text-transform: uppercase;
}

.application-id strong {
  margin-top: 4px;
  color: #C8974A;
  font-size: 18px;
  letter-spacing: 1px;
}

.application-status {
  margin-top: 10px;
  padding: 13px;
  border: 1px solid #E5E9ED;
  border-radius: 10px;
  display: flex;
  align-items: flex-start;
  gap: 9px;
  text-align: left;
}

.application-status > i {
  width: 7px;
  height: 7px;
  min-width: 7px;
  margin-top: 4px;
  border-radius: 50%;
  background: #D6A51F;
}

.application-status strong {
  font-size: 10px;
}

.application-status p {
  margin: 3px 0 0;
  color: #7A8798;
  font-size: 8.5px;
}

/* =========================================================
   ANIMATION
========================================================= */

.spin {
  animation:
    spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* =========================================================
   TABLET
========================================================= */

@media (max-width: 1100px) {
  .sidebar {
    width: 250px;
  }

  .main-content {
    width: calc(100% - 250px);
    margin-left: 250px;
  }

  .content-wrapper {
    width: calc(100% - 40px);
  }

  .pan-grid {
    grid-template-columns:
      minmax(0,1fr)
      auto;
  }

  .kyc-status-box {
    grid-column: 1 / -1;
  }
}

/* =========================================================
   MOBILE
========================================================= */

@media (max-width: 800px) {
  .sidebar {
    display: none;
  }

  .main-content {
    width: 100%;
    margin-left: 0;
  }

  .mobile-top {
    min-height: 46px;
    padding: 8px 13px;
    background: #071321;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mobile-top button {
    min-height: 30px;
    padding: 0 9px;
    border: 1px solid rgba(200,151,74,.25);
    border-radius: 7px;
    background: transparent;
    color: rgba(255,255,255,.72);
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 8px;
    font-weight: 700;
  }

  .mobile-top button:last-child {
    border-color: transparent;
    color: #C8974A;
  }

  .mobile-brand-row {
    min-height: 57px;
    padding: 0 15px;
    background: #071321;
    color: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mobile-brand-row .brand {
    font-size: 23px;
  }

  .mobile-brand-row > span {
    color: rgba(255,255,255,.6);
    font-size: 8.5px;
  }

  .mobile-progress {
    height: 3px;
    background: rgba(200,151,74,.12);
    display: block;
  }

  .mobile-progress > div {
    height: 100%;
    background: #C8974A;
  }

  .mobile-intro {
    display: block;
    padding: 11px 15px 10px;
    background: #0B1A2B;
    color: rgba(255,255,255,.72);
  }

  .mobile-intro p {
    margin: 0;
  }

  .mobile-values {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .mobile-values span {
    padding: 4px 7px;
    border: 1px solid rgba(200,151,74,.22);
    border-radius: 999px;
    color: #E0B968;
    font-size: 8px;
    font-weight: 700;
  }

  .content-wrapper {
    width: calc(100% - 24px);
    padding: 25px 0;
  }

  .page-header {
    display: block;
    margin-bottom: 20px;
  }

  .heading-row h1 {
    font-size: 27px;
  }

  .page-header p {
    font-size: 9.5px;
  }

  .header-right {
    margin-top: 11px;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .verification-grid,
  .pan-grid,
  .grid,
  .choice-grid,
  .account-type-grid,
  .otp-grid,
  .review-grid {
    grid-template-columns: 1fr;
  }

  .signup-credential-panel {
    grid-column: auto;
  }

  .signup-credential-fields {
    grid-template-columns: 1fr;
  }

  .card-head,
  .card-body {
    padding: 15px;
  }

  .card-head h3 {
    font-size: 12px;
  }

  .card-head p {
    font-size: 8.5px;
  }

  .bank-actions,
  .final-verification {
    align-items: flex-start;
    flex-direction: column;
  }

  .outline-button.compact,
  .final-verification .primary-button {
    width: 100%;
  }

  .auth-options {
    width: 100%;
  }

  .auth-options button {
    flex: 1;
    padding: 0 8px;
  }

  .nominee-otp-item {
    padding: 12px;
  }

  .nominee-otp-controls {
    grid-template-columns: minmax(0, 1fr);
  }

  .nominee-otp-controls .outline-button {
    width: 100%;
  }

  .upload-box {
    flex-wrap: wrap;
  }

  .upload-content {
    min-width: 0;
  }

  .upload-button {
    width: 100%;
  }

  .navigation {
    position: sticky;
    z-index: 30;
    bottom: 0;
    margin:
      20px -12px
      -25px;
    padding: 10px 12px;
    background: rgba(250,248,243,.94);
    backdrop-filter: blur(10px);
  }

  .navigation > * {
    flex: 1;
    justify-content: center;
  }

  .footer {
    flex-direction: column;
    align-items: center;
    padding-bottom: 10px;
  }

  .success-card {
    padding: 28px 19px;
  }

  .success-card h1 {
    font-size: 24px;
  }
}

/* =========================================================
   SMALL MOBILE
========================================================= */

@media (max-width: 450px) {
  .content-wrapper {
    width: calc(100% - 18px);
  }

  .page-header p {
    max-width: 320px;
  }

  .signin-area span {
    font-size: 8px;
  }

  .signin-area button {
    font-size: 8.5px;
  }

  .success-card {
    border-radius: 15px;
  }
}


/* DHANVO PREMIUM LANDING-PAGE STYLE OVERRIDES */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&display=swap');

:root{--dh-ink:#0A1929;--dh-ink-2:#10233B;--dh-paper:#FBF9F4;--dh-gold:#C9974A;--dh-gold-soft:#E7C98C;--dh-teal:#1D6F64;--dh-slate:#45526A;--dh-mist:#9FB3C8;--dh-line:rgba(10,25,41,.10)}
html,body,#root{background:var(--dh-paper)}
body{font-family:'Manrope',system-ui,sans-serif;color:var(--dh-ink);background:var(--dh-paper)}
.open-account-page{min-height:100vh;background:var(--dh-paper);color:var(--dh-ink)}
.sidebar{width:36%;flex:0 0 36%;padding:78px 22px 22px;background:radial-gradient(circle at 75% 10%,#17334F 0%,var(--dh-ink) 48%,#081420 100%);border-right:1px solid rgba(231,201,140,.12)}
.back-to-dhanvo{top:20px;left:22px;height:34px;padding:0 12px;border:1px solid rgba(231,201,140,.25);border-radius:999px;background:rgba(15,35,56,.72);color:rgba(251,249,244,.78);font-size:10px}.back-to-dhanvo:hover{color:var(--dh-gold-soft);border-color:var(--dh-gold)}
.brand{color:var(--dh-gold)!important;font-family:'Fraunces',Georgia,serif;letter-spacing:3px;font-weight:700}.sidebar-brand{padding:4px 8px 24px;border-bottom-color:rgba(231,201,140,.14)}.sidebar-brand .brand{font-size:32px}.sidebar-brand p{max-width:225px;margin-top:12px;color:var(--dh-mist);font-size:10.5px;line-height:1.65}
.progress-header{color:rgba(251,249,244,.55);font-size:9.5px}.progress-header strong{color:var(--dh-gold-soft)}.vertical-progress{background:rgba(159,179,200,.16)}.vertical-progress>div{background:var(--dh-gold)}
.sidebar-step{min-height:52px;margin-bottom:4px;padding:5px 8px;border-radius:12px;color:rgba(251,249,244,.45);gap:10px}.sidebar-step:hover{background:rgba(231,201,140,.07)}.sidebar-step.active{background:rgba(231,201,140,.11);color:var(--dh-paper);box-shadow:inset 0 0 0 1px rgba(231,201,140,.10)}.sidebar-step.completed{color:rgba(251,249,244,.76)}.step-circle{width:29px;min-width:29px;height:29px;border-color:rgba(251,249,244,.20);background:var(--dh-ink)}.sidebar-step.active .step-circle{background:var(--dh-gold);border-color:var(--dh-gold)}.sidebar-step.completed .step-circle{background:var(--dh-gold-soft);border-color:var(--dh-gold-soft)}.sidebar-step>span:last-child{font-size:10.5px;font-weight:600}.sidebar-footer{border-top-color:rgba(231,201,140,.14);color:rgba(251,249,244,.42)}.sidebar-footer svg{color:var(--dh-gold)}
.main-content{flex:1 1 68%;width:68%;min-width:0;margin-left:0}.content-wrapper{width:min(1280px,calc(100% - 20px));padding:64px 0 38px}
.page-header{margin-bottom:34px;gap:36px}.eyebrow{color:var(--dh-teal);font-size:10px;letter-spacing:.12em;font-weight:800}.heading-row{gap:11px;margin-top:10px}.heading-row svg{color:var(--dh-gold)}.heading-row h1{font-family:'Fraunces',Georgia,serif;font-size:clamp(2rem,3.2vw,2.65rem);line-height:1.1;font-weight:600;letter-spacing:-.015em}.page-header p{color:var(--dh-slate);font-size:13.5px;line-height:1.65}.secure-pill{padding:7px 12px;border:1px solid rgba(29,111,100,.12);border-radius:999px;background:rgba(29,111,100,.07);color:var(--dh-teal);font-size:10px}.signin-area span{color:#7A8798;font-size:10px}.signin-area button{color:var(--dh-gold);font-size:10.5px}
.stack{gap:18px}.card{border:1px solid var(--dh-line);border-radius:18px;background:#fff;box-shadow:0 16px 36px -24px rgba(10,25,41,.28)}.card-head{padding:20px 22px;border-bottom:1px solid var(--dh-line)}.section-title{gap:12px}.section-icon{width:40px;height:40px;border-radius:11px;background:rgba(201,151,74,.09);color:var(--dh-gold)}.card-head h3{font-size:14px;font-weight:800}.card-head p{color:#7A8798;font-size:10px}.card-body{padding:22px}
.field label,.send-otp-container label,.verify-pan label{color:#354354;font-size:10px;font-weight:800}.field input,.field select{height:48px;border:1px solid #DCE2E9;border-radius:10px;background:#fff;color:var(--dh-ink);font-size:12.5px;transition:border-color .15s ease,box-shadow .15s ease}.field input:focus,.field select:focus,.mobile-input:focus-within{border-color:var(--dh-gold);box-shadow:0 0 0 3px rgba(201,151,74,.10)}.field input::placeholder{color:#A5AFBB}
.primary-button{min-height:48px;padding:0 20px;border-radius:999px;background:var(--dh-gold);color:var(--dh-ink);font-size:10.5px;box-shadow:0 8px 20px -8px rgba(201,151,74,.55)}.primary-button:hover{background:var(--dh-gold-soft);transform:translateY(-1px)}.outline-button{height:48px;border-radius:999px;border-color:rgba(201,151,74,.45);background:#fff;font-size:10px}.outline-button:hover{background:rgba(201,151,74,.06);border-color:var(--dh-gold)}.send-otp-container .send-otp-button{border:1px solid var(--dh-gold);background:var(--dh-gold);color:var(--dh-ink);font-weight:800;box-shadow:0 8px 20px -8px rgba(201,151,74,.55)}.send-otp-container .send-otp-button:hover{border-color:var(--dh-gold-soft);background:var(--dh-gold-soft)}.back-button{min-height:46px;border-radius:999px;background:transparent;font-size:10px}.back-button:hover{border-color:var(--dh-gold);color:var(--dh-gold)}
.info{border-color:rgba(201,151,74,.18);border-radius:11px;background:rgba(201,151,74,.045);color:var(--dh-slate);font-size:10px}.info svg{color:var(--dh-gold)}.sub-heading{font-size:11px;border-bottom-color:var(--dh-line)}
.radio-card{min-height:72px;border:1px solid #E0E5EA;border-radius:12px;background:#fff}.radio-card:hover,.radio-card.selected{border-color:var(--dh-gold)}.radio-card.selected{background:rgba(201,151,74,.045)}.radio.checked{border-color:var(--dh-gold)}.radio.checked span{background:var(--dh-gold)}.radio-content strong{font-size:11px}.radio-content small{font-size:9px}.account-selector{min-height:62px;border-color:var(--dh-gold);border-radius:12px;background:rgba(201,151,74,.045)}.selector-arrow{color:var(--dh-gold)}.selected-kyc{min-height:68px;border-color:rgba(201,151,74,.38);border-radius:12px;background:rgba(201,151,74,.045)}.default-pill{background:var(--dh-gold)}
.holder-box,.bank-box{border-color:#E3E7EB;border-radius:12px;background:#FCFDFC}.add-button{min-height:42px;border-radius:999px;background:var(--dh-ink);font-size:9.5px}.add-button:hover{background:var(--dh-ink-2)}.upload-box{border-radius:12px;background:#FCFDFC}.upload-icon{border-radius:10px;color:var(--dh-gold)}.upload-button{border-radius:999px}.upload-button:hover{border-color:var(--dh-gold)}
.primary-badge{background:rgba(29,111,100,.08);color:var(--dh-teal)}.allocation-top strong,.auth-options button.auth-active{color:var(--dh-gold)}.allocation-track>div{background:var(--dh-gold)}.auth-options{background:#F2F4F6;border-radius:999px}.auth-options button{border-radius:999px}.auth-options button.auth-active{background:#fff}
.final-verification{border:1px solid rgba(201,151,74,.18);border-radius:16px;background:linear-gradient(135deg,rgba(201,151,74,.055),rgba(29,111,100,.025))}.final-icon{border-radius:12px;background:rgba(201,151,74,.10);color:var(--dh-gold)}.final-copy strong{font-size:12px}.final-copy span,.final-copy p{font-size:9px;color:var(--dh-slate)}.navigation{margin-top:22px}.footer{border-top-color:var(--dh-line);font-size:8.5px}.footer strong{color:var(--dh-gold)}
.success-page{background:radial-gradient(circle at 78% 15%,#17334F 0%,var(--dh-ink) 55%,#081420 100%)}.success-card{border:1px solid rgba(231,201,140,.18);border-radius:22px;box-shadow:0 28px 70px -35px rgba(0,0,0,.7)}.success-logo{color:var(--dh-gold)!important;font-family:'Fraunces',Georgia,serif}.success-icon{background:rgba(29,111,100,.08);color:var(--dh-teal)}.success-label{background:rgba(29,111,100,.07);color:var(--dh-teal)}.success-card h1{font-family:'Fraunces',Georgia,serif;font-weight:600}.application-id{border-color:#EDE4D4;border-radius:12px;background:var(--dh-paper)}.application-id strong{color:var(--dh-gold)}
@media(max-width:1100px){.sidebar{width:32%;flex-basis:32%}.main-content{width:68%;margin-left:0}}
@media(max-width:800px){.main-content{width:100%;margin-left:0}.mobile-top,.mobile-brand-row{background:var(--dh-ink)}.mobile-top button{border-radius:999px}.mobile-brand-row .brand{font-family:'Fraunces',Georgia,serif}.mobile-intro{padding:0 15px 13px;background:var(--dh-ink);color:var(--dh-mist)}.mobile-intro p{max-width:440px;margin:0 0 9px;font-size:11px;line-height:1.55}.mobile-intro span{display:flex;align-items:center;gap:6px;color:var(--dh-gold-soft);font-size:9px;font-weight:700;letter-spacing:.04em}.content-wrapper{width:calc(100% - 30px);padding-top:30px}.heading-row h1{font-size:30px}.card{border-radius:16px}.card-head,.card-body{padding:17px}.navigation{background:rgba(251,249,244,.94);border-top:1px solid rgba(10,25,41,.08)}}

/* Reference-matched split signup composition */
.open-account-page{display:flex;gap:0}
.sidebar{box-sizing:border-box;position:sticky;top:0;width:36%;height:100vh;min-height:100vh;flex:0 0 36%;padding:44px 40px 24px}
.back-to-dhanvo{display:none}
.sidebar-brand{margin:0;padding:0;border:0}
.sidebar-brand .brand{font-size:26px;letter-spacing:.5px}
.sidebar-eyebrow{display:block;margin-top:40px;color:var(--dh-gold-soft);font-size:11px;font-weight:700;letter-spacing:1.6px}
.sidebar-headline{max-width:420px;margin:13px 0 14px;color:#fff;font-family:'Fraunces',Georgia,serif;font-size:36px;font-weight:600;line-height:1.12;letter-spacing:-1.2px}
.sidebar-brand p{max-width:400px;margin:0;color:#CBD5DF;font-size:13.5px;line-height:1.65}
.sidebar-benefits{display:grid;gap:14px;margin-top:32px}
.sidebar-benefit{display:flex;align-items:flex-start;gap:11px}
.benefit-check{width:21px;height:21px;flex:0 0 21px;border:1px solid rgba(216,179,107,.5);border-radius:50%;display:grid;place-items:center;color:var(--dh-gold-soft);font-size:11px}
.sidebar-benefit strong{display:block;color:#fff;font-size:13px;font-weight:600;line-height:1.5}
.sidebar-benefit strong b{color:var(--dh-gold-soft)}
.sidebar-benefit p{margin:4px 0 0;color:#AEBBC8;font-size:12px;line-height:1.5}
.sidebar-progress{display:none}
.sidebar-footer{margin-top:auto;padding:24px 0 0;border:0;color:#8FA0B0;font-size:10.5px;line-height:1.6}
.sidebar-footer strong{color:var(--dh-gold-soft)}
.sidebar-footer p{margin:0;color:#8FA0B0;font-size:10.5px;line-height:1.6}
.main-content{box-sizing:border-box;width:64%;flex:0 0 64%;min-width:0;margin-left:0;background:#fff}
.content-wrapper{width:min(760px,calc(100% - 72px));padding:48px 0 30px}
.signup-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:30px;color:var(--dh-mist);font-size:12px}
.onboarding-secure{display:flex;align-items:center;gap:7px}
.onboarding-secure svg{color:#AAB4BE}
.signup-step-track{display:flex;gap:7px;margin-bottom:34px}
.signup-step-segment{height:4px;flex:1;border-radius:10px;background:#E7E5DF}
.signup-step-segment.current{background:var(--dh-gold)}
.signup-step-segment.done{background:#79A893}
.page-header{margin-bottom:28px;gap:20px}
.page-header .eyebrow{display:none}
.heading-row{margin:0}
.heading-row svg{display:none}
.heading-row h1{font-size:34px;line-height:1.15;letter-spacing:-.6px}
.page-header p{margin:9px 0 0;color:var(--dh-slate);font-size:14px;line-height:1.65}
.header-right{display:none}
.step-one .card{overflow:visible;border:0;border-radius:0;background:transparent;box-shadow:none}
.step-one .card-head{display:none}
.step-one .card-body{padding:0}
.step-one .verification-grid{grid-template-columns:1fr;gap:0;border-bottom:1px solid var(--dh-line);padding-bottom:20px}
.step-one .field{margin-bottom:18px}
.step-one .field label{margin-bottom:8px;color:var(--dh-ink);font-size:12px;font-weight:700}
.step-one .field input,.step-one .mobile-input{height:49px;border-radius:8px}
.step-one .mobile-input>span{min-width:49px;background:#F4F1E9;color:var(--dh-slate);font-size:13px}
.step-one .mobile-input input{font-size:14px}
.step-one .send-otp-container{display:flex;justify-content:flex-end;margin-top:2px}
.step-one .send-otp-container label{display:none}
.step-one .send-otp-button{width:150px;height:49px;border:1px solid var(--dh-gold);border-radius:8px;background:var(--dh-gold);color:var(--dh-ink);font-size:12.5px;font-weight:800;box-shadow:0 8px 20px -8px rgba(201,151,74,.55)}
.step-one .send-otp-button:hover{border-color:var(--dh-gold-soft);background:var(--dh-gold-soft)}
.step-one-navigation{display:none}
.signup-login{margin-top:25px;text-align:center;color:var(--dh-mist);font-size:12px}
.signup-login button{padding:0;border:0;background:transparent;color:var(--dh-gold);font-weight:700}
.footer{display:none}
@media(max-width:900px){
  .sidebar{display:none}
  .main-content{width:100%;flex-basis:100%}
  .mobile-top{display:none}
  .mobile-brand-row{min-height:0;display:flex;justify-content:flex-start;padding:26px 22px 0;background:var(--dh-ink)}
  .mobile-brand-row .brand{font-size:26px;letter-spacing:.5px}
  .mobile-brand-row>span{display:none}
  .mobile-intro{display:block;padding:1px 22px 24px;background:var(--dh-ink);color:var(--dh-mist)}
  .mobile-eyebrow{display:block!important;margin-top:24px;color:var(--dh-gold-soft)!important;font-size:10px!important;font-weight:700;letter-spacing:1.4px}
  .mobile-intro h1{max-width:420px;margin:11px 0 10px;color:#fff;font-family:'Fraunces',Georgia,serif;font-size:30px;font-weight:600;line-height:1.12;letter-spacing:-.8px}
  .mobile-intro p{max-width:500px;margin:0 0 14px;color:#CBD5DF;font-size:13px;line-height:1.65}
  .mobile-intro .mobile-values{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
  .mobile-intro .mobile-values span{display:inline-flex;padding:4px 7px;border:1px solid rgba(216,179,107,.35);border-radius:999px;color:var(--dh-gold-soft);font-size:8px;font-weight:700}
  .mobile-trust-copy{display:grid;gap:5px;margin:0 0 14px}
  .mobile-trust-copy p{margin:0;color:#AEBBC8;font-size:10px;line-height:1.5}
  .mobile-trust-copy strong{color:var(--dh-gold-soft);font-weight:700}
  .mobile-intro>span:last-child{display:flex;align-items:center;gap:6px;color:var(--dh-gold-soft);font-size:9px;font-weight:700}
  .mobile-progress{display:none}
  .content-wrapper{width:min(560px,calc(100% - 40px));padding:28px 0 36px}
  .signup-topbar{margin-bottom:22px}
  .signup-step-track{margin-bottom:27px}
  .page-header{display:block;margin-bottom:24px}
  .heading-row h1{font-size:30px}
  .header-right{display:none}
  .step-one .card-head,.step-one .card-body{padding:0}
}
@media(max-width:480px){
  .mobile-brand-row{padding:23px 22px 0}
  .mobile-intro{padding:1px 22px 22px}
  .mobile-intro h1{font-size:27px}
  .content-wrapper{width:calc(100% - 36px);padding-top:25px}
  .signup-step-track{gap:5px}
  .step-one .verification-grid{grid-template-columns:minmax(0,1fr)}
  .step-one .send-otp-button{width:100%}
}
`;

export default OpenAccount;