import ComplianceView from "@/app/_components/compliance/ComplianceView";
import { requireHrForEmployer } from "@/lib/auth";

export default async function HrCompliancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireHrForEmployer(id);

  return <ComplianceView mode="hr" employerId={id} />;
}