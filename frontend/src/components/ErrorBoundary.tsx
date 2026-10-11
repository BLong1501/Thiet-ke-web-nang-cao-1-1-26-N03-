import { Component, type ReactNode } from "react";
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="workspace container">
        <h1>Trang gặp sự cố</h1>
        <p>
          Vui lòng tải lại để tiếp tục. Dữ liệu đã lưu trên máy chủ vẫn được
          giữ.
        </p>
        <button className="button" onClick={() => window.location.reload()}>
          Tải lại trang
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
