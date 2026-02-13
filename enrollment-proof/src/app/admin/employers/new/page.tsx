import Link from "next/link";
import NewEmployerClient from "./new-employer-client";
import { cardStyle, cardPad, subtleText } from "@/app/admin/_ui";

export const dynamic = "force-dynamic";

export default function NewEmployerPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto" }}>
      <Link href="/admin" style={{ fontSize: 14 }}>
        ← Back to Admin
      </Link>

      <h1 style={{ marginBottom: 6, marginTop: 14 }}>Create new enrollment</h1>
      <p style={{ ...subtleText, marginTop: 0 }}>
        Add an employer, then upload the employee CSV on the next screen.
        <br />
        This also enables compliance tracking for the plan year.
      </p>

      <div style={{ ...cardStyle, ...cardPad, marginTop: 18 }}>
        <NewEmployerClient />
      </div>
    </main>
  );
}