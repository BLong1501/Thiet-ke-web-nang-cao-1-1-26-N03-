export interface BankInfo {
  code: string;
  name: string;
  shortName: string;
  bin: string;
}

export const VIETNAM_BANKS: BankInfo[] = [
  { code: "MB", shortName: "MB Bank", name: "Ngân hàng Quân Đội (MB Bank)", bin: "970422" },
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
];
