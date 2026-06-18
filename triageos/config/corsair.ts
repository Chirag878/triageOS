export const CORSAIR_PLUGIN_IDS = {
  gmail: "gmail",
  calendar: "googlecalendar",
} as const;

<<<<<<< HEAD
export const CORSAIR_CONNECT_RETURN_PATH = "/api/corsair/connected";
=======
export const CORSAIR_CONNECT_RETURN_PATH = "/integrations/connected";
>>>>>>> 73fa312b9a3e2a8003b1424132c989d573f42073

export const CORSAIR_CONNECT_PLUGINS = [
  CORSAIR_PLUGIN_IDS.gmail,
  CORSAIR_PLUGIN_IDS.calendar,
] as const;

export type CorsairPluginId = (typeof CORSAIR_CONNECT_PLUGINS)[number];
