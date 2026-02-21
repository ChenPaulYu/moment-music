import type { CreationMode } from "./types";

export const APP_VERSION = "v2.4.0";

export interface ModeConfig {
  icon: string;
  label: string;
  route: string;
  color: string;
  description: string;
}

export const MODE_CONFIG: Record<CreationMode, ModeConfig> = {
  move: {
    icon: "motion_mode",
    label: "Move",
    route: "/move",
    color: "from-primary",
    description:
      "Translate motion into melody. Let your gestures conduct the flow.",
  },
  write: {
    icon: "edit_note",
    label: "Write",
    route: "/write",
    color: "from-indigo-500",
    description:
      "Words become textures. Type your thoughts to shape the soundscape.",
  },
  listen: {
    icon: "graphic_eq",
    label: "Listen",
    route: "/listen",
    color: "from-blue-500",
    description:
      "Harmonize with your voice. Sing or speak to influence the rhythm.",
  },
  be: {
    icon: "all_inclusive",
    label: "Be",
    route: "/be",
    color: "from-purple-500",
    description:
      "Let the environment speak. Ambient sensors generate the mood.",
  },
};

export const MODE_ORDER: CreationMode[] = ["move", "write", "listen", "be"];
