/**
 * Bảng ánh xạ từ Tên ngân hàng sang Mã định danh VietQR (Mã BIN hoặc Mã Code chuẩn Napas 247)
 */
export const BANK_BIN_MAP: Record<string, string> = {
  vcb: "970436",
  vietcombank: "970436",
  mb: "970422",
  mbbank: "970422",
  tcb: "970407",
  techcombank: "970407",
  bidv: "970418",
  ctg: "970415",
  vietinbank: "970415",
  vba: "970405",
  agribank: "970405",
  vpb: "970432",
  vpbank: "970432",
  acb: "970416",
  tpb: "970423",
  tpbank: "970423",
  stb: "970403",
  sacombank: "970403",
  hdb: "970437",
  hdbank: "970437",
  vib: "970441",
  shb: "970443",
  msb: "970426",
  seab: "970440",
  seabank: "970440",
  ocb: "970448",
  eib: "970431",
  eximbank: "970431",
  nab: "970428",
  "nam a": "970428",
  bab: "970409",
  "bac a": "970409",
  pvcb: "970412",
  pvcombank: "970412",
  shbvn: "970424",
  shinhan: "970424",
  woo: "970457",
  woori: "970457",
  cake: "546034",
  ubank: "546035",
  timo: "963388",
  lpb: "970449",
  lpbank: "970449",
  bvb: "970454",
  scb: "970429",
  vab: "970427",
  klb: "970452",
  abb: "970425",
  abbank: "970425",
  ncb: "970419",
  pgb: "970430",
  pgbank: "970430",
  saigonbank: "970400",
};

/**
 * Phân tích và lấy Mã BIN hoặc Code ngân hàng hợp lệ để tạo mã VietQR
 */
export function resolveBankIdentifier(bankName: string): string {
  if (!bankName) return "970436";
  const normalized = bankName.trim().toLowerCase();

  // 1. Kiểm tra khớp trực tiếp
  if (BANK_BIN_MAP[normalized]) {
    return BANK_BIN_MAP[normalized];
  }

  // 2. Trích xuất tên trong dấu ngoặc đơn: ví dụ "Ngân hàng Ngoại thương Việt Nam (Vietcombank)" -> "vietcombank"
  const bracketMatch = normalized.match(/\(([^)]+)\)/);
  if (bracketMatch && bracketMatch[1]) {
    const inside = bracketMatch[1].trim();
    if (BANK_BIN_MAP[inside]) {
      return BANK_BIN_MAP[inside];
    }
  }

  // 3. Kiểm tra các tên tiếng Việt đặc thù có dấu
  if (normalized.includes("ngoại thương")) return "970436";
  if (normalized.includes("quân đội")) return "970422";
  if (normalized.includes("kỹ thương")) return "970407";
  if (normalized.includes("công thương")) return "970415";
  if (normalized.includes("nông nghiệp")) return "970405";
  if (normalized.includes("đầu tư")) return "970418";
  if (normalized.includes("thịnh vượng")) return "970432";
  if (normalized.includes("tiên phong")) return "970423";
  if (normalized.includes("phát triển")) return "970437";
  if (normalized.includes("hàng hải")) return "970426";
  if (normalized.includes("đông nam á")) return "970440";
  if (normalized.includes("phương đông")) return "970448";
  if (normalized.includes("xuất nhập khẩu")) return "970431";
  if (normalized.includes("sài gòn")) return "970429";

  // 4. Sắp xếp các từ khóa theo độ dài giảm dần (từ dài trước để tránh "mb" khớp nhầm trong "vietcombank")
  const sortedEntries = Object.entries(BANK_BIN_MAP).sort(
    (a, b) => b[0].length - a[0].length
  );

  // 4a. Khớp từ khóa có độ dài >= 3
  for (const [key, bin] of sortedEntries) {
    if (key.length >= 3 && normalized.includes(key)) {
      return bin;
    }
  }

  // 4b. Khớp từ khóa ngắn 2 ký tự (như mb) với ranh giới từ để không ăn vào từ khác
  for (const [key, bin] of sortedEntries) {
    if (key.length < 3) {
      const regex = new RegExp(`(^|[^a-z0-9])${key}([^a-z0-9]|$)`, "i");
      if (regex.test(normalized)) {
        return bin;
      }
    }
  }

  // Fallback loại bỏ các ký tự đặc biệt nếu là số BIN hoặc short code
  const clean = bankName.replace(/[^a-zA-Z0-9]/g, "");
  return clean || "970436";
}

/**
 * Tạo URL mã VietQR Napas 247 chuẩn
 */
export function buildVietQrUrl(params: {
  bankName: string;
  accountNumber: string;
  accountName?: string;
  amount: number;
  transactionCode: string;
}): string {
  const bankId = resolveBankIdentifier(params.bankName);
  const cleanAcc = params.accountNumber.replace(/[^0-9]/g, "") || params.accountNumber;
  const name = encodeURIComponent(params.accountName || "QUY GAY QUY CONG DONG");
  const code = encodeURIComponent(params.transactionCode);

  return `https://img.vietqr.io/image/${bankId}-${cleanAcc}-compact2.png?amount=${params.amount}&addInfo=${code}&accountName=${name}`;
}

/**
 * Fallback tạo QR server dự phòng nếu VietQR gặp sự cố mạng
 */
export function buildFallbackQrUrl(params: {
  bankName: string;
  accountNumber: string;
  accountName?: string;
  amount: number;
  transactionCode: string;
}): string {
  const bankId = resolveBankIdentifier(params.bankName);
  const payload = `VIETQR|${bankId}|${params.accountNumber}|${params.amount}|${params.transactionCode}|${params.accountName || ""}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(payload)}`;
}
