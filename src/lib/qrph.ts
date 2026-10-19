/**
 * Builds a scannable payment QR for an exact amount, starting from the payload of
 * the shop's own payment QR.
 *
 * Nothing here invents a payment format: the shop pastes the payload of its real
 * GCash QR (read with any QR reader app). We then set the amount on that payload
 * the way EMVCo defines it — tag 54, with its length prefix kept correct — turn the
 * code dynamic (tag 01 = 12), and recompute the CRC-16 checksum in tag 63. The
 * result is the shop's own code, for one amount.
 *
 * The shop must scan the generated code with GCash once before trusting it with a
 * real payment.
 */

type Tlv = { tag: string; value: string };

/** CRC-16/CCITT-FALSE, the checksum EMVCo payloads end with. */
export function crc16(payload: string): string {
  let crc = 0xffff;

  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Reads the top-level tag-length-value list. Nested templates (tags 26-51, 62, 64)
 * are kept whole on purpose: their inner structure belongs to the payment scheme.
 */
function parseTlvs(payload: string): Tlv[] {
  const tlvs: Tlv[] = [];
  let index = 0;

  while (index + 4 <= payload.length) {
    const tag = payload.slice(index, index + 2);
    const lengthText = payload.slice(index + 2, index + 4);

    if (!/^[0-9A-Fa-f]{2}$/.test(tag) || !/^\d{2}$/.test(lengthText)) break;

    const length = Number(lengthText);
    const value = payload.slice(index + 4, index + 4 + length);
    if (value.length < length) break;

    tlvs.push({ tag: tag.toUpperCase(), value });
    index += 4 + length;
  }

  return tlvs;
}

function serialise(tlvs: Tlv[]): string {
  const body = tlvs
    .filter((tlv) => tlv.tag !== "63")
    .map((tlv) => tlv.tag + tlv.value.length.toString().padStart(2, "0") + tlv.value)
    .join("");

  // Tag 63 is the checksum and must always be last.
  const withMarker = `${body}6304`;
  return withMarker + crc16(withMarker);
}

/** True when the payload looks like it can carry an amount. */
export function canBuildAmountQr(payload: string | null | undefined): boolean {
  if (typeof payload !== "string" || payload.trim().length < 20) return false;
  return parseTlvs(payload.trim()).some((tlv) => tlv.tag === "54" || tlv.tag === "58" || tlv.tag === "63");
}

/** The shop's payload with one amount baked in. */
export function payloadForAmount(payload: string, amount: number): string {
  const tlvs = parseTlvs(payload.trim());
  if (tlvs.length === 0) return payload.trim();

  const amountText = amount.toFixed(2);
  const existingAmount = tlvs.find((tlv) => tlv.tag === "54");

  if (existingAmount) {
    existingAmount.value = amountText;
  } else {
    // EMVCo order: the amount sits before the country code.
    const insertAt = tlvs.findIndex((tlv) => tlv.tag === "58" || tlv.tag === "63");
    tlvs.splice(insertAt === -1 ? tlvs.length : insertAt, 0, { tag: "54", value: amountText });
  }

  // A code that carries an amount is a dynamic code.
  const indicator = tlvs.find((tlv) => tlv.tag === "01");
  if (indicator) indicator.value = "12";

  return serialise(tlvs);
}
