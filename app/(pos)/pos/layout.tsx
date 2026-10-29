// The POS uses a per-request CSP nonce (see proxy.ts), which only works when pages are
// rendered per request — so never serve a prebuilt static copy of this page.
export const dynamic = "force-dynamic";

export default function POSSegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
