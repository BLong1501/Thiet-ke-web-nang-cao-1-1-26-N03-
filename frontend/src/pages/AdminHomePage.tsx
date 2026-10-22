import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  LuCalendarRange,
  LuChartColumn,
  LuDownload,
} from "react-icons/lu";
import {
  campaignApi,
  verificationApi,
  userApi,
  donationApi,
  api,
  formatCurrency,
} from "../services/api";
import { listResult } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import {
  Page,
  RemoteState,
  Notice,
  Empty,
} from "../components/ui/WorkspaceUI";
import DonationHistory from "../components/DonationHistory";
import Tabs from "../components/ui/Tabs";
import AdminRefundRequestsTab from "../components/admin/AdminRefundRequestsTab";
import AdminRefundLogsTab from "../components/admin/AdminRefundLogsTab";

type Row = {
  id: string;
  label: string;
  donations: number;
  received: string;
  refunded: string;
  net: string;
};
type Report = {
  title: string;
  note: string;
  generatedAt: string;
  rows: Row[];
};

const reports = [
  ["daily", "Theo ngày"],
  ["campaigns", "Theo chiến dịch"],
  ["categories", "Theo danh mục"],
] as const;

const CHART = {
  received: "#216b93",
  refunded: "#92400e",
  net: "#047857",
  grid: "#dedfda",
} as const;

const QUICK_LINKS: [string, string][] = [
  ["Chiến dịch chờ duyệt", "/admin/campaigns"],
  ["Duyệt hoàn tiền", "/admin/refunds"],
  ["Hồ sơ KYC chờ duyệt", "/admin/verifications"],
  ["Người dùng", "/admin/users"],
  ["Giao dịch & Sổ cái", "/admin/donations"],
  ["Giải ngân & Chứng từ", "/admin/disbursements"],
];

function AnalyticsPanel({
  kind,
  from,
  to,
}: {
  kind: string;
  from: string;
  to: string;
}) {
  const result = useRemote<Report>(
    () =>
      api
        .get(`/admin/analytics/${kind}`, { params: { from, to } })
        .then((r) => r.data.data),
    [kind, from, to],
  );
  const [error, setError] = useState("");

  async function download() {
    try {
      setError("");
      const r = await api.get(`/admin/analytics/${kind}`, {
        params: { from, to, format: "csv" },
        responseType: "blob",
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kind}-${from}-${to}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Không xuất được file. Kiểm tra kết nối và thử lại.");
    }
  }

  const data = result.data;
  const chartRows =
    data?.rows.map((r) => ({
      ...r,
      received: Number(r.received),
      refunded: Number(r.refunded),
      net: Number(r.net),
    })) ?? [];

  const totals = chartRows.reduce(
    (acc, r) => ({
      donations: acc.donations + Number(r.donations || 0),
      received: acc.received + r.received,
      refunded: acc.refunded + r.refunded,
      net: acc.net + r.net,
    }),
    { donations: 0, received: 0, refunded: 0, net: 0 },
  );

  return (
    <section className="panel analytics-panel" aria-label={data?.title || kind}>
      <RemoteState {...result} />
      {error && <Notice error>{error}</Notice>}
      {data && (
        <>
          <div className="analytics-panel__head">
            <div>
              <h2>{data.title}</h2>
              <p className="analytics-panel__note">{data.note}</p>
              <time className="analytics-panel__meta" dateTime={data.generatedAt}>
                Cập nhật {new Date(data.generatedAt).toLocaleString("vi-VN")}
              </time>
            </div>
            <button
              type="button"
              className="button secondary analytics-export"
              onClick={download}
            >
              <LuDownload size={16} aria-hidden="true" />
              Xuất CSV
            </button>
          </div>

          {!!data.rows.length && (
            <div className="analytics-kpis" aria-label="Tổng hợp nhanh">
              <div className="analytics-kpi">
                <span>Số khoản</span>
                <strong>{totals.donations.toLocaleString("vi-VN")}</strong>
              </div>
              <div className="analytics-kpi analytics-kpi--received">
                <span>Đã thu</span>
                <strong>{formatCurrency(totals.received)}</strong>
              </div>
              <div className="analytics-kpi analytics-kpi--refunded">
                <span>Đã hoàn</span>
                <strong>{formatCurrency(totals.refunded)}</strong>
              </div>
              <div className="analytics-kpi analytics-kpi--net">
                <span>Ròng</span>
                <strong>{formatCurrency(totals.net)}</strong>
              </div>
            </div>
          )}

          {!data.rows.length ? (
            <Empty>Không có bút toán trong khoảng ngày này.</Empty>
          ) : (
            <>
              <div
                className="analytics-chart"
                role="img"
                aria-label={`Biểu đồ ${data.title}. Số liệu đầy đủ ở bảng ngay bên dưới.`}
              >
                <ResponsiveContainer>
                  <BarChart
                    data={chartRows}
                    margin={{ left: 8, right: 8, bottom: 16, top: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART.grid}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickFormatter={(v) =>
                        String(v).length > 14
                          ? `${String(v).slice(0, 14)}…`
                          : String(v)
                      }
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickFormatter={(v) => `${Number(v) / 1000000} tr`}
                    />
                    <Tooltip
                      formatter={(v) => formatCurrency(Number(v))}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #dedfda",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="received"
                      name="Đã thu"
                      fill={CHART.received}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="refunded"
                      name="Đã hoàn"
                      fill={CHART.refunded}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="net"
                      name="Ròng"
                      fill={CHART.net}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="table-wrap analytics-table">
                <table>
                  <caption>
                    {data.title}: {from} đến {to}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Nhóm</th>
                      <th scope="col">Số khoản</th>
                      <th scope="col">Đã thu</th>
                      <th scope="col">Đã hoàn</th>
                      <th scope="col">Ròng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={r.id}>
                        <th scope="row">{r.label}</th>
                        <td>{r.donations}</td>
                        <td>{formatCurrency(Number(r.received))}</td>
                        <td>{formatCurrency(Number(r.refunded))}</td>
                        <td>{formatCurrency(Number(r.net))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

export default function AdminHomePage() {
  const result = useRemote(async () => {
    const responses = await Promise.all([
      campaignApi.getPending({ limit: 1 }),
      donationApi.getAdminRefundRequests({ limit: 1, status: "PENDING" }),
      verificationApi.getPending({ limit: 1 }),
      userApi.getUsers({ limit: 1 }),
      donationApi.getAllForAdmin({ limit: 1 }),
      campaignApi.getAdminDisbursements({ limit: 1 }),
    ]);
    return responses.map((r) => listResult(r).total);
  });

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const [from, setFrom] = useState(`${today.slice(0, 4)}-01-01`);
  const [to, setTo] = useState(today);
  const [range, setRange] = useState({ from, to });
  const [rangeError, setRangeError] = useState("");
  const [kind, setKind] =
    useState<(typeof reports)[number][0]>("daily");

  return (
    <Page
      title="Tổng quan & Thống kê"
      intro="Theo dõi hoạt động hệ thống và báo cáo sổ cái theo thời gian."
    >
      <RemoteState {...result} />
      {result.data && (
        <div className="stats-grid">
          {QUICK_LINKS.map(([label, to], i) => (
            <Link className="panel" key={to} to={to}>
              <small>{label}</small>
              <strong className="stat-number">{result.data![i] ?? "—"}</strong>
              <span>Xem chi tiết →</span>
            </Link>
          ))}
        </div>
      )}

      <section
        className="admin-overview-analytics"
        aria-labelledby="analytics-heading"
      >
        <header className="analytics-hero">
          <div className="analytics-hero__icon" aria-hidden="true">
            <LuChartColumn size={22} />
          </div>
          <div>
            <p className="analytics-hero__eyebrow">Sổ cái FundTrust</p>
            <h2 id="analytics-heading" className="admin-section-title">
              Báo cáo thống kê
            </h2>
            <p className="admin-section-intro">
              Lọc theo khoảng ngày, xem biểu đồ và xuất CSV theo ngày, chiến
              dịch hoặc danh mục.
            </p>
          </div>
        </header>

        <form
          className="analytics-toolbar panel"
          onSubmit={(e) => {
            e.preventDefault();
            if (from > to) {
              setRangeError("Từ ngày phải trước hoặc bằng đến ngày");
              return;
            }
            setRangeError("");
            setRange({ from, to });
          }}
        >
          <div className="analytics-toolbar__dates">
            <span className="analytics-toolbar__badge" aria-hidden="true">
              <LuCalendarRange size={16} />
            </span>
            <label>
              Từ ngày
              <input
                type="date"
                required
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <span className="analytics-toolbar__sep" aria-hidden="true">
              →
            </span>
            <label>
              Đến ngày
              <input
                type="date"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
          <button className="button" type="submit">
            Áp dụng khoảng
          </button>
        </form>
        {rangeError && <Notice error>{rangeError}</Notice>}

        <div
          className="analytics-tabs"
          role="tablist"
          aria-label="Loại báo cáo"
        >
          {reports.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={kind === id}
              className={`analytics-tab ${kind === id ? "is-active" : ""}`}
              onClick={() => setKind(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <AnalyticsPanel kind={kind} {...range} />
      </section>
    </Page>
  );
}

export function AdminDonationsPage({
  defaultTab = "refunds",
}: {
  defaultTab?: "refunds" | "refund_logs" | "donations";
} = {}) {
  const [searchParams] = useSearchParams();
  const tabFromQuery = searchParams.get("tab") as
    | "refunds"
    | "refund_logs"
    | "donations"
    | null;

  const [activeTab, setActiveTab] = useState<
    "refunds" | "refund_logs" | "donations"
  >(tabFromQuery || defaultTab);

  return (
    <Page
      title="Quản lý giao dịch & Hoàn tiền"
      intro="Phê duyệt các yêu cầu hoàn tiền từ nhà hảo tâm, theo dõi nhật ký đối soát và lịch sử toàn bộ các khoản quyên góp."
    >
      <Tabs
        label="Quản lý giao dịch và hoàn tiền"
        tabs={[
          { id: "refunds", label: "Duyệt đơn hoàn tiền" },
          { id: "refund_logs", label: "Nhật ký duyệt hoàn tiền" },
          { id: "donations", label: "Tất cả giao dịch quyên góp" },
        ]}
        value={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      >
        {activeTab === "refunds" && <AdminRefundRequestsTab />}
        {activeTab === "refund_logs" && <AdminRefundLogsTab />}
        {activeTab === "donations" && <DonationHistory admin />}
      </Tabs>
    </Page>
  );
}
