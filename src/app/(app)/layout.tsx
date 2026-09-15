import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";

const NAV = [
  { section: "Overview", items: [{ href: "/dashboard", label: "Dashboard" }] },
  {
    section: "Master Data",
    items: [
      { href: "/academic-sessions", label: "Academic Sessions" },
      { href: "/courses", label: "Courses" },
      { href: "/batches", label: "Batches" },
      { href: "/subjects", label: "Subjects" },
      { href: "/faculty", label: "Faculty" },
      { href: "/rooms", label: "Rooms" },
      { href: "/time-slots", label: "Time Slots" },
      { href: "/holidays", label: "Holidays" }
    ]
  },
  {
    section: "Timetable",
    items: [
      { href: "/timetable/generate", label: "Generate Timetable" },
      { href: "/timetable", label: "Timetables" },
      { href: "/conflicts", label: "Conflicts" }
    ]
  },
  {
    section: "Administration",
    items: [
      { href: "/admin/users", label: "Users" },
      { href: "/settings", label: "Settings" }
    ]
  }
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-brand-900 text-white flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3">
          <Image src="/logo.png" alt="S-CUBUS" width={36} height={41} />
          <div>
            <div className="font-bold text-lg leading-tight">S-CUBUS</div>
            <div className="text-xs text-brand-100/70">Timetable Management</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {NAV.map((s) => (
            <div key={s.section}>
              <div className="text-[11px] uppercase tracking-wide text-brand-100/50 px-2 mb-1">{s.section}</div>
              {s.items.map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  className="block rounded-lg px-2 py-1.5 text-sm text-brand-50/90 hover:bg-white/10"
                >
                  {i.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10 text-xs">
          <div className="font-medium">{user.name}</div>
          <div className="text-brand-100/60">{user.role}</div>
          <form action="/logout" method="POST" className="mt-2">
            <button className="text-brand-100/80 hover:text-white underline">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
