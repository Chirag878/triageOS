export const CORSAIR_PLUGIN_IDS = {
  gmail: "gmail",
  calendar: "googlecalendar",
} as const;

export const CORSAIR_CONNECT_RETURN_PATH = "/onboarding";

export const CORSAIR_CONNECT_PLUGINS = [
  CORSAIR_PLUGIN_IDS.gmail,
  CORSAIR_PLUGIN_IDS.calendar,
] as const;

export type CorsairPluginId = (typeof CORSAIR_CONNECT_PLUGINS)[number];
