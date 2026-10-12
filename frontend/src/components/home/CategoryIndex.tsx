import { Link, useNavigate } from "react-router-dom";
import { LuArrowUpRight, LuLayers, LuSearch } from "react-icons/lu";
import { campaignApi } from "../../services/api";
import { payload, type RecordData } from "../../services/platform";
import { useRemote } from "../../hooks/useRemote";
import { RemoteState, Skeleton } from "../ui/WorkspaceUI";
import { categoryIcon } from "../ui/categoryIcon";

function countLabel(category: RecordData) {
  const count = category._count?.campaigns;
  if (typeof count !== "number") return null;
  return count > 0
    ? `${count.toLocaleString("vi-VN")} chiến dịch đang gây quỹ`
    : "Chưa có chiến dịch đang mở";
}

/** Tìm kiếm nhanh + mục lục danh mục; liên kết dùng đúng tham số lọc của trang Chiến dịch. */
export default function CategoryIndex() {
  const navigate = useNavigate();
  const categories = useRemote(
    () => campaignApi.getCategories().then(payload),
    [],
    { key: "categories", staleTime: 5 * 60_000 },
  );
  const list: RecordData[] = Array.isArray(categories.data)
    ? categories.data
    : [];

  return (
    <div className="home-explore">
      <form
        className="filters home-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = String(
            new FormData(e.currentTarget).get("search") || "",
          ).trim();
          navigate(
            q ? `/campaigns?search=${encodeURIComponent(q)}` : "/campaigns",
          );
        }}
      >
        <LuSearch className="home-search-icon" aria-hidden="true" />
        <input
          type="search"
          name="search"
          aria-label="Tìm chiến dịch theo tên hoặc mô tả"
          placeholder="Tìm theo tên hoặc mô tả chiến dịch…"
        />
        <button className="button">Tìm kiếm</button>
      </form>

      <RemoteState
        {...categories}
        skeleton={<Skeleton lines={2} label="Đang tải danh mục…" />}
      />
      {!categories.loading && (
        <ul className="home-categories">
          {list.map((category) => {
            const Icon = categoryIcon(category.slug);
            const count = countLabel(category);
            return (
              <li key={category.id}>
                <Link
                  className="home-category-link"
                  to={`/campaigns?category=${encodeURIComponent(category.id)}`}
                >
                  <Icon className="home-category-icon" aria-hidden="true" />
                  <span className="home-category-name">{category.name}</span>
                  {count && (
                    <span className="home-category-count">{count}</span>
                  )}
                  <LuArrowUpRight
                    className="home-category-arrow"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
          <li>
            <Link className="home-category-link" to="/campaigns">
              <LuLayers className="home-category-icon" aria-hidden="true" />
              <span className="home-category-name">Mọi lĩnh vực</span>
              <span className="home-category-count">
                Xem toàn bộ chiến dịch, lọc và sắp xếp
              </span>
              <LuArrowUpRight
                className="home-category-arrow"
                aria-hidden="true"
              />
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
