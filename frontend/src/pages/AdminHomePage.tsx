import { Link } from "react-router-dom";
import {
  campaignApi,
  verificationApi,
  userApi,
  donationApi,
} from "../services/api";
import { listResult } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import { Page, RemoteState } from "../components/ui/WorkspaceUI";
import AdminNav from "../components/AdminNav";
import DonationHistory from "../components/DonationHistory";
export default function AdminHomePage() {
  const result = useRemote(async () => {
    const responses = await Promise.all([
      campaignApi.getPending({ limit: 1 }),
      verificationApi.getPending({ limit: 1 }),
      userApi.getUsers({ limit: 1 }),
      donationApi.getAllForAdmin({ limit: 1 }),
    ]);
    return responses.map((r) => listResult(r).total);
  });
  return (
    <Page
      title="Trung tâm quản trị"
      intro="Xét duyệt nội dung và theo dõi hoạt động của hệ thống."
    >
      <AdminNav />
      <RemoteState {...result} />
      {result.data && (
        <div className="stats-grid">
          {[
            ["Chiến dịch chờ duyệt", "/admin/campaigns"],
            ["Hồ sơ KYC chờ duyệt", "/admin/verifications"],
            ["Người dùng", "/admin/users"],
            ["Giao dịch", "/admin/donations"],
          ].map(([label, to], i) => (
            <Link className="panel" key={to} to={to}>
              <small>{label}</small>
              <strong className="stat-number">{result.data![i]}</strong>
              <span>Xem chi tiết →</span>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}
export function AdminDonationsPage() {
  return (
    <Page title="Quản lý giao dịch">
      <AdminNav />
      <DonationHistory admin />
    </Page>
  );
}
