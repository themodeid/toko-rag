const TOXIC_PATTERNS = [
  // Indonesian profanities
  /\banjing\b/i,
  /\banj[i1]ng\b/i,
  /\basu\b/i,
  /\bbabi\b/i,
  /\bbangsat\b/i,
  /\bbrengsek\b/i,
  /\bkontol\b/i,
  /\bk[o0]nt[o0]l\b/i,
  /\bmemek\b/i,
  /\bm3m3k\b/i,
  /\bjembut\b/i,
  /\bperek\b/i,
  /\blonte\b/i,
  /\bpsk\b/i,
  /\bpantat\b/i,
  /\btai\b/i,
  /\bt[a4]i\b/i,
  /\bgoblok\b/i,
  /\bg[o0]bl[o0]k\b/i,
  /\btolol\b/i,
  /\bbege\b/i,
  /\bidiot\b/i,
  /\bkampret\b/i,
  /\bkeparat\b/i,
  /\bsetan\b/i,
  /\biblis\b/i,
  /\bdajjal\b/i,

  // English profanities
  /\bfuck\b/i,
  /\bf\*ck\b/i,
  /\bfuk\b/i,
  /\bshit\b/i,
  /\bsh\*t\b/i,
  /\bbitch\b/i,
  /\bb!tch\b/i,
  /\basshole\b/i,
  /\bbastard\b/i,
  /\bdick\b/i,
  /\bpussy\b/i,
  /\bcunt\b/i,
  /\bwhore\b/i,
  /\bslut\b/i,
  /\bnigger\b/i,
  /\bnigga\b/i,
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0o]/g, "o")
    .replace(/[1li!|]/g, "i")
    .replace(/[3e]/g, "e")
    .replace(/[4a@]/g, "a")
    .replace(/[5s$]/g, "s")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateCustomerName(name: string): { isValid: boolean; message?: string } {
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { isValid: false, message: "Nama pemesan minimal 2 karakter" };
  }

  if (trimmed.length > 30) {
    return { isValid: false, message: "Nama pemesan maksimal 30 karakter" };
  }

  // Regex allowed: alphabet, spaces, dot, apostrophe, dash
  const validCharRegex = /^[a-zA-Z\s.'-]+$/;
  if (!validCharRegex.test(trimmed)) {
    return {
      isValid: false,
      message: "Nama hanya boleh menggunakan huruf, spasi, titik, tanda petik, atau tanda hubung",
    };
  }

  const normalized = normalizeText(trimmed);
  const spaceless = normalized.replace(/\s+/g, "");

  for (const pattern of TOXIC_PATTERNS) {
    if (pattern.test(trimmed) || pattern.test(normalized) || pattern.test(spaceless)) {
      return {
        isValid: false,
        message: "Nama mengandung kata tidak pantas. Harap gunakan nama panggilan yang sopan.",
      };
    }
  }

  return { isValid: true };
}
