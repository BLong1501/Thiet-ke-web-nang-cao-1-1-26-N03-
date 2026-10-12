import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { donationApi, formatCurrency, formatDate } from "../services/api";
import { payload } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import { Empty, Notice, RemoteState } from "./ui/WorkspaceUI";

interface Point {
  date: string;
  amount: number;
  donors: number;
  cumulative: number;
}
interface Timeline {
  target: number;
  raised: number;
  points: Point[];
}

/** Rút gọn số tiền trên trục: 1.500.000 -> "1,5 tr". */
const short = (v: number) =>
  v >= 1_000_000_000
    ? `${(v / 1_000_000_000).toFixed(1)} tỷ`
    : v >= 1_000_000
      ? `${(v / 1_000_000).toFixed(1)} tr`
      : v >= 1_000
        ? `${Math.round(v / 1_000)}k`
        : String(v);

export default function ProgressChart({ campaignId }: { campaignId: string }) {
  const result = useRemote<Timeline>(
    () => donationApi.getCampaignTimeline(campaignId).then(payload),
    [campaignId],
  );
  const data = result.data;
  // Chiến dịch đã tải được nên 404 ở đây nghĩa là máy chủ chưa cung cấp endpoint timeline.
  const unavailable = result.status === 404;

  return (
    <section aria-labelledby="progress-chart-title" className="progress-chart">
      <h3 id="progress-chart-title">Tiến độ gây quỹ theo thời gian</h3>
      {unavailable ? (
        <Notice>
          Dữ liệu tiến độ đang được cập nhật. Số tiền đã nhận ở phần tóm tắt và
          danh sách đóng góp bên dưới vẫn lấy trực tiếp từ máy chủ.
        </Notice>
      ) : (
        <RemoteState {...result} />
      )}
      {data &&
        (data.points.length === 0 ? (
          <Empty>Chưa có khoản đóng góp nào được xác nhận để vẽ biểu đồ.</Empty>
        ) : (
          <>
            <div
              role="img"
              aria-label={`Biểu đồ lũy kế số tiền đã nhận, hiện ${formatCurrency(
                data.raised,
              )} trên mục tiêu ${formatCurrency(data.target)}.`}
              style={{ width: "100%", height: 260 }}
            >
              <ResponsiveContainer>
                <AreaChart
                  data={data.points}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="raisedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#2563EB"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor="#2563EB"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => formatDate(d).slice(0, 5)}
                    minTickGap={24}
                  />
                  <YAxis
                    tickFormatter={short}
                    width={56}
                    domain={[0, (max: number) => Math.max(max, data.target)]}
                  />
                  <Tooltip
                    formatter={(v, name) => [
                      formatCurrency(Number(v)),
                      name === "cumulative" ? "Lũy kế" : "Trong ngày",
                    ]}
                    labelFormatter={(d) => formatDate(String(d))}
                  />
                  <ReferenceLine
                    y={data.target}
                    stroke="#047857"
                    strokeDasharray="6 4"
                    label={{
                      value: "Mục tiêu",
                      position: "insideTopLeft",
                      fill: "#047857",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fill="url(#raisedFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Bảng dữ liệu thay thế cho người dùng trình đọc màn hình */}
            <details>
              <summary>Xem dữ liệu dạng bảng</summary>
              <div className="table-wrap">
                <table>
                  <caption className="visually-hidden">
                    Số tiền nhận được theo ngày
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Ngày</th>
                      <th scope="col">Trong ngày</th>
                      <th scope="col">Số lượt</th>
                      <th scope="col">Lũy kế</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.points.map((p) => (
                      <tr key={p.date}>
                        <td>{formatDate(p.date)}</td>
                        <td>{formatCurrency(p.amount)}</td>
                        <td>{p.donors}</td>
                        <td>{formatCurrency(p.cumulative)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        ))}
    </section>
  );
}
