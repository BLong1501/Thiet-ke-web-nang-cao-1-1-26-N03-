import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { donationService } from './modules/donations/donation.service';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`🚀 Crowdfunding Backend Server is running!`);
  console.log(`🔗 Local URL: http://localhost:${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/v1/health`);
  console.log(`=============================================`);
});

// Runs without incoming traffic. A persistent backend process must remain running.
const expire = () => donationService.expireCampaigns().catch(() => console.error('Không thể đóng chiến dịch hết hạn; sẽ thử lại sau 60 giây.'));
void expire();
setInterval(expire, 60000).unref();
