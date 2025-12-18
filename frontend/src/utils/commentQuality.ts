export type CommentQualityResult = {
  ok: boolean;
  score: number;
  message?: string;
};
export function analyzeCommentQuality(raw: string): true | string {
  const r = analyze(raw);
  return r.ok ? true : r.message || "Invalid";
}

const sigmoid = (x: number, k: number = 1): number => {
  return 1 / (1 + Math.exp(-k * x));
};

const calculateScore = (length: number): number => {
  return (
    10 * sigmoid(length - 10, 1) +
    10 * sigmoid(length - 25, 1) +
    10 * sigmoid(length - 75, 1)
  );
};

export function analyze(raw: string): CommentQualityResult {
  if (!raw) return { ok: false, score: 0, message: "Comment is required" };
  const text = raw.trim();
  if (!text) return { ok: false, score: 0, message: "Comment is required" };
  let score = Math.min(60, Math.floor(text.length / 10));
  const cleaned = text.replace(/[\p{P}\p{S}]/gu, " ");
  const tokenRegex = /[A-Za-z]+|\d+|[\u4e00-\u9fff]/g;
  const words: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(cleaned)) !== null) {
    words.push(m[0]);
  }
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const x = words.length;
  const diversity = words.length ? uniqueWords.size / words.length : 0;

  score += calculateScore(x);
  if (diversity > 0.5) score += 10;
  else if (diversity > 0.3) score += 4;
  const deductions: string[] = [];
  const pushDeduct = (msg: string, amt: number) => {
    score -= amt;
    deductions.push(msg);
    console.log("Deduct", amt, msg);
  };

  if (text.length < 15)
    return {
      ok: false,
      score: 5,
      message: "Comment is too short (min 15 chars)",
    };
  if (/(.)\1{6,}/.test(text)) pushDeduct("Too many repeated characters", 25);
  if (/(..)(?:\1){4,}/.test(text)) pushDeduct("Too many repeated patterns", 20);
  if (text.length >= 30 && diversity < 0.15)
    pushDeduct("Content too repetitive", 25);

  const punctMatches = text.match(/[\p{P}\p{S}]/gu) || [];
  if (punctMatches.length / text.length > 0.3)
    pushDeduct("Too many symbols/punctuation", 30);

  const digitMatches = text.match(/\d/g) || [];
  if (digitMatches.length / text.length > 0.4)
    pushDeduct("Too many digits", 40);

  const zhMatches = text.match(/[\u4e00-\u9fff]/g) || [];
  if (zhMatches.length > 0 && zhMatches.length < 5 && text.length < 30)
    pushDeduct("Add more detail for clarity", 15);

  if (words.length < 3) pushDeduct("Too few words – please elaborate more", 25);

  const lower = text.toLowerCase();
  const gibberishTokens = [
    "asd",
    "qwe",
    "zxc",
    "lorem ipsum",
    "test test",
    "just test",
  ];
  if (gibberishTokens.some((tok) => lower.includes(tok)))
    pushDeduct("Content appears to be placeholder/gibberish", 40);

  const freq: Record<string, number> = {};
  for (const w of words)
    freq[w.toLowerCase()] = (freq[w.toLowerCase()] || 0) + 1;
  const counts = Object.values(freq);
  if (counts.length) {
    const maxFreq = Math.max(...counts);
    if (words.length >= 20 && maxFreq / words.length > 0.15)
      pushDeduct("Too many repetitions of the same word", 100);
  }

  score = Math.round(Math.max(0, Math.min(100, score)));
  if (deductions.length) {
    return { ok: false, score, message: deductions[0] };
  }
  const pass = score >= 80;
  console.log(score)
  return pass
    ? { ok: true, score }
    : { ok: false, score, message: "Comment lacks depth and detail." };
}
