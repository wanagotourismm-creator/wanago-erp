// Generates a standard UPI deep link — a plain structured URL, not a call to
// any payment gateway/aggregator. Money moves directly bank-to-bank between
// the customer's UPI app and the business's own UPI ID (`pa`); nothing here
// touches, holds, or takes a cut of the payment, so there's no commission
// and no third party to integrate with. The trade-off (an explicit, chosen
// one) is that nothing here can automatically confirm the payment landed —
// that still needs a human to record it via the existing Payments flow,
// since only the business's own bank knows for certain that money arrived.
export function buildUpiLink(params: {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  note: string;
  refId: string;
}): string {
  const query = new URLSearchParams({
    pa: params.payeeVpa,
    pn: params.payeeName,
    am: params.amount.toFixed(2),
    cu: "INR",
    tn: params.note,
    tr: params.refId,
  });
  return `upi://pay?${query.toString()}`;
}
