import { CampaignStatus } from "@prisma/client";
import prisma from "../src/core/database/prisma";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { randomUUID } from "crypto";

const ASSET_DIR = "d:\\LongWork\\web_nâng_cao\\asset\\img";
const PUBLIC_UPLOADS_DIR = path.resolve(__dirname, "../public-uploads");

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 200);
}

async function convertAndSaveImage(sourceFileName: string): Promise<string> {
  const sourcePath = path.join(ASSET_DIR, sourceFileName);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Tệp ảnh không tồn tại: ${sourcePath}`);
  }

  const id = randomUUID();
  const targetFileName = `${id}.png`;
  const targetPath = path.join(PUBLIC_UPLOADS_DIR, targetFileName);

  const buffer = fs.readFileSync(sourcePath);
  const pngBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: 1920, height: 1080, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 8 })
    .toBuffer();

  fs.writeFileSync(targetPath, pngBuffer);
  return `/api/v1/uploads/public/${targetFileName}`;
}

async function main() {
  console.log("🚀 Bắt đầu quá trình tạo dữ liệu chiến dịch...");

  // 1. Đảm bảo thư mục public-uploads tồn tại
  if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) {
    fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
    console.log(`📁 Đã tạo thư mục: ${PUBLIC_UPLOADS_DIR}`);
  }

  // 2. Lấy hoặc tạo tài khoản tranbaolong5b@gmail.com
  const email = "tranbaolong5b@gmail.com";
  const rawPassword = "Password@123";
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        fullName: "Trần Bảo Long",
        passwordHash,
        role: "FUNDRAISER",
        status: "ACTIVE",
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        bio: "Đại diện các hoạt động gây quỹ vì cộng đồng và trẻ em vùng cao.",
      },
    });
    console.log(`✅ Đã tạo mới tài khoản: ${email} (Role: FUNDRAISER)`);
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: "FUNDRAISER",
        status: "ACTIVE",
        isEmailVerified: true,
        passwordHash, // Đảm bảo mật khẩu khớp Password@123
      },
    });
    console.log(`✅ Đã cập nhật tài khoản: ${email} thành FUNDRAISER`);
  }

  // 3. Đảm bảo có Verification APPROVED cho user này
  const existingVerif = await prisma.verification.findUnique({
    where: { userId: user.id },
  });
  if (!existingVerif) {
    await prisma.verification.create({
      data: {
        userId: user.id,
        idCardNumber: "001201009999",
        cardIssuedPlace: "Cục Cảnh sát QLHC về TTXH",
        cardIssuedDate: new Date("2021-05-15"),
        frontCardImage: "/campaign-placeholder.svg",
        backCardImage: "/campaign-placeholder.svg",
        portraitImage: "/campaign-placeholder.svg",
        status: "APPROVED",
        reviewedAt: new Date(),
      },
    });
    console.log("✅ Đã cấp xác thực danh tính (KYC) thành công cho tài khoản");
  } else if (existingVerif.status !== "APPROVED") {
    await prisma.verification.update({
      where: { id: existingVerif.id },
      data: { status: "APPROVED", reviewedAt: new Date() },
    });
  }

  // 4. Lấy danh mục
  let categories = await prisma.category.findMany();
  if (categories.length === 0) {
    const c1 = await prisma.category.create({
      data: { name: "Giáo dục & Trẻ em", slug: "giao-duc-tre-em", description: "Hỗ trợ học sinh và trường lớp vùng khó khăn" },
    });
    const c2 = await prisma.category.create({
      data: { name: "Y tế & Sức khỏe", slug: "y-te-suc-khoe", description: "Hỗ trợ viện phí và phẫu thuật bệnh hiểm nghèo" },
    });
    const c3 = await prisma.category.create({
      data: { name: "Cứu trợ khẩn cấp", slug: "cuu-tro-khan-cap", description: "Cứu trợ thiên tai, bão lũ và hoàn cảnh cấp bách" },
    });
    categories = [c1, c2, c3];
  }

  const catEdu = categories.find((c) => c.slug.includes("giao-duc") || c.slug.includes("tre-em")) || categories[0];
  const catMed = categories.find((c) => c.slug.includes("y-te") || c.slug.includes("suc-khoe")) || categories[1] || categories[0];
  const catRelief = categories.find((c) => c.slug.includes("cuu-tro") || c.slug.includes("khan-cap") || c.slug.includes("hoan-canh")) || categories[2] || categories[0];

  // 5. Chuẩn bị ảnh từ thư mục asset/img
  console.log("🖼️ Đang chuyển đổi và tối ưu ảnh từ asset/img sang public uploads...");
  const img1 = await convertAndSaveImage("images (1).jpg");
  const img2 = await convertAndSaveImage("images (2).jpg");
  const img3 = await convertAndSaveImage("images (3).jpg");
  const img4 = await convertAndSaveImage("images (4).jpg");
  const img5 = await convertAndSaveImage("images (5).jpg");
  const imgMain = await convertAndSaveImage("images.jpg");
  const imgWebp = await convertAndSaveImage("maxresdefault-1483081954130-1500261802127-1505808492778.webp");

  console.log("✅ Đã chuẩn bị xong 7 ảnh công khai.");

  // 6. Định nghĩa 3 chiến dịch
  const now = new Date();
  const endDate1 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 ngày sau
  const endDate2 = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000); // 45 ngày sau
  const endDate3 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 ngày sau

  const campaignsData = [
    {
      title: "Chung tay xây cầu dân sinh và điểm trường cho trẻ em vùng cao Mù Cang Chải",
      slugBase: "xay-cau-dan-sinh-diem-truong-mu-cang-chai",
      shortDescription:
        "Dự án hỗ trợ xây dựng cây cầu kiên cố bắc qua suối lũ và kiên cố hóa 2 phòng học mầm non tại bản Lao Chải, Mù Cang Chải giúp hơn 120 em nhỏ đến trường an toàn.",
      story: `### 1. Bối cảnh thực tế tại bản Lao Chải
Bản Lao Chải nằm sâu giữa những triền đồi dốc đứng của huyện Mù Cang Chải. Cứ mỗi độ mùa mưa lũ về từ tháng 6 đến tháng 10, con suối Đôi nước cuồn cuộn chảy xiết, chia cắt hoàn toàn 80 hộ dân cùng hơn 120 em học sinh mầm non và tiểu học với trường lớp bên kia bờ suối.

Hiện tại, các em nhỏ và thầy cô chỉ có thể đi qua một chiếc cầu tre tạm bợ, mỗi lần mưa to nước dâng cao là cầu bị cuốn trôi. Nhiều em học sinh phải nghỉ học hàng tuần liền, việc đi lại tìm con chữ vô cùng nguy hiểm.

### 2. Mục tiêu chiến dịch gây quỹ
- **Xây mới 01 cây cầu bê tông cốt thép dân sinh**: Dài 18m, rộng 2.5m, tải trọng 2.5 tấn, có lan can an toàn cho người đi bộ và xe máy.
- **Tu sửa và kiên cố hóa 02 phòng học điểm trường Mầm non**: Lợp mái tôn cách nhiệt, lát gạch men, trang bị bàn ghế mới và hệ thống đèn chiếu sáng đạt chuẩn.
- **Lắp đặt hệ thống lọc nước sạch**: Đảm bảo nguồn nước uống vệ sinh hàng ngày cho các em học sinh.

### 3. Dự toán kinh phí thực hiện
1. Chi phí vật liệu xây dựng cầu (xi măng, sắt thép, đá cát, vận chuyển núi cao): **95.000.000 VNĐ**
2. Chi phí sửa chữa phòng học và trang thiết bị học tập: **40.000.000 VNĐ**
3. Hệ thống bồn nước inox và lọc nước giếng khoan: **15.000.000 VNĐ**
👉 **Tổng ngân sách dự kiến:** **150.000.000 VNĐ**

### 4. Cam kết minh bạch và đối soát (Nghị định 93/2021/NĐ-CP)
Chúng tôi cam kết 100% số tiền quyên góp được sẽ sử dụng đúng mục đích. Mọi khoản chi tiêu sẽ có hóa đơn đỏ (VAT), biên bản nghiệm thu công trình có chữ ký của Ủy ban Nhân dân xã và ban giám hiệu nhà trường, được cập nhật công khai tại mục Minh chứng & Giải ngân của chiến dịch.`,
      coverImageUrl: imgMain,
      targetAmount: 150000000,
      currentAmount: 32500000,
      donorCount: 18,
      categoryId: catEdu.id,
      mediaList: [
        { url: img1, caption: "Chiếc cầu tre tạm bợ thường xuyên bị lũ cuốn trôi" },
        { url: imgWebp, caption: "Điểm trường mầm non xuống cấp cần được kiên cố hóa" },
      ],
      beneficiaryInfo: JSON.stringify({
        representativeName: "UBND Xã Lao Chải & Thầy Hiệu Trưởng Điểm Trường",
        idCardNumber: "001201009999",
        phone: "0344812391",
        address: "Bản Lao Chải, Huyện Mù Cang Chải, Tỉnh Yên Bái",
        communityLink: "/community",
      }),
    },
    {
      title: "Tiếp sức phẫu thuật tim cứu sống các em nhỏ có hoàn cảnh đặc biệt khó khăn",
      slugBase: "tiep-suc-phau-thuat-tim-cho-em-nho-kho-khan",
      shortDescription:
        "Chương trình tài trợ chi phí phẫu thuật tim bẩm sinh cho 3 em nhỏ gia đình hộ nghèo tại Bệnh viện Tim Hà Nội, mở ra cơ hội có được trái tim khỏe mạnh.",
      story: `### 1. Trái tim thơ dại đang cần được chữa lành
Mỗi năm tại Việt Nam có hàng ngàn trẻ em sinh ra mắc bệnh tim bẩm sinh. Nhiều em may mắn được phẫu thuật sớm, nhưng cũng có không ít hoàn cảnh nghèo khó phải ngày ngày nhìn con thoi thóp thở, môi tím tái vì cha mẹ không lo nổi số tiền phẫu thuật hàng chục triệu đồng sau khi trừ bảo hiểm y tế.

Chiến dịch lần này hướng tới hỗ trợ trực tiếp viện phí phẫu thuật cho 3 bé:
1. **Bé Nguyễn Minh An (2 tuổi, Quảng Nam)**: Thông liên thất lỗ lớn kèm tăng áp động mạch phổi.
2. **Bé Trần Gia Hân (4 tuổi, Nghệ An)**: Tứ chứng Fallot, gia đình thuộc diện hộ cận nghèo đặc biệt.
3. **Bé Lê Văn Bảo (18 tháng, Hà Tĩnh)**: Hẹp van động mạch chủ nặng, bố mẹ làm thuê kiếm từng bữa ăn.

### 2. Kế hoạch và Dự toán viện phí
- Bảo hiểm y tế thanh toán: ~60% chi phí.
- Phần đồng chi trả gia đình cần nộp: trung bình **30.000.000 VNĐ / ca**.
- Tổng kinh phí cần gây quỹ cho 3 bé: **90.000.000 VNĐ**.

### 3. Cơ chế giải ngân trực tiếp cho bệnh viện
Toàn bộ kinh phí sau khi chiến dịch kết thúc hoặc khi các bé có lịch mổ sẽ được chuyển khoản đối soát trực tiếp vào tài khoản tạm ứng viện phí của Bệnh viện Tim theo quy định. Hồ sơ bệnh án, phiếu thu viện phí và giấy báo xuất viện sẽ được chụp ảnh đăng tải chi tiết trên trang chiến dịch.`,
      coverImageUrl: img2,
      targetAmount: 90000000,
      currentAmount: 48600000,
      donorCount: 31,
      categoryId: catMed.id,
      mediaList: [
        { url: img4, caption: "Hình ảnh bé Minh An tại phòng khám chuyên khoa tim" },
        { url: img5, caption: "Hồ sơ bệnh án và chỉ định phẫu thuật của hội đồng y khoa" },
      ],
      beneficiaryInfo: JSON.stringify({
        representativeName: "Đại diện gia đình 3 bệnh nhi & Phòng CTXH Bệnh viện",
        idCardNumber: "001201009999",
        phone: "0344812391",
        address: "Bệnh viện Tim Hà Nội, Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
        communityLink: "/community",
      }),
    },
    {
      title: "Chuyến xe yêu thương: Cứu trợ khẩn cấp lương thực và nước sạch cho đồng bào vùng lũ",
      slugBase: "chuyen-xe-yeu-thuong-cuu-tro-vung-lu",
      shortDescription:
        "Quyên góp 500 phần quà cứu trợ gồm gạo, mì, nước tinh khiết, thuốc men và áo phao khẩn cấp gửi tới bà con đang bị cô lập bởi đợt lũ quét vừa qua.",
      story: `### 1. Lũ dâng cao, hàng trăm hộ dân bị cô lập
Đợt mưa bão kéo dài vừa qua đã khiến nhiều xã vùng trũng bị ngập sâu từ 1 đến 2 mét. Hàng trăm ngôi nhà bị cô lập hoàn toàn, nguồn nước giếng bị ô nhiễm nặng, lương thực cạn kiệt, mất điện diện rộng. Người già và trẻ nhỏ đang rất cần những gói cứu trợ khẩn cấp để vượt qua những ngày khó khăn trước mắt.

### 2. Nội dung các phần quà cứu trợ (500 suất)
Mỗi suất quà trị giá **240.000 VNĐ** bao gồm:
- 10kg gạo sạch đóng bao ni lông chống nước.
- 01 thùng mì tôm + 01 lốc nước suối tinh khiết (5 lít).
- Gói y tế gia đình: Thuốc cảm sốt, thuốc đau bụng, bông băng, dầu gió, thuốc lọc nước Aquatabs.
- 01 chiếc đèn pin năng lượng mặt trời.

### 3. Tổng ngân sách dự kiến
- 500 suất quà x 240.000 VNĐ = **120.000.000 VNĐ**.
- Chi phí vận chuyển và thuyền cứu hộ: Được các đơn vị tài trợ xe tải miễn phí 100%.

### 4. Kế hoạch phát quà trực tiếp
Đội tình nguyện viên phối hợp cùng lực lượng cứu hộ địa phương sẽ dùng xuồng máy tiếp cận từng hộ gia đình bị ngập sâu để trao quà tận tay bà con. Danh sách người nhận và hình ảnh ký nhận sẽ được ghi chép và đăng tải minh bạch ngay sau đợt cứu trợ.`,
      coverImageUrl: img3,
      targetAmount: 120000000,
      currentAmount: 76200000,
      donorCount: 54,
      categoryId: catRelief.id,
      mediaList: [
        { url: img1, caption: "Hình ảnh ngập lụt tại các hộ dân vùng trũng" },
        { url: img2, caption: "Công tác chuẩn bị nhu yếu phẩm đóng gói chống thấm nước" },
      ],
      beneficiaryInfo: JSON.stringify({
        representativeName: "Mặt trận Tổ quốc & Hội Chữ thập đỏ địa phương",
        idCardNumber: "001201009999",
        phone: "0344812391",
        address: "Khu vực huyện miền núi ngập lụt",
        communityLink: "/community",
      }),
    },
  ];

  // 7. Tạo từng chiến dịch trong Database
  for (let i = 0; i < campaignsData.length; i++) {
    const c = campaignsData[i];
    const uniqueSlug = `${c.slugBase}-${Date.now().toString().slice(-4)}${i + 1}`;

    const createdCampaign = await prisma.campaign.create({
      data: {
        fundraiserId: user.id,
        categoryId: c.categoryId,
        title: c.title,
        slug: uniqueSlug,
        shortDescription: c.shortDescription,
        story: c.story,
        coverImageUrl: c.coverImageUrl,
        targetAmount: c.targetAmount,
        currentAmount: c.currentAmount,
        donorCount: c.donorCount,
        startDate: now,
        endDate: i === 0 ? endDate1 : i === 1 ? endDate2 : endDate3,
        status: CampaignStatus.ACTIVE,
        bankAccountNumber: "1020369607",
        bankName: "Ngân hàng Ngoại thương Việt Nam (Vietcombank)",
        bankAccountName: "TRAN BAO LONG",
        beneficiaryInfo: c.beneficiaryInfo,
      },
    });

    // Thêm các ảnh media phụ cho chiến dịch
    for (let mIdx = 0; mIdx < c.mediaList.length; mIdx++) {
      const m = c.mediaList[mIdx];
      await prisma.campaignMedia.create({
        data: {
          campaignId: createdCampaign.id,
          mediaType: "IMAGE",
          url: m.url,
          caption: m.caption,
          sortOrder: mIdx + 1,
        },
      });
    }

    console.log(`🎉 [Chiến dịch ${i + 1}] Tạo thành công: "${createdCampaign.title}" (ID: ${createdCampaign.id}, Slug: ${createdCampaign.slug})`);
  }

  console.log("✨ Hoàn tất toàn bộ việc tạo 3 chiến dịch với tài khoản tranbaolong5b@gmail.com!");
}

main()
  .catch((err) => {
    console.error("❌ Lỗi khi tạo dữ liệu:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
