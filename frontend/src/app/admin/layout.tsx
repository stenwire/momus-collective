import type { Metadata } from "next";
import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: "Admin | momus collective",
  robots: { index: false, follow: false },
};

// D-094: the staff panel lives in the storefront, on the same session.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="admin-shell flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
          <AdminNav />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </AdminGuard>
  );
}
