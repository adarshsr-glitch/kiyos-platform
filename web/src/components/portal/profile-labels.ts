/** Plain-language names for profile fact keys. Unknown keys fall back to a tidy version. */

const LABELS: Record<string, string> = {
  india_return_date: "Return to India",
  planned_india_return: "Planned return to India",
  india_transfer_effective: "India transfer date",
  us_employer: "US employer",
  india_employer: "Indian employer",
  pan_number: "PAN",
  ssn_last_four: "SSN (last four digits)",
  india_oci_number: "OCI card number",
  previous_year_statuses: "Indian residency, last ten years",
  us_city: "US city",
  us_citizenship_date: "US citizenship since",
  us_citizenship_status: "US status",
  spouse_status: "Marital status",
  retirement_date: "Retirement date",
  left_india_on: "Moved abroad",
  us_arrived_on: "Arrived in the US",
  us_departed_on: "Left the US",
  green_card_from: "Green card since",
};

export function profileLabel(key: string): string {
  if (LABELS[key]) return LABELS[key];
  const days = key.match(/^days_in_india_(\d{4})_(\d{2})$/);
  if (days) return `Days in India, FY ${days[1]}-${days[2]}`;
  const text = key
    .replace(/_/g, " ")
    .replace(/\bus\b/g, "US")
    .replace(/\bindia\b/g, "India")
    .replace(/\b401k\b/g, "401(k)")
    .replace(/\bira\b/g, "IRA");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Identity numbers are never shown in full in the workspace either. */
export const SENSITIVE_FACT = /pan|ssn|aadhaar|passport|oci/;

export function maskValue(value: string) {
  return value.length <= 4 ? "••••" : `•••• ${value.slice(-4)}`;
}
