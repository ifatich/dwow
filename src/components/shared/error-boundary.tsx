"use client";

import { Component, type ReactNode } from "react";
import Link from "next/link";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-xl text-center">
          <div className="text-[64px] mb-lg">⚠️</div>
          <h2 className="text-[20px] font-[540] text-ink mb-sm">Terjadi Kesalahan</h2>
          <p className="text-[13px] text-ink/35 max-w-[400px] mb-lg">
            Gagal memuat halaman ini. Silakan coba lagi atau kembali ke Dashboard.
          </p>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre className="text-[11px] text-red-500 bg-red-50 rounded-lg p-md mb-lg max-w-[500px] overflow-auto font-mono text-left">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-sm">
            <button
              type="button"
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="h-[40px] rounded-lg px-lg text-[13px] font-[480] bg-primary text-on-primary hover:opacity-90 cursor-pointer"
            >
              Coba Lagi
            </button>
            <Link
              href="/"
              className="h-[40px] rounded-lg px-lg text-[13px] font-[480] bg-surface-soft text-ink/60 hover:bg-hairline inline-flex items-center"
            >
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
