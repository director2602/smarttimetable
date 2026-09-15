import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-900 via-brand-700 to-brand-900 text-white">
      <div className="max-w-5xl mx-auto px-6 py-20 flex flex-col items-center text-center">
        <Image src="/logo.png" alt="S-CUBUS" width={140} height={160} priority className="drop-shadow-lg" />

        <h1 className="mt-8 text-3xl md:text-4xl font-bold tracking-tight">
          S-CUBUS Timetable Management
        </h1>
        <p className="mt-3 text-brand-50/80 max-w-xl">
          Automatic, constraint-based timetable scheduling for NEET, IIT-JEE and Foundation batches —
          built for S-CUBUS.
        </p>

        <div className="mt-6 flex items-center gap-3 text-accent-500 font-medium">
          <span>समर्पण</span>
          <span className="text-white/30">•</span>
          <span>सुनिश्चित</span>
          <span className="text-white/30">•</span>
          <span>सफलता</span>
        </div>

        <Link
          href="/login"
          className="mt-10 inline-flex items-center justify-center rounded-lg bg-accent-500 hover:bg-accent-600 px-8 py-3 font-semibold text-white shadow-lg transition-colors"
        >
          Sign in to continue
        </Link>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur">
            <div className="text-accent-500 font-semibold mb-1">Automatic Generation</div>
            <p className="text-sm text-brand-50/70">
              A real constraint-based scheduling engine — not a random assigner — builds conflict-free
              weekly timetables from your courses, batches, faculty and rooms.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur">
            <div className="text-accent-500 font-semibold mb-1">Full Transparency</div>
            <p className="text-sm text-brand-50/70">
              When something can't be scheduled, you get the exact reason — faculty availability, room
              capacity, workload limits — never a silent failure.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur">
            <div className="text-accent-500 font-semibold mb-1">Built for NEET · IIT-JEE · Foundation</div>
            <p className="text-sm text-brand-50/70">
              Every course from 8th Foundation through 12th Pass NEET/JEE, with role-based access for
              your whole team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
