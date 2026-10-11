import { useState } from "react";
import { Link } from "react-router-dom";
import { donationApi, formatCurrency, formatDate } from "../services/api";
import { downloadCsv, listResult } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import { Empty, Pager, RemoteState, Status } from "./ui/WorkspaceUI";
export default function DonationHistory({
  admin = false,
}: {
  admin?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const result = useRemote(
    () =>
      (admin
        ? donationApi.getAllForAdmin({
            page,
            limit: 10,
            status: status || undefined,
          })
        : donationApi.getMyDonations({ page, limit: 10 })
      ).then(listResult),
    [page, status, admin],
  );
  return (
    <>
      <div className="actions">
        {admin && (
          <select
            aria-label="Trạng thái giao dịch"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Đang chờ</option>
            <option value="SUCCESS">Thành công</option>
            <option value="FAILED">Thất bại</option>
            <option value="REFUNDED">Đã hoàn tiền</option>
          </select>
        )}
        <button className="button secondary" onClick={result.reload}>
          Làm mới
        </button>
        <button
          className="button secondary"
          disabled={!result.data?.items.length}
          onClick={() =>
            downloadCsv(
              "lich-su-dong-gop.csv",
              [
                "Mã giao dịch",
                "Chiến dịch",
                "Số tiền VND",
                "Trạng thái",
                "Ngày tạo",
              ],
              result.data!.items.map((d) => [
                d.transactionCode,
                d.campaign?.title,
                d.amount,
                d.paymentStatus,
                d.createdAt,
              ]),
            )
          }
        >
          Xuất CSV trang hiện tại
        </button>
      </div>
      <RemoteState {...result} />
      {result.data &&
        (result.data.items.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Chiến dịch / Giao dịch</th>
                    <th>Số tiền</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.items.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <strong>{d.campaign?.title || d.campaignId}</strong>
                        <small>{d.transactionCode}</small>
                      </td>
                      <td>{formatCurrency(Number(d.amount))}</td>
                      <td>
                        <Status value={d.paymentStatus} />
                      </td>
                      <td>{formatDate(d.createdAt)}</td>
                      <td>
                        <Link to={`/donations/${d.id}`}>Xem giao dịch →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pages={result.data.pages} onChange={setPage} />
          </>
        ) : (
          <Empty>
            Bạn chưa có giao dịch phù hợp.{" "}
            <Link to="/campaigns">Khám phá chiến dịch</Link>
          </Empty>
        ))}
    </>
  );
}
