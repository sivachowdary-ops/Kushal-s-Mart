// The admin panel uses a per-request CSP nonce (see proxy.ts), which only works when pages are
// rendered per request — so never serve a prebuilt static copy of these pages.
export const dynamic = "force-dynamic";

export default function AdminSegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
