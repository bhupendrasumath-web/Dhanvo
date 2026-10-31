const PAYMENT_MODES = new Set(['UPI', 'NETBANKING']);

const toPaise = (value) => Math.round(Number(value) * 100);
const formatRupees = (value) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function getPurchaseAmountError(amountValue, scheme) {
  const rawAmount = String(amountValue ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(rawAmount)) {
    return 'Enter an investment amount with up to two decimal places.';
  }
  const amount = Number(amountValue);
  if (!Number.isFinite(amount) || amount < 1) {
    return 'The minimum investment amount is ₹1.';
  }

  const amountPaise = toPaise(amount);
  const minimum = Number(scheme.minPurchaseAmount);
  const hasSchemeMinimum = Number.isFinite(minimum) && minimum > 0;
  const effectiveMinimum = hasSchemeMinimum ? Math.max(1, minimum) : 1;
  const maximum = Number(scheme.maxPurchaseAmount);
  const hasMaximum = Number.isFinite(maximum) && maximum > 0;
  const multiple = Number(scheme.purchaseAmountMultiple);
  const hasMultiple = Number.isFinite(multiple) && multiple > 0;

  if (amountPaise < toPaise(effectiveMinimum)) {
    return `The minimum first investment for this scheme is ${formatRupees(effectiveMinimum)}.`;
  }
  if (hasMaximum && amountPaise > toPaise(maximum)) {
    return `The maximum first investment for this scheme is ${formatRupees(maximum)}.`;
  }
  if (
    hasMultiple
    && (amountPaise - (hasSchemeMinimum ? toPaise(effectiveMinimum) : 0)) % toPaise(multiple) !== 0
  ) {
    return hasSchemeMinimum
      ? `Investments must be in increments of ${formatRupees(multiple)} above the minimum ${formatRupees(effectiveMinimum)}.`
      : `Investment amount must be in multiples of ${formatRupees(multiple)}.`;
  }
  return '';
}

export function isValidNseEuin(value) {
  return /^E\d{6}$/.test(String(value || '').trim().toUpperCase());
}

export function validatePurchaseFields(body) {
  const paymentMode = String(body.paymentMode || '').trim().toUpperCase();
  if (!PAYMENT_MODES.has(paymentMode)) {
    return { error: 'Choose a supported payment mode.' };
  }

  const vpa = String(body.vpa || '').trim();
  if (paymentMode === 'UPI' && (
    vpa.length > 255
    || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,126}@[A-Za-z0-9][A-Za-z0-9.-]{0,125}$/.test(vpa)
  )) {
    return { error: 'Enter a valid UPI ID to authorize the NSE UPI payment.' };
  }

  return { paymentMode, vpa };
}

export function getPurchaseDematPhysical(clientDetails) {
  if (!clientDetails.dematActive) return 'P';
  if (['C', 'N'].includes(clientDetails.dpTransactionMode)) {
    return clientDetails.dpTransactionMode;
  }
  const error = new Error('NSE client profile has an active demat account but no valid default depository. Update the NSE profile before placing an order.');
  error.statusCode = 422;
  throw error;
}

export function buildPurchaseOrderPayload({
  scheme,
  user,
  clientDetails,
  amount,
  euin,
  arn,
  reference,
}) {
  const mobile = String(user.phone || '').replace(/\D/g, '').slice(-10);
  const email = String(user.email || '').trim();
  return {
    transaction_details: [{
      scheme_code: scheme.schemeCode,
      trxn_type: 'P',
      buy_sell_type: 'FRESH',
      client_code: String(user.nse_client_code).trim(),
      demat_physical: getPurchaseDematPhysical(clientDetails),
      order_amount: amount.toFixed(2),
      folio_no: '',
      remarks: 'Mutual fund purchase via Dhanvo',
      kyc_flag: 'Y',
      sub_broker_code: '',
      euin_number: euin,
      euin_declaration: 'Y',
      min_redemption_flag: 'N',
      dpc_flag: 'Y',
      all_units: 'N',
      redemption_units: '',
      sub_broker_arn: arn,
      bank_ref_no: '',
      account_no: '',
      mobile_no: /^\d{10}$/.test(mobile) ? mobile : '',
      email: email.length <= 50 ? email : '',
      mandate_id: '',
      filler1: '',
      member_unique_id: reference,
    }],
  };
}

export function buildPurchasePaymentPayload(payment, clientDetails, clientCode, orderId) {
  const payload = {
    payment_mode: payment.paymentMode,
    client_code: clientCode,
    order_ids: orderId,
    bank_account_no: clientDetails.bankAccountNo,
    ifsc: clientDetails.bankIfsc,
  };
  if (payment.paymentMode === 'UPI') payload.vpa = payment.vpa;
  return payload;
}
