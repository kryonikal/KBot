import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export const ROLE_BTN = {
  VIEW_PREFIX: "role_view:",

  CLASS_PREFIX: "role_class:",
  WOWROLE_PREFIX: "role_wowrole:",
  WOWVER_PREFIX: "role_wowver:",
  COMMUNITY_PREFIX: "role_community:",

  CLEAR_CLASS: "role_clear_class",
  CLEAR_WOW: "role_clear_wow",
  CLEAR_VERS: "role_clear_vers",
  CLEAR_COMMUNITY: "role_clear_community",
  STATUS: "role_status"
};

export const ROLE_VIEW = {
  CLASS: "class",
  WOW: "wow",
  VERS: "vers",
  COMM: "comm"
};

export const CLASSES = ["Warrior","Paladin","Hunter","Rogue","Priest","Shaman","Mage","Warlock","Druid"];
export const WOW_ROLES = ["Tank","Healer","DPS"];
export const WOW_VERSIONS = ["TBC Anniversary","MoP Classic","WoW Classic"];
export const COMMUNITY_ROLES = ["Casual"];

const CLASS_EMOJI = {
  Warrior: "⚔️",
  Paladin: "🛡️",
  Hunter: "🏹",
  Rogue: "🗡️",
  Priest: "✨",
  Shaman: "🌩️",
  Mage: "🔮",
  Warlock: "🔥",
  Druid: "🌿"
};

const WOWROLE_EMOJI = { Tank: "🛡️", Healer: "💚", DPS: "⚔️" };
const VERSION_EMOJI = { "TBC Anniversary": "🐉", "MoP Classic": "🐼", "WoW Classic": "🕰️" };
const COMMUNITY_EMOJI = { Casual: "😄" };

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function row(buttons) {
  return new ActionRowBuilder().addComponents(...buttons);
}

function btn(customId, label, emoji, style = ButtonStyle.Secondary) {
  const b = new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style);
  if (emoji) b.setEmoji(emoji);
  return b;
}

function navRow(active) {
  const mk = (view, label, emoji) =>
    btn(
      `${ROLE_BTN.VIEW_PREFIX}${view}`,
      label,
      emoji,
      view === active ? ButtonStyle.Primary : ButtonStyle.Secondary
    );

  const status = btn(ROLE_BTN.STATUS, "Min status", "📌", ButtonStyle.Success);

  return row([
    mk(ROLE_VIEW.CLASS, "Class", "🎨"),
    mk(ROLE_VIEW.WOW, "WoW", "⚔️"),
    mk(ROLE_VIEW.VERS, "Versjoner", "🕰️"),
    mk(ROLE_VIEW.COMM, "Community", "👋"),
    status
  ]);
}

export function buildRolePanel(view = ROLE_VIEW.CLASS) {
  const components = [navRow(view)];
  let content = "";

  if (view === ROLE_VIEW.CLASS) {
    content =
      "**🎨 Class roller**\n" +
      "Trykk for å toggle class (du kan velge flere).";

    for (const group of chunk(CLASSES, 5)) {
      components.push(row(group.map((c) => btn(`${ROLE_BTN.CLASS_PREFIX}${c}`, c, CLASS_EMOJI[c]))));
    }
    components.push(row([btn(ROLE_BTN.CLEAR_CLASS, "Clear class", "🧹", ButtonStyle.Danger)]));
  }

  if (view === ROLE_VIEW.WOW) {
    content =
      "**⚔️ WoW roller**\n" +
      "Trykk for å toggle Tank/Healer/DPS (brukes for pings + events).";
    components.push(row(WOW_ROLES.map((r) => btn(`${ROLE_BTN.WOWROLE_PREFIX}${r}`, r, WOWROLE_EMOJI[r]))));
    components.push(row([btn(ROLE_BTN.CLEAR_WOW, "Clear WoW", "🧹", ButtonStyle.Danger)]));
  }

  if (view === ROLE_VIEW.VERS) {
    content =
      "**🕰️ WoW versjoner**\n" +
      "Trykk for å toggle hvilke versjoner du spiller.";
    components.push(row(WOW_VERSIONS.map((v) => btn(`${ROLE_BTN.WOWVER_PREFIX}${v}`, v, VERSION_EMOJI[v]))));
    components.push(row([btn(ROLE_BTN.CLEAR_VERS, "Clear versjoner", "🧹", ButtonStyle.Danger)]));
  }

  if (view === ROLE_VIEW.COMM) {
    content =
      "**👋 Community**\n" +
      "Trykk for å toggle community-rolle.";
    components.push(row(COMMUNITY_ROLES.map((r) => btn(`${ROLE_BTN.COMMUNITY_PREFIX}${r}`, r, COMMUNITY_EMOJI[r]))));
    components.push(row([btn(ROLE_BTN.CLEAR_COMMUNITY, "Clear community", "🧹", ButtonStyle.Danger)]));
  }

  return { content, components };
}

export async function postRolePanel(channel) {
  return channel.send(buildRolePanel(ROLE_VIEW.CLASS));
}

export function buildRoleStatus(member) {
  const names = new Set(member.roles.cache.map((r) => r.name));
  const pickedClasses = CLASSES.filter((c) => names.has(c));
  const wow = WOW_ROLES.filter((r) => names.has(r));
  const vers = WOW_VERSIONS.filter((v) => names.has(v));
  const comm = COMMUNITY_ROLES.filter((r) => names.has(r));

  const fmt = (arr) => (arr.length ? arr.join(", ") : "—");

  return (
    "**📌 Din status**\n" +
    `• Class: ${fmt(pickedClasses)}\n` +
    `• WoW: ${fmt(wow)}\n` +
    `• Versjoner: ${fmt(vers)}\n` +
    `• Community: ${fmt(comm)}`
  );
}