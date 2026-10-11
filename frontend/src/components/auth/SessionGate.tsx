import { useEffect, useState, type ReactNode } from "react";
import { authApi } from "../../services/api";
import { errorMessage, normalizeUser, payload } from "../../services/platform";
import { useAuthStore } from "../../store/authStore";
import { Notice } from "../ui/WorkspaceUI";

export default function SessionGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!useAuthStore.getState().token);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!useAuthStore.getState().token) {
      setReady(true);
      return;
    }
    let active = true;
    authApi
      .me()
      .then((r) => {
        if (active && useAuthStore.getState().token)
          useAuthStore.getState().updateUser(normalizeUser(payload(r)));
      })
      .catch((e) => {
        if (active && useAuthStore.getState().token) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  if (!ready)
    return (
      <div className="loading-state" role="status">
        Đang kiểm tra phiên đăng nhập…
      </div>
    );
  if (error)
    return (
      <div className="workspace container">
        <Notice error>
          {error}
          <div className="actions">
            <button
              className="button"
              onClick={() => {
                setError("");
                setReady(false);
                setAttempt((v) => v + 1);
              }}
            >
              Thử lại
            </button>
            <button
              className="button secondary"
              onClick={() => {
                useAuthStore.getState().logout();
                setError("");
              }}
            >
              Tiếp tục với tư cách khách
            </button>
          </div>
        </Notice>
      </div>
    );
  return <>{children}</>;
}
