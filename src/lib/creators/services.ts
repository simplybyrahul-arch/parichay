export const creatorServiceOptions = [
  { value: "photographer", label: "Photographer" },
  { value: "videographer", label: "Videographer" },
  { value: "video_editor", label: "Video Editor" },
  { value: "photo_editor", label: "Photo Editor" },
  { value: "studio", label: "Studio" },
  { value: "equipment_provider", label: "Equipment Provider" },
  { value: "drone_operator", label: "Drone Operator" },
  { value: "makeup_artist", label: "Makeup Artist" },
  { value: "production_crew", label: "Production Crew" },
  { value: "event_crew", label: "Event Crew" },
  { value: "other", label: "Other" },
] as const;

export function creatorServiceLabel(value: string | null | undefined) {
  return creatorServiceOptions.find((option) => option.value === value)?.label || value || "Creator";
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
