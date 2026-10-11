import { useState } from "react";
import { Link } from "react-router-dom";
import { campaignApi, formatCurrency } from "../services/api";
import { listResult } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import { useAuthStore } from "../store/authStore";
import {
  Page,
  Empty,
  Notice,
  Pager,
  RemoteState,
  Status,
} from "../components/ui/WorkspaceUI";
import DonationHistory from "../components/DonationHistory";
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const fundraiser = ["ADMIN", "FUNDRAISER"].includes(
    user?.role?.toUpperCase() || "",
  );
  const [tab, setTab] = useState(fundraiser ? "campaigns" : "donations");
  return (
    <Page
      title={`Xin chào, ${user?.name || "bạn"}`}
      intro="Theo dõi các hoạt động gây quỹ và đóng góp của bạn."
      actions={
        <Link
          className="button"
          to={fundraiser ? "/campaigns/create" : "/profile?tab=kyc"}
        >
          {fundraiser ? "Tạo chiến dịch" : "Đăng ký gây quỹ"}
        </Link>
      }
    >
      {!fundraiser && (
        <Notice>
          Bạn có thể đóng góp ngay. Để tạo chiến dịch, hãy gửi hồ sơ xác minh
          danh tính.
        </Notice>
      )}
      <nav className="tabs" aria-label="Bảng điều khiển">
        {fundraiser && (
          <button
            className={tab === "campaigns" ? "active" : ""}
            onClick={() => setTab("campaigns")}
          >
            Chiến dịch của tôi
          </button>
        )}
        <button
          className={tab === "donations" ? "active" : ""}
          onClick={() => setTab("donations")}
        >
          Đóng góp của tôi
        </button>
      </nav>
      {tab === "campaigns" && fundraiser ? (
        <MyCampaigns />
      ) : (
        <DonationHistory />
      )}
    </Page>
  );
}
function MyCampaigns() {
  const [page, setPage] = useState(1);
  const result = useRemote(
    () => campaignApi.getMyCampaigns({ page, limit: 10 }).then(listResult),
    [page],
  );
  return (
    <>
      <RemoteState {...result} />
      {result.data && (
        <>
          {result.data.items.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Chiến dịch</th>
                    <th>Trạng thái</th>
                    <th>Đã huy động / Mục tiêu</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.items.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/campaigns/${c.id}`}>{c.title}</Link>
                        <small>{c.category?.name}</small>
                      </td>
                      <td>
                        <Status value={c.status} />
                      </td>
                      <td>
                        {formatCurrency(Number(c.currentAmount))}
                        <small>
                          / {formatCurrency(Number(c.targetAmount))}
                        </small>
                      </td>
                      <td>
                        <Link to={`/campaigns/${c.id}`}>Quản lý</Link>
                        {["DRAFT", "PENDING_APPROVAL"].includes(c.status) && (
                          <>
                            {" "}
                            · <Link to={`/campaigns/${c.id}/edit`}>Sửa</Link>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>
              Bạn chưa tạo chiến dịch nào.{" "}
              <Link to="/campaigns/create">Bắt đầu gây quỹ</Link>
            </Empty>
          )}
          <Pager page={page} pages={result.data.pages} onChange={setPage} />
        </>
      )}
    </>
  );
}
