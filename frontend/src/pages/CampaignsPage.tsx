import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { campaignApi } from "../services/api";
import { listResult, normalizeCampaign, payload } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import CampaignCard from "../components/ui/CampaignCard";
import {
  Page,
  Empty,
  RemoteState,
  Pager,
  CampaignGridSkeleton,
} from "../components/ui/WorkspaceUI";
export default function CampaignsPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = params.get("search") || "";
  const categoryId = params.get("category") || "";
  const sortBy = params.get("sort") || "newest";
  const categories = useRemote(
    () => campaignApi.getCategories().then(payload),
    [],
    { key: "categories", staleTime: 5 * 60_000 },
  );
  const result = useRemote(
    () =>
      campaignApi
        .getAll({
          page,
          limit: 9,
          search: search || undefined,
          categoryId: categoryId || undefined,
          sortBy,
        })
        .then(listResult),
    [page, search, categoryId, sortBy],
    { keepPrevious: true },
  );
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.delete("page");
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }
  const totalPages = result.data?.pages;
  useEffect(() => {
    // Nếu trang hiện tại vượt quá số trang thực tế, quay về trang cuối.
    if (totalPages && page > totalPages) {
      const next = new URLSearchParams(params);
      next.set("page", String(totalPages));
      setParams(next);
    }
  }, [totalPages, page, params, setParams]);
  return (
    <Page
      title="Những điều tốt đẹp bắt đầu từ bạn"
      intro="Khám phá chiến dịch, tìm hiểu câu chuyện và lựa chọn cách bạn muốn đóng góp."
      actions={
        <Link className="button" to="/campaigns/create">
          Tạo chiến dịch
        </Link>
      }
    >
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          filter(
            "search",
            String(new FormData(e.currentTarget).get("search") || "").trim(),
          );
        }}
      >
        <input
          aria-label="Tìm chiến dịch"
          name="search"
          type="search"
          key={search}
          defaultValue={search}
          placeholder="Tìm theo tên, câu chuyện…"
        />
        <button className="button">Tìm kiếm</button>
        <select
          aria-label="Danh mục"
          value={categoryId}
          onChange={(e) => filter("category", e.target.value)}
        >
          <option value="">Tất cả danh mục</option>
          {categories.data?.map(
            (c: { id: string; name: string; slug?: string }) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ),
          )}
        </select>
        <select
          aria-label="Sắp xếp"
          value={sortBy}
          onChange={(e) => filter("sort", e.target.value)}
        >
          <option value="newest">Mới nhất</option>
          <option value="most_funded">Nhiều đóng góp</option>
          <option value="ending_soon">Sắp kết thúc</option>
          <option value="target_amount">Mục tiêu gây quỹ</option>
        </select>
        {(search || categoryId) && (
          <button
            type="button"
            className="button secondary"
            onClick={() => setParams({})}
          >
            Xóa bộ lọc
          </button>
        )}
      </form>
      <RemoteState {...categories} />
      <RemoteState {...result} skeleton={<CampaignGridSkeleton count={6} />} />
      {result.data && (
        <>
          <p>{result.data.total} chiến dịch</p>
          {result.data.items.length ? (
            <div className="campaign-grid">
              {result.data.items.map((c) => (
                <CampaignCard key={c.id} campaign={normalizeCampaign(c)} />
              ))}
            </div>
          ) : (
            <Empty>
              Chưa có chiến dịch phù hợp. Thử tìm kiếm với từ khóa khác.
            </Empty>
          )}
          <Pager
            page={page}
            pages={result.data.pages}
            onChange={(p) => {
              const next = new URLSearchParams(params);
              next.set("page", String(p));
              setParams(next);
            }}
          />
        </>
      )}
    </Page>
  );
}
