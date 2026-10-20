import { useState } from "react";
import { Link } from "react-router-dom";
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
  ["Hồ sơ KYC chờ duyệt", "/admin/verifications"],
  ["Người dùng", "/admin/users"],
  ["Giao dịch", "/admin/donations"],
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

  return (
    <section className="panel analytics-panel" aria-label={data?.title || kind}>
      <RemoteState {...result} />
      {error && <Notice error>{error}</Notice>}
      {data && (
        <>
          <div className="analytics-panel__head">
            <h2>{data.title}</h2>
            <button
              type="button"
              className="button secondary"
              onClick={download}
            >
              Xuất CSV toàn bộ báo cáo
            </button>
          </div>
          <p>{data.note}</p>
          <small>
            Cập nhật: {new Date(data.generatedAt).toLocaleString("vi-VN")}
          </small>
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
                    margin={{ left: 24, right: 16, bottom: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis
                      dataKey="label"
                      tickFormatter={(v) =>
                        String(v).length > 18
                          ? `${String(v).slice(0, 18)}…`
                          : String(v)
                      }
                    />
                    <YAxis
                      tickFormatter={(v) => `${Number(v) / 1000000} tr`}
                    />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Legend />
                    <Bar
                      dataKey="received"
                      name="Đã thu"
                      fill={CHART.received}
                    />
                    <Bar
                      dataKey="refunded"
                      name="Đã hoàn"
                      fill={CHART.refunded}
                    />
                    <Bar dataKey="net" name="Ròng" fill={CHART.net} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="table-wrap">
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
      verificationApi.getPending({ limit: 1 }),
      userApi.getUsers({ limit: 1 }),
      donationApi.getAllForAdmin({ limit: 1 }),
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

      <section className="admin-overview-analytics" aria-labelledby="analytics-heading">
        <h2 id="analytics-heading" className="admin-section-title">
          Báo cáo thống kê
        </h2>
        <p className="admin-section-intro">
          Ba báo cáo từ sổ cái, lọc theo thời gian và xuất CSV.
        </p>
        <form
          className="analytics-filters"
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
          <label>
            Từ ngày
            <input
              type="date"
              required
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button className="button" type="submit">
            Xem báo cáo
          </button>
        </form>
        {rangeError && <Notice error>{rangeError}</Notice>}
        {reports.map(([kind]) => (
          <AnalyticsPanel key={kind} kind={kind} {...range} />
        ))}
      </section>
    </Page>
  );
}

export function AdminDonationsPage() {
  return (
    <Page title="Quản lý giao dịch">
      <DonationHistory admin />
    </Page>
  );
}
