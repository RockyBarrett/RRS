import Link from "next/link";
import UploadClient from "./upload-client";
import { cardStyle, cardPad, subtleText } from "@/app/admin/_ui";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function ImportPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto" }}>
      <Link href={`/admin/employers/${id}`} style={{ fontSize: 14 }}>
        ← Back to Employer Dashboard
      </Link>

      <h1 style={{ marginBottom: 6, marginTop: 14 }}>
        Import Employees (CSV)
      </h1>

      <p style={{ ...subtleText, marginTop: 0 }}>
        Upload a CSV and we’ll generate tokens + notice links automatically.
      </p>

      {/* Recommended Columns Card */}
      <div style={{ ...cardStyle, ...cardPad, marginTop: 18 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>
          Recommended columns
        </div>

        <pre
          style={{
            margin: 0,
            background: "#f9fafb",
            padding: 12,
            borderRadius: 10,
            overflowX: "auto",
            border: "1px solid #e5e7eb",
            fontSize: 13,
          }}
        >
employee_ref,first_name,last_name,email,phone,annual_savings_dollars,eligible
        </pre>

        <div
          style={{
            marginTop: 12,
            ...subtleText,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <div>
            • <strong style={{ color: "#111827" }}>email</strong> is required.
          </div>
          <div>
            • <strong style={{ color: "#111827" }}>eligible</strong> defaults to
            true if blank.
          </div>
          <div>
            •{" "}
            <strong style={{ color: "#111827" }}>
              annual_savings_dollars
            </strong>{" "}
            can be like <code>1400</code> or <code>$1,400</code>.
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div style={{ marginTop: 22 }}>
        <UploadClient employerId={id} />
      </div>
    </main>
  );
}