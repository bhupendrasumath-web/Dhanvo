import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-[#071320] border-t border-[#10233b] text-[#9FB3C8] text-sm">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 pt-16 pb-8">
        {/* MAIN GRID */}
        <div className="grid lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] md:grid-cols-3 gap-10 mb-12">
          {/* BRAND */}
          <div>
            <div
              className="mb-4 leading-none select-none"
              style={{
                fontFamily: "'Cinzel', 'Fraunces', Georgia, serif",
                fontSize: "clamp(28px, 3vw, 36px)",
                fontWeight: 800,
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                lineHeight: 0.95,
                color: "#C9974A",
                WebkitTextFillColor: "#C9974A",
                textShadow: "0 2px 8px rgba(0, 0, 0, 0.28)",
              }}
            >
              DHANVO
            </div>

            <p className="text-white font-semibold text-xs mb-1">
              DHANLAKSHYA SECURITIES PVT. LTD.
            </p>
            <p className="text-xs mb-3">CIN: U64990MP2025PTC078046</p>
            <p className="text-xs leading-relaxed">
              Registered Office: Office No.780, Vishnu Vatika, Ward No.13,
              Street no.1, Kayampur, District - Mandsaur, Madhya Pradesh -
              458558.
            </p>
          </div>

          {/* PRODUCTS */}
          <div>
            <h4 className="text-white text-xs font-bold mb-4 uppercase tracking-wider">
              Products
            </h4>
            <ul className="space-y-3">
              {[
                "Mutual Funds",
                "Unlisted Shares (Pre-IPO)",
                "Comprehensive Insurance",
                "Strategy Builder",
              ].map((item) => (
                <li key={item}>
                  <Link to="#" className="hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* PLATFORMS */}
          <div>
            <h4 className="text-white text-xs font-bold mb-4 uppercase tracking-wider">
              Platforms
            </h4>
            <ul className="space-y-3">
              {[
                "Dhanvo Mobile (iOS)",
                "Dhanvo Android",
                "Smart Calculators",
                "Become a Distributor",
              ].map((item) => (
                <li key={item}>
                  <Link to="#" className="hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* LEGAL */}
          <div>
            <h4 className="text-white text-xs font-bold mb-4 uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-3">
              {[
                "Privacy Policy",
                "Terms & Conditions",
                "Risk Disclosures",
                "PMLA Policy",
              ].map((item) => (
                <li key={item}>
                  <Link to="#" className="hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* TRUST & HELP */}
          <div>
            <h4 className="text-white text-xs font-bold mb-4 uppercase tracking-wider">
              Trust & Help
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="#" className="hover:text-white transition-colors">
                  Support Ticket
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-white transition-colors">
                  Grievance Redressal
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-white transition-colors">
                  Cyber Security
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* MUTUAL FUND RISK DISCLOSURE */}
        <div className="border border-red-500 rounded-md p-5 mb-6 bg-red-500/[0.02]">
          <h5 className="text-red-500 font-semibold text-xs mb-2 uppercase">
            Mutual Fund & Investment Risk Disclosure:
          </h5>
          <p className="text-xs leading-relaxed">
            Mutual Fund investments and Unlisted/Pre-IPO share investments are
            subject to market risks. Please read all scheme-related documents,
            offer documents, and financial statements carefully before investing.
            Past performance is not indicative of future results. Dhanvo acts
            purely as an AMFI-registered distributor of financial products and
            does not facilitate active stock exchange trading, intraday broking,
            or clearing services.
          </p>
        </div>

        {/* ATTENTION INVESTORS */}
        <div className="border border-amber-400 rounded-md p-5 mb-6 bg-amber-400/[0.02]">
          <h5 className="text-amber-400 font-semibold text-xs mb-2 uppercase">
            Attention Investors:
          </h5>
          <p className="text-xs leading-relaxed">
            Prevent Unauthorized transactions in your Mutual Fund and Investment
            accounts. Ensure your mobile number and email ID are updated with
            your registered distributor and AMCs to receive instant alerts and
            transaction confirmations. KYC is a one-time exercise when dealing in
            financial and securities markets. Once KYC is successfully completed
            through a SEBI registered intermediary, you do not need to undergo the
            same process again for future investments across the industry.
          </p>
        </div>

        {/* AMFI LINE */}
        <p className="text-xs mb-6">
          AMFI Registered Mutual Fund Distributor | AMFI Regn. No. ARN-358762 |
          Date of initial Registration: 16/04/2026 | Current validity of ARN -
          15/04/2029.
        </p>

        {/* COPYRIGHT */}
        <div className="border-t border-[#10233b] pt-6 text-center space-y-1">
          <p className="text-xs text-white opacity-50">© 2026 DHANVO</p>
          <p className="text-xs">
            Dhanlakshya Securities Private Limited. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;