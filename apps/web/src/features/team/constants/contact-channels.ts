import type { ComponentType } from "react";
import { FaLinkedin } from "react-icons/fa6";
import { FiMail } from "react-icons/fi";
import { SiBehance, SiFacebook, SiGithub, SiZalo } from "react-icons/si";

import type { ContactChannel } from "../types";

type IconComponent = ComponentType<{ size?: number; "aria-hidden"?: "true" }>;

/** Real brand logos for known channels; a mail icon for email (ADR-013). */
export const CONTACT_ICONS: Record<ContactChannel, IconComponent> = {
  facebook: SiFacebook,
  zalo: SiZalo,
  email: FiMail,
  github: SiGithub,
  linkedin: FaLinkedin,
  behance: SiBehance,
};
