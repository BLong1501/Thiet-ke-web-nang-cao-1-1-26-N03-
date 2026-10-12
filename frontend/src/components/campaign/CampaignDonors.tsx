import { lazy, Suspense, useState } from "react";
import { donationApi, formatCurrency, formatDate } from "../../services/api";
import { listResult } from "../../services/platform";
import { useRemote } from "../../hooks/useRemote";
import { Empty, Pager, RemoteState } from "../ui/WorkspaceUI";

// Recharts khá nặng nên chỉ tải khi người dùng mở tab này.
const ProgressChart = lazy(() => import("../ProgressChart"));
export default function CampaignDonors({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const result = useRemote(
    () =>
      donationApi
        .getCampaignDonations(id, { page, limit: 10 })
        .then(listResult),
    [id, page],
    { keepPrevious: true },
  );
  return (
    <>
      <h2>Những tấm lòng đồng hành</h2>
      {/* Recharts khá nặng nên chỉ tải khi người dùng mở tab này */}
      <Suspense fallback={<p role="status">Đang tải biểu đồ…</p>}>
        <ProgressChart campaignId={id} />
      </Suspense>
      <RemoteState {...result} />
      {result.data && (
        <>
          {result.data.items.length ? (
            result.data.items.map((d) => (
              <article className="donor-row" key={d.id}>
                <div>
                  <strong>
                    {d.isAnonymous
                      ? "Nhà hảo tâm ẩn danh"
                      : d.donorName || "Nhà hảo tâm"}
                  </strong>
                  <p>{d.message}</p>
                  <small>{formatDate(d.paidAt || d.createdAt)}</small>
                </div>
                <strong>{formatCurrency(Number(d.amount))}</strong>
              </article>
            ))
          ) : (
            <Empty>Chưa có đóng góp được xác nhận.</Empty>
          )}
          <Pager page={page} pages={result.data.pages} onChange={setPage} />
        </>
      )}
    </>
  );
}
