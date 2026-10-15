/**
 * Profanity Filter & Name Sanitization Guardrail
 * Mencegah nama kotor, kasar, jorok, atau toxic dari internet pada pemesanan kedai minuman.
 */

// Daftar kata kasar & terlarang (Bahasa Indonesia & Bahasa Inggris)
const BANNED_WORDS = [
  // Vulgaritas & Organ Tubuh
  "kontol", "memek", "jembut", "pepek", "pantek", "peler", "itil", "tetek", "toket", "puki", "titit",
  "ngentot", "ngewe", "colay", "coli", "bispak", "lonte", "perek", "pelacur", "jablay",
  
  // Umpatan Hewan & Hinaan Kasar
  "anjing", "anjir", "anj", "anying", "babi", "bangsat", "bajingan", "kampret", "monyet", "kunyuk",
  "pantat", "tai", "taek", "sialan", "brengsek", "setan", "iblis", "dajal",
  
  // Hinaan Intelektual & Diskriminatif
  "goblok", "tolol", "bego", "idiot", "autis", "cacat", "dungu", "pekok", "gendeng",
  
  // English Profanity & Slurs
  "fuck", "fucker", "fucking", "shit", "bitch", "asshole", "bastard", "dick", "pussy", "cunt",
  "whore", "slut", "cock", "nigger", "nigga", "fag", "faggot", "retard", "porn", "xxx", "boobs"
];

// Normalisasi leetspeak (misal: "k0nt0l" -> "kontol", "4nj1ng" -> "anjing")
function normalizeLeetspeak(input: string): string {
  return input
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/[\@\$\!\*\_\-\.\+]/g, ""); // hilangkan karakter pemisah tipuan
}

// Normalisasi pengulangan huruf (misal: "annnjjiiing" -> "anjing")
function collapseRepeatingChars(input: string): string {
  return input.replace(/(.)\1{2,}/g, "$1");
}

/**
 * Memeriksa apakah teks mengandung kata terlarang / kasar
 */
export function containsProfanity(rawText: string): boolean {
  if (!rawText || rawText.trim().length === 0) return false;

  const normalized = normalizeLeetspeak(rawText);
  const collapsed = collapseRepeatingChars(normalized);

  // 1. Cek kecocokan langsung per kata (tokenized)
  const tokens = normalized.split(/\s+/);
  for (const token of tokens) {
    if (BANNED_WORDS.includes(token)) return true;
  }

  // 2. Cek substring pencarian dalam string yang dirapatkan (anti-spasi seperti "k o n t o l")
  const compact = normalized.replace(/\s+/g, "");
  const compactCollapsed = collapsed.replace(/\s+/g, "");

  for (const banned of BANNED_WORDS) {
    if (banned.length >= 3) {
      if (compact.includes(banned) || compactCollapsed.includes(banned)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validasi ketat nama pemesan
 */
export function validateCustomerName(name: string): { isValid: boolean; message?: string } {
  const trimmed = (name || "").trim();

  if (trimmed.length < 2) {
    return { isValid: false, message: "Nama pemesan minimal 2 karakter" };
  }

  if (trimmed.length > 30) {
    return { isValid: false, message: "Nama pemesan maksimal 30 karakter" };
  }

  // Hanya boleh huruf, spasi, dan tanda petik/titik (misal: D'Angelo, Muh. Fauzi)
  const validNamePattern = /^[a-zA-Z\s\.\'\-]+$/;
  if (!validNamePattern.test(trimmed)) {
    return { isValid: false, message: "Nama pemesan hanya boleh mengandung huruf, spasi, dan titik/petik" };
  }

  // Filter kata kasar
  if (containsProfanity(trimmed)) {
    return {
      isValid: false,
      message: "Mohon gunakan nama panggilan yang sopan. Nama yang Anda masukkan tidak diizinkan."
    };
  }

  return { isValid: true };
}
