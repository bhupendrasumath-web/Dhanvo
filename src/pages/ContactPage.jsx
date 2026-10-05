import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  Send,
  Clock,
  CheckCircle2,
  Headphones,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";

const initialFormData = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

const contactInfo = [
  {
    icon: Phone,
    title: "Phone",
    details: ["+91 99771-80801"],
    description: "Mon-Fri from 9am to 4pm",
  },
  {
    icon: Mail,
    title: "Email",
    details: ["support@dhanvo.in"],
    description: "We reply within 24 hours",
  },
  {
    icon: Clock,
    title: "Working Hours",
    details: ["Monday - Friday: 9:00 AM - 4:00 PM", "Saturday: 10:00 AM - 2:00 PM"],
    description: "Closed on Sundays & Holidays",
  },
];

const subjects = [
  "General Inquiry",
  "Account Related",
  "Technical Support",
  "Partnership Inquiry",
  "Feedback/Suggestions",
  "Complaint",
  "Other",
];

const ContactPage = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/contact", formData);

      if (response.data.success) {
        toast.success("Message sent successfully! We'll get back to you soon.");
        setSubmitted(true);
        setFormData(initialFormData);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="ctc-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap');

        .ctc-root {
          --ink: #0A1929;
          --ink-2: #10233b;
          --paper: #FBF9F4;
          --gold: #C9974A;
          --gold-soft: #E7C98C;
          --teal: #1D6F64;
          --slate: #45526A;
          --mist: #9FB3C8;
          --line: rgba(10, 25, 41, 0.10);
          min-height: 100vh;
          padding-top: 84px;
          background: var(--ink);
          color: var(--ink);
          font-family: 'Manrope', system-ui, sans-serif;
          line-height: 1.5;
          overflow-x: hidden;
        }
        .ctc-root * { box-sizing: border-box; }
        .ctc-serif { font-family: 'Fraunces', Georgia, serif; }

        .ctc-hero {
          position: relative;
          overflow: hidden;
          background: radial-gradient(circle at 78% 15%, #17334f 0%, var(--ink) 55%, #081420 100%);
          color: var(--paper);
        }
        .ctc-hero-inner {
          max-width: 1160px;
          margin: 0 auto;
          padding: 76px 24px 92px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 42px;
          align-items: center;
        }
        @media (min-width: 940px) {
          .ctc-hero-inner { grid-template-columns: 1.08fr 0.92fr; padding: 96px 24px 104px; }
        }
        .ctc-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 22px;
          padding: 7px 14px;
          border: 1px solid rgba(231, 201, 140, 0.35);
          border-radius: 999px;
          color: var(--gold-soft);
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }
        .ctc-hero h1 {
          margin: 0 0 20px;
          font-family: 'Fraunces', Georgia, serif;
          font-size: clamp(2.1rem, 4.6vw, 3.4rem);
          font-weight: 600;
          line-height: 1.08;
          letter-spacing: -0.01em;
        }
        .ctc-hero h1 span { color: var(--gold-soft); }
        .ctc-sub {
          max-width: 520px;
          margin: 0 0 30px;
          color: var(--mist);
          font-size: 17px;
        }
        .ctc-actions { display: flex; flex-wrap: wrap; gap: 14px; }
        .ctc-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
          padding: 12px 22px;
          border: 0;
          border-radius: 999px;
          cursor: pointer;
          font-family: 'Manrope', system-ui, sans-serif;
          font-size: 14.5px;
          font-weight: 700;
          letter-spacing: 0.01em;
          text-decoration: none;
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .ctc-btn:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
        .ctc-btn-primary {
          background: var(--gold);
          color: var(--ink);
          box-shadow: 0 8px 20px -8px rgba(201, 151, 74, 0.6);
        }
        .ctc-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 12px 24px -8px rgba(201, 151, 74, 0.7); }
        .ctc-btn-outline {
          background: transparent;
          color: var(--paper);
          border: 1.5px solid rgba(251, 249, 244, 0.3);
        }
        .ctc-btn-dark { background: var(--ink); color: var(--paper); }
        .ctc-btn-dark:hover { transform: translateY(-1px); background: var(--ink-2); }
        .ctc-btn:disabled { opacity: 0.58; cursor: not-allowed; transform: none; }

        .ctc-hero-card {
          border: 1px solid rgba(231, 201, 140, 0.26);
          border-radius: 22px;
          padding: 28px;
          background: rgba(15, 35, 56, 0.72);
          box-shadow: 0 26px 60px -34px rgba(0, 0, 0, 0.75);
        }
        .ctc-hero-card h2 {
          margin: 0 0 18px;
          color: var(--paper);
          font-family: 'Fraunces', Georgia, serif;
          font-size: 25px;
          font-weight: 600;
        }
        .ctc-support-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 0;
          border-top: 1px solid rgba(159, 179, 200, 0.16);
          color: var(--mist);
          font-size: 14px;
        }
        .ctc-support-row:first-of-type { border-top: 0; }
        .ctc-support-row svg { color: var(--gold-soft); flex-shrink: 0; }
        .ctc-support-row strong { display: block; color: var(--paper); font-size: 14.5px; }

        .ctc-section {
          max-width: 1160px;
          margin: 0 auto;
          padding: 84px 24px;
        }
        .ctc-info-band {
          background: var(--paper);
        }
        .ctc-info-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
        }
        @media (min-width: 800px) { .ctc-info-grid { grid-template-columns: repeat(3, 1fr); } }
        .ctc-info-card {
          padding: 26px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: #fff;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .ctc-info-card:hover { transform: translateY(-3px); box-shadow: 0 16px 32px -18px rgba(10, 25, 41, 0.25); }
        .ctc-icon {
          width: 42px;
          height: 42px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #EEF3F1;
          color: var(--teal);
        }
        .ctc-info-card h3 { margin: 0 0 7px; font-size: 16.5px; font-weight: 700; }
        .ctc-info-card p { margin: 0; color: var(--slate); font-size: 14px; }
        .ctc-info-card .ctc-note { margin-top: 7px; color: #6E829D; font-size: 12.5px; }

        .ctc-contact {
          background: linear-gradient(180deg, #10233b 0%, var(--ink) 100%);
          color: var(--paper);
        }
        .ctc-contact-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 40px;
          align-items: start;
        }
        @media (min-width: 940px) { .ctc-contact-grid { grid-template-columns: 1fr 0.92fr; gap: 56px; } }
        .ctc-kicker {
          margin-bottom: 12px;
          color: var(--gold-soft);
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }
        .ctc-contact h2 {
          margin: 0 0 14px;
          font-family: 'Fraunces', Georgia, serif;
          font-size: clamp(1.7rem, 3vw, 2.3rem);
          font-weight: 600;
          color: var(--paper);
        }
        .ctc-contact-text { max-width: 430px; margin: 0; color: var(--mist); font-size: 15.5px; }
        .ctc-trust-list {
          list-style: none;
          padding: 0;
          margin: 24px 0 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ctc-trust-list li { display: flex; align-items: center; gap: 10px; color: var(--mist); font-size: 14.5px; }
        .ctc-trust-list svg { color: var(--gold-soft); flex-shrink: 0; }

        .ctc-form-card {
          padding: 26px;
          border-radius: 20px;
          background: var(--paper);
          color: var(--ink);
          box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.45);
        }
        .ctc-form-card h3 {
          margin: 0 0 6px;
          font-family: 'Fraunces', Georgia, serif;
          font-size: 22px;
          font-weight: 600;
        }
        .ctc-form-card > p { margin: 0 0 24px; color: var(--slate); font-size: 13.5px; }
        .ctc-form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 700px) { .ctc-form-grid { grid-template-columns: repeat(2, 1fr); } }
        .ctc-field { margin-bottom: 14px; }
        .ctc-field label {
          display: block;
          margin-bottom: 7px;
          color: var(--slate);
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .ctc-input {
          width: 100%;
          min-height: 44px;
          padding: 11px 14px;
          border: 1.5px solid #DADFE6;
          border-radius: 12px;
          outline: none;
          background: #fff;
          color: var(--ink);
          font-family: 'Manrope', system-ui, sans-serif;
          font-size: 15px;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .ctc-input:focus { border-color: var(--teal); box-shadow: 0 0 0 3px rgba(29, 111, 100, 0.08); }
        textarea.ctc-input { min-height: 112px; resize: vertical; }
        .ctc-form-card .ctc-btn { width: 100%; margin-top: 4px; padding: 12px 14px; font-size: 15px; }
        .ctc-loader {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(10, 25, 41, 0.28);
          border-top-color: var(--ink);
          border-radius: 50%;
          animation: ctc-spin .8s linear infinite;
        }
        @keyframes ctc-spin { to { transform: rotate(360deg); } }
        .ctc-success {
          padding: 42px 0;
          text-align: center;
        }
        .ctc-success-icon {
          width: 76px;
          height: 76px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #EEF3F1;
          color: var(--teal);
        }
        .ctc-success h3 { margin: 0 0 8px; font-size: 21px; font-weight: 700; }
        .ctc-success p { margin: 0 0 22px; color: var(--slate); }

        @media (max-width: 520px) {
          .ctc-root { padding-top: 72px; }
          .ctc-hero-inner, .ctc-section { padding-left: 18px; padding-right: 18px; }
          .ctc-form-card, .ctc-hero-card { padding: 24px; }
        }
      `}</style>

      <section className="ctc-hero">
        <div className="ctc-hero-inner">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <span className="ctc-eyebrow">
              <ShieldCheck size={14} /> Dhanvo Support
            </span>
            <h1>
              Get in <span>touch</span> with our team
            </h1>
            <p className="ctc-sub">
              Have a question about your account, services, or support? Send us a message and our team will get back to you as soon as possible.
            </p>
            <div className="ctc-actions">
              <a className="ctc-btn ctc-btn-primary" href="#contact-form">
                Send Message <ArrowRight size={17} />
              </a>
              <a className="ctc-btn ctc-btn-outline" href="tel:+919977180801">
                Call Support
              </a>
            </div>
          </motion.div>

          <motion.div
            className="ctc-hero-card"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2>Quick Support</h2>
            <a className="ctc-support-row" href="tel:+919977180801">
              <Phone size={19} />
              <span><strong>+91 99771-80801</strong>Mon-Fri from 9am to 4pm</span>
            </a>
            <a className="ctc-support-row" href="mailto:support@dhanvo.in">
              <Mail size={19} />
              <span><strong>support@dhanvo.in</strong>We reply within 24 hours</span>
            </a>
            <div className="ctc-support-row">
              <Headphones size={19} />
              <span><strong>Customer Helpdesk</strong>Account, technical, partnership, and feedback support</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="ctc-info-band">
        <div className="ctc-section">
          <div className="ctc-info-grid">
          {contactInfo.map((info, index) => (
            <motion.div
              key={info.title}
              className="ctc-info-card"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <div className="ctc-icon"><info.icon size={20} /></div>
              <h3>{info.title}</h3>
              {info.details.map((detail) => (
                <p key={detail}>{detail}</p>
              ))}
              <p className="ctc-note">{info.description}</p>
            </motion.div>
          ))}
          </div>
        </div>
      </section>

      <section className="ctc-contact" id="contact-form">
        <div className="ctc-section ctc-contact-grid">
          <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }}>
            <div className="ctc-kicker">Contact Us</div>
            <h2>Send us your question</h2>
            <p className="ctc-contact-text">
              Share a few details and we will route your request to the right team. For urgent support, you can call or email us directly.
            </p>
            <ul className="ctc-trust-list">
              <li><CheckCircle2 size={17} /> Support for account and service queries</li>
              <li><CheckCircle2 size={17} /> Fast response from the Dhanvo team</li>
              <li><CheckCircle2 size={17} /> Phone and email support available</li>
              <li><CheckCircle2 size={17} /> Secure contact form submission</li>
            </ul>
          </motion.div>

          <motion.div
            className="ctc-form-card"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3>Send us a Message</h3>
            <p>Fill in the required fields and we will get back to you shortly.</p>

            {submitted ? (
              <motion.div
                className="ctc-success"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="ctc-success-icon">
                  <CheckCircle2 size={36} />
                </div>
                <h3>Message Sent!</h3>
                <p>Thank you for contacting us. We'll get back to you within 24 hours.</p>
                <button onClick={() => setSubmitted(false)} className="ctc-btn ctc-btn-dark">
                  Send Another Message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="ctc-form-grid">
                  <div className="ctc-field">
                    <label htmlFor="contact-name">Full Name *</label>
                    <input
                      id="contact-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="ctc-input"
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div className="ctc-field">
                    <label htmlFor="contact-email">Email Address *</label>
                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="ctc-input"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="ctc-form-grid">
                  <div className="ctc-field">
                    <label htmlFor="contact-phone">Phone Number</label>
                    <input
                      id="contact-phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="ctc-input"
                      autoComplete="tel"
                    />
                  </div>

                  <div className="ctc-field">
                    <label htmlFor="contact-subject">Subject</label>
                    <select
                      id="contact-subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="ctc-input"
                    >
                      <option value="">Select a subject</option>
                      {subjects.map((subject) => (
                        <option key={subject} value={subject}>
                          {subject}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="ctc-field">
                  <label htmlFor="contact-message">Message *</label>
                  <textarea
                    id="contact-message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="How can we help you?"
                    rows={5}
                    className="ctc-input"
                    required
                  />
                </div>

                <button type="submit" disabled={loading} className="ctc-btn ctc-btn-primary">
                  {loading ? (
                    <span className="ctc-loader" />
                  ) : (
                    <>
                      <Send size={18} />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default ContactPage;
