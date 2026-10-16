export interface BankInfo {
  code: string;
  shortName: string;
  name: string;
  bin: string;
}

export const NAPAS_BANKS: BankInfo[] = [
  { code: "MB", shortName: "MBBank", name: "Ngân hàng Quân Đội (MB Bank)", bin: "970422" },
  { code: "VCB", shortName: "Vietcombank", name: "Ngân hàng Ngoại thương Việt Nam (Vietcombank)", bin: "970436" },
  { code: "TCB", shortName: "Techcombank", name: "Ngân hàng Kỹ Thương (Techcombank)", bin: "970407" },
  { code: "BIDV", shortName: "BIDV", name: "Ngân hàng Đầu tư và Phát triển Việt Nam (BIDV)", bin: "970418" },
  { code: "CTG", shortName: "VietinBank", name: "Ngân hàng Công Thương Việt Nam (VietinBank)", bin: "970415" },
  { code: "VBA", shortName: "Agribank", name: "Ngân hàng Nông nghiệp & PTNT (Agribank)", bin: "970405" },
  { code: "VPB", shortName: "VPBank", name: "Ngân hàng Việt Nam Thịnh Vượng (VPBank)", bin: "970432" },
  { code: "ACB", shortName: "ACB", name: "Ngân hàng Á Châu (ACB)", bin: "970416" },
  { code: "TPB", shortName: "TPBank", name: "Ngân hàng Tiên Phong (TPBank)", bin: "970423" },
  { code: "STB", shortName: "Sacombank", name: "Ngân hàng Sài Gòn Thương Tín (Sacombank)", bin: "970403" },
  { code: "HDB", shortName: "HDBank", name: "Ngân hàng Phát triển TP.HCM (HDBank)", bin: "970437" },
  { code: "VIB", shortName: "VIB", name: "Ngân hàng Quốc tế (VIB)", bin: "970441" },
  { code: "SHB", shortName: "SHB", name: "Ngân hàng Sài Gòn - Hà Nội (SHB)", bin: "970443" },
  { code: "MSB", shortName: "MSB", name: "Ngân hàng Hàng Hải (MSB)", bin: "970426" },
  { code: "SEAB", shortName: "SeABank", name: "Ngân hàng Đông Nam Á (SeABank)", bin: "970440" },
  { code: "OCB", shortName: "OCB", name: "Ngân hàng Phương Đông (OCB)", bin: "970448" },
  { code: "EIB", shortName: "Eximbank", name: "Ngân hàng Xuất Nhập Khẩu (Eximbank)", bin: "970431" },
  { code: "NAB", shortName: "Nam A Bank", name: "Ngân hàng Nam Á (Nam A Bank)", bin: "970428" },
  { code: "BAB", shortName: "Bac A Bank", name: "Ngân hàng Bắc Á (Bac A Bank)", bin: "970409" },
  { code: "PVCB", shortName: "PVcomBank", name: "Ngân hàng Đại Chúng (PVcomBank)", bin: "970412" },
  { code: "SHBVN", shortName: "Shinhan Bank", name: "Ngân hàng TNHH MTV Shinhan Việt Nam", bin: "970424" },
  { code: "WOO", shortName: "Woori Bank", name: "Ngân hàng Woori Việt Nam", bin: "970457" },
  { code: "CAKE", shortName: "CAKE by VPBank", name: "Ngân hàng số CAKE by VPBank", bin: "546034" },
  { code: "UBANK", shortName: "Ubank by VPBank", name: "Ngân hàng số Ubank by VPBank", bin: "546035" },
  { code: "TIMO", shortName: "Timo by BVBank", name: "Ngân hàng số Timo by BVBank", bin: "963388" },
  { code: "LPB", shortName: "LPBank", name: "Ngân hàng Bưu Điện Liên Việt (LPBank)", bin: "970449" },
  { code: "BVB", shortName: "BVBank", name: "Ngân hàng Bản Việt (BVBank)", bin: "970454" },
  { code: "SCB", shortName: "SCB", name: "Ngân hàng Sài Gòn (SCB)", bin: "970429" },
  { code: "VAB", shortName: "VietABank", name: "Ngân hàng Việt Á (VietABank)", bin: "970427" },
  { code: "KLB", shortName: "KienlongBank", name: "Ngân hàng Kiên Long (KienlongBank)", bin: "970452" },
  { code: "ABB", shortName: "ABBANK", name: "Ngân hàng An Bình (ABBANK)", bin: "970425" },
  { code: "NCB", shortName: "NCB", name: "Ngân hàng Quốc Dân (NCB)", bin: "970419" },
  { code: "PGB", shortName: "PGBank", name: "Ngân hàng Thịnh vượng và Phát triển (PGBank)", bin: "970430" },
  { code: "SAIGONBANK", shortName: "Saigonbank", name: "Ngân hàng Sài Gòn Công Thương", bin: "970400" },
];

export function findBank(query: string): BankInfo | undefined {
  if (!query || typeof query !== "string") return undefined;
  const q = query.trim().toLowerCase();

  // 1. Khớp chính xác hoàn toàn (Code, ShortName, Tên đầy đủ, hoặc Mã BIN)
  const exact = NAPAS_BANKS.find(
    (b) =>
      b.bin === q ||
      b.code.toLowerCase() === q ||
      b.shortName.toLowerCase() === q ||
      b.name.toLowerCase() === q
  );
  if (exact) return exact;

  // 2. Trích xuất nội dung trong ngoặc đơn nếu có: ví dụ "... (Vietcombank)" -> "vietcombank"
  const bracketMatch = q.match(/\(([^)]+)\)/);
  if (bracketMatch && bracketMatch[1]) {
    const inside = bracketMatch[1].trim().toLowerCase();
    const foundInside = NAPAS_BANKS.find(
      (b) =>
        b.code.toLowerCase() === inside ||
        b.shortName.toLowerCase() === inside ||
        b.bin === inside
    );
    if (foundInside) return foundInside;
  }

  // Sắp xếp danh sách theo độ dài shortName giảm dần để ưu tiên tên dài hơn (tránh match nhầm từ ngắn)
  const sortedByLength = [...NAPAS_BANKS].sort((a, b) => b.shortName.length - a.shortName.length);

  // 3. Khớp tên viết tắt hoặc thương hiệu (độ dài >= 3)
  for (const b of sortedByLength) {
    const sName = b.shortName.toLowerCase();
    if (sName.length >= 3 && q.includes(sName)) {
      return b;
    }
  }

  // 4. Khớp tên tiếng Việt chính (lược bỏ ngoặc đơn)
  for (const b of sortedByLength) {
    const cleanFullName = b.name.toLowerCase().replace(/\s*\([^)]*\)/g, "").trim();
    if (cleanFullName.length > 5 && (q.includes(cleanFullName) || cleanFullName.includes(q))) {
      return b;
    }
  }

  // 5. Khớp mã viết tắt ngắn (như MB, VCB, ACB) với ranh giới từ để không dính vào các từ dài
  for (const b of sortedByLength) {
    const code = b.code.toLowerCase();
    const regex = new RegExp(`(^|[^a-z0-9])${code}([^a-z0-9]|$)`, "i");
    if (regex.test(q)) {
      return b;
    }
  }

  return undefined;
}

/**
 * Kiểm tra xem tên hoặc mã ngân hàng có nằm trong danh sách trắng Napas 247 không
 */
export function isValidBank(query: string): boolean {
  return findBank(query) !== undefined;
}
