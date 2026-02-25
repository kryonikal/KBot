import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder
} from "discord.js";

export const ROLE_MENU = {
  MAIN: "roles_main_class",
  ALT: "roles_alt_class",
  WOW_ROLES: "roles_wow_roles",
  WOW_VERSIONS: "roles_wow_versions",
  COMMUNITY: "roles_community"
};

export const MAIN_CLASSES = [
  "Warrior",
  "Paladin",
  "Hunter",
  "Rogue",
  "Priest",
  "Shaman",
  "Mage",
  "Warlock",
  "Druid"
];

export const ALT_CLASSES = [...MAIN_CLASSES];

export const WOW_ROLES = ["Tank", "Healer", "DPS"];
export const WOW_VERSIONS = ["TBC Anniversary", "MoP Classic", "WoW Classic"];
export const COMMUNITY_ROLES = ["Casual"];

function option(label, value = label) {
  return new StringSelectMenuOptionBuilder().setLabel(label).setValue(value);
}

export async function postRoleMenus(channel) {
  // Main class (single select)
  const mainEmbed = new EmbedBuilder()
    .setTitle("Main class (gir farge)")
    .setDescription("Velg 1 main class. Denne styrer fargen din i serveren.");

  const mainMenu = new StringSelectMenuBuilder()
    .setCustomId(ROLE_MENU.MAIN)
    .setPlaceholder("Velg main class")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(MAIN_CLASSES.map((c) => option(`Main: ${c}`, c)));

  // Alt classes (multi)
  const altEmbed = new EmbedBuilder()
    .setTitle("Alt classes (ingen farge)")
    .setDescription("Velg flere hvis du spiller alts. Dette påvirker ikke farge.");

  const altMenu = new StringSelectMenuBuilder()
    .setCustomId(ROLE_MENU.ALT)
    .setPlaceholder("Velg alt classes")
    .setMinValues(0)
    .setMaxValues(ALT_CLASSES.length)
    .addOptions(ALT_CLASSES.map((c) => option(`Alt: ${c}`, c)));

  // WoW roles (multi)
  const wowRolesEmbed = new EmbedBuilder()
    .setTitle("WoW roller")
    .setDescription("Tank/Healer/DPS. Brukes for pings og event.");

  const wowRolesMenu = new StringSelectMenuBuilder()
    .setCustomId(ROLE_MENU.WOW_ROLES)
    .setPlaceholder("Velg WoW roller")
    .setMinValues(0)
    .setMaxValues(WOW_ROLES.length)
    .addOptions(WOW_ROLES.map((r) => option(r, r)));

  // WoW versions (multi)
  const wowVersionsEmbed = new EmbedBuilder()
    .setTitle("WoW versjoner")
    .setDescription("Hvilke versjoner spiller du? (for pings og synlighet)");

  const wowVersionsMenu = new StringSelectMenuBuilder()
    .setCustomId(ROLE_MENU.WOW_VERSIONS)
    .setPlaceholder("Velg WoW versjoner")
    .setMinValues(0)
    .setMaxValues(WOW_VERSIONS.length)
    .addOptions(WOW_VERSIONS.map((v) => option(v, v)));

  // Community (multi, men vi har bare Casual)
  const communityEmbed = new EmbedBuilder()
    .setTitle("Community")
    .setDescription("Generell rolle. Hold det enkelt: Casual.");

  const communityMenu = new StringSelectMenuBuilder()
    .setCustomId(ROLE_MENU.COMMUNITY)
    .setPlaceholder("Velg community roller")
    .setMinValues(0)
    .setMaxValues(COMMUNITY_ROLES.length)
    .addOptions(COMMUNITY_ROLES.map((r) => option(r, r)));

  await channel.send({ embeds: [mainEmbed], components: [new ActionRowBuilder().addComponents(mainMenu)] });
  await channel.send({ embeds: [altEmbed], components: [new ActionRowBuilder().addComponents(altMenu)] });
  await channel.send({ embeds: [wowRolesEmbed], components: [new ActionRowBuilder().addComponents(wowRolesMenu)] });
  await channel.send({ embeds: [wowVersionsEmbed], components: [new ActionRowBuilder().addComponents(wowVersionsMenu)] });
  await channel.send({ embeds: [communityEmbed], components: [new ActionRowBuilder().addComponents(communityMenu)] });
}

export function roleNameForMainClass(className) {
  return `Main: ${className}`;
}

export function roleNameForAltClass(className) {
  return `Alt: ${className}`;
}