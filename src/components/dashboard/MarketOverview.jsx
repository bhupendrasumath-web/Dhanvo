const MarketOverview = () => (
  <section className="dash-panel dash-mfss-data-panel" aria-labelledby="mfss-data-title">
    <div className="dash-panel-heading">
      <div><p className="dash-panel-kicker">NSE MFSS DATA</p><h2 id="mfss-data-title">Data available</h2></div>
      <span className="dash-market-live">MFSS</span>
    </div>
    <div className="dash-mfss-data-copy">
      <p>NSE MFSS provides scheme details, published NAVs, plan registrations and allotment reports.</p>
      <p>It does not provide live equity index quotes or a consolidated current portfolio valuation.</p>
      <small>NAV is published periodically by the fund; it is not an intraday quote.</small>
    </div>
  </section>
);

export default MarketOverview;
