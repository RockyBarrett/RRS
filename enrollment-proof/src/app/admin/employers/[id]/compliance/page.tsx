import ComplianceView from "@/app/_components/compliance/ComplianceView";

export default async function AdminCompliancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ComplianceView mode="admin" employerId={id} />;
}