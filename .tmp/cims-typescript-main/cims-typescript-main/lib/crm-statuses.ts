export interface CRMStatusDefinition {
  value: string;
  label: string;
  description: string;
  color: string;
  order: number;
  toneClass: string;
}

export const CRM_STATUS_DEFINITIONS: CRMStatusDefinition[] = [
  {
    value: "need_to_call",
    label: "Need to Call",
    description: "New lead that still needs the first callback.",
    color: "#F97316",
    order: 1,
    toneClass: "border-orange-300 bg-orange-100 text-orange-900",
  },
  {
    value: "contacted",
    label: "Contacted",
    description: "Lead has already been contacted.",
    color: "#3B82F6",
    order: 2,
    toneClass: "border-blue-300 bg-blue-100 text-blue-900",
  },
  {
    value: "project_started",
    label: "Project Started",
    description: "Lead converted and work has started.",
    color: "#EAB308",
    order: 3,
    toneClass: "border-yellow-300 bg-yellow-100 text-yellow-900",
  },
  {
    value: "continuing",
    label: "Continuing",
    description: "Project is active and still in progress.",
    color: "#8B5CF6",
    order: 4,
    toneClass: "border-violet-300 bg-violet-100 text-violet-900",
  },
  {
    value: "finished",
    label: "Finished",
    description: "Project is completed.",
    color: "#22C55E",
    order: 5,
    toneClass: "border-green-300 bg-green-100 text-green-900",
  },
  {
    value: "rejected",
    label: "Rejected",
    description: "Lead was closed without conversion.",
    color: "#EF4444",
    order: 6,
    toneClass: "border-red-300 bg-red-100 text-red-900",
  },
];

export const DEFAULT_CRM_STATUS = CRM_STATUS_DEFINITIONS[0].value;

export interface CRMStatusOption {
  value: string;
  label: string;
}

export function normalizeCRMStatusValue(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function getCanonicalCRMStatusValue(value?: string | null) {
  const normalized = normalizeCRMStatusValue(value);
  if (!normalized) {
    return "";
  }

  const knownStatus = CRM_STATUS_DEFINITIONS.find(
    (item) => item.value === normalized,
  );

  return knownStatus?.value ?? normalized;
}

export function getCRMStatusLabel(value?: string) {
  const canonicalValue = getCanonicalCRMStatusValue(value);
  if (!canonicalValue) {
    return "Unknown";
  }

  const status = CRM_STATUS_DEFINITIONS.find(
    (item) => item.value === canonicalValue,
  );
  if (status) {
    return status.label;
  }

  return canonicalValue
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getCRMStatusTone(value?: string) {
  const canonicalValue = getCanonicalCRMStatusValue(value);
  return (
    CRM_STATUS_DEFINITIONS.find((item) => item.value === canonicalValue)
      ?.toneClass ??
    "border-orange-300 bg-orange-100 text-orange-900"
  );
}

export function buildCRMStatusOptions(
  values: Array<string | null | undefined> = [],
): CRMStatusOption[] {
  const knownStatuses = CRM_STATUS_DEFINITIONS.map((item) => ({
    value: item.value,
    label: item.label,
  }));

  const knownValues = new Set(knownStatuses.map((item) => item.value));
  const dynamicStatuses = Array.from(
    new Set(
      values
        .map((value) => getCanonicalCRMStatusValue(value))
        .filter((value): value is string => Boolean(value)),
    ),
  )
    .filter((value) => !knownValues.has(value))
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({
      value,
      label: getCRMStatusLabel(value),
    }));

  return [...knownStatuses, ...dynamicStatuses];
}
