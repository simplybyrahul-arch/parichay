import {
  BOOKING_CREW_CATEGORIES,
  BOOKING_CREW_OPTIONS,
  BOOKING_EVENT_OPTIONS,
  EQUIPMENT_REQUIREMENT_OPTIONS,
  POST_PRODUCTION_OPTIONS,
} from "@/config/bookingOptions";

export const creatorServiceOptions = BOOKING_CREW_OPTIONS.map((option) => ({
  value: option.id,
  label: option.label,
})) as { value: string; label: string }[];

export type CreatorServiceOption = {
  value: string;
  label: string;
};

export type CreatorServiceCategory = {
  category: string;
  services: CreatorServiceOption[];
};

export const creatorServiceCategories: CreatorServiceCategory[] = BOOKING_CREW_CATEGORIES.map((category) => ({
  category: category.label,
  services: category.options.map((option) => ({ value: option.id, label: option.label })),
}));

export const industryServiceOptions = creatorServiceCategories.flatMap((group) => group.services);

export function creatorServiceLabel(value: string | null | undefined) {
  return industryServiceOptions.find((option) => option.value === value)?.label
    || BOOKING_EVENT_OPTIONS.find((option) => option.id === value)?.label
    || EQUIPMENT_REQUIREMENT_OPTIONS.find((option) => option.id === value)?.label
    || POST_PRODUCTION_OPTIONS.find((option) => option.id === value)?.label
    || creatorServiceOptions.find((option) => option.value === value)?.label
    || value
    || "Creator";
}

export function parseCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function commaList(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join(", ");
  return "";
}
