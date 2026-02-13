export function buildComplianceReminderEmail(opts: {
  name: string;
  attentivePortalLink: string; // ✅ REQUIRED (no fallback)
  employerName: string;
  supportEmail: string;
}) {
  const firstName = (opts.name || "").split(" ")[0]?.trim() || "there";

  // Hard safety: do not allow empty links
  if (!opts.attentivePortalLink || !opts.attentivePortalLink.trim()) {
    throw new Error("Missing attentivePortalLink for compliance reminder email.");
  }

  return {
    subject: `Action required: Annual portal login (${opts.employerName})`,
    text: `
Hi ${firstName},

${opts.employerName}'s new plan year is underway, and we're reaching out to remind you to log in to your Attentive benefits portal.

Did you know that through Attentive you already have 24/7 access to Telemedicine, a top-tier EAP (Employee Assistance Program), virtual counseling, and more — all at no cost to you?

Logging in ensures:
- Your benefits access continues uninterrupted
- You remain compliant for the current plan year
- You can view and use available preventive care benefits

Please complete your login using your personal secure link:

${opts.attentivePortalLink}

If you've already completed this step, you can ignore this message.

Questions or need help? Contact:
${opts.supportEmail}

Best regards,
${opts.employerName} Benefits Team
`.trim(),
  };
}