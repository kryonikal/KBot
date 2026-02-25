import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField
} from "discord.js";
import { DateTime } from "luxon";
import path from "path";
import { ensureFile, readJson, writeJson } from "./storage.js";

const DATA_FILE = path.resolve("data/events.json");
ensureFile(DATA_FILE, {});

export const EVENT_TEMPLATES = [
  { key: "dungeon5", label: "Dungeon (5)", max: 5, caps: { tank: 1, healer: 1, dps: 3 } },
  { key: "raid10", label: "Raid (10)", max: 10, caps: { tank: 2, healer: 2, dps: 6 } },
  { key: "raid25", label: "Raid (25)", max: 25, caps: { tank: 2, healer: 5, dps: 18 } }
];

export const BTN = {
  TANK: "event_join:tank",
  HEAL: "event_join:healer",
  DPS: "event_join:dps",
  LEAVE: "event_leave"
};

function load() { return readJson(DATA_FILE); }
function save(db) { writeJson(DATA_FILE, db); }

function canManageEvents(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionsBitField.Flags.Administrator)) return true;
  const names = new Set(member.roles.cache.map((r) => r.name));
  return names.has("Admin") || names.has("Moderator") || names.has("Raidleder");
}

export function parseOsloDateTime(input) {
  const dt = DateTime.fromFormat(input.trim(), "yyyy-MM-dd HH:mm", { zone: "Europe/Oslo" });
  return dt.isValid ? dt : null;
}

function formatWhen(dt) {
  const unix = Math.floor(dt.toSeconds());
  return `<t:${unix}:F> ( <t:${unix}:R> )`;
}

function totalMain(evt) {
  return evt.main.tank.length + evt.main.healer.length + evt.main.dps.length;
}

function removeUserEverywhere(evt, userId) {
  for (const k of ["tank", "healer", "dps"]) {
    evt.main[k] = evt.main[k].filter((id) => id !== userId);
    evt.backup[k] = evt.backup[k].filter((id) => id !== userId);
  }
  delete evt.groups[userId];
}

function hasMainClass(member) {
  return member.roles.cache.some((r) => r.name.startsWith("Main: "));
}

function mainClassName(member) {
  const r = member.roles.cache.find((x) => x.name.startsWith("Main: "));
  return r ? r.name.replace("Main: ", "") : null;
}

function isLocked(evt) {
  return !!evt.locked;
}

function isClosed(evt) {
  return !!evt.closed;
}

function buildEmbed(evt) {
  const c = evt.caps;

  const fmtList = (ids) => (ids.length ? ids.map((id) => `<@${id}>`).join("\n") : "—");
  const fmtMain = (roleKey) => {
    const ids = evt.main[roleKey];
    const lines = ids.map((id) => {
      const g = evt.groups[id];
      return g ? `<@${id}> (G${g})` : `<@${id}>`;
    });
    return lines.length ? lines.join("\n") : "—";
  };

  const embed = new EmbedBuilder()
    .setTitle(evt.title)
    .setDescription(evt.note ? evt.note : "—")
    .addFields(
      { name: "Template", value: evt.templateLabel, inline: true },
      { name: "Tid", value: evt.whenText, inline: false },
      { name: "Caps", value: `Tank ${c.tank} • Healer ${c.healer} • DPS ${c.dps}`, inline: true },
      { name: "Main", value: `${totalMain(evt)}/${evt.max}`, inline: true },
      { name: "Status", value: isClosed(evt) ? "⛔ Closed" : isLocked(evt) ? "🔒 Locked" : "🟢 Åpent", inline: true },
      { name: "🛡 Main Tank", value: fmtMain("tank"), inline: true },
      { name: "💚 Main Healer", value: fmtMain("healer"), inline: true },
      { name: "⚔ Main DPS", value: fmtMain("dps"), inline: true },
      { name: "🕒 Backup Tank", value: fmtList(evt.backup.tank), inline: true },
      { name: "🕒 Backup Healer", value: fmtList(evt.backup.healer), inline: true },
      { name: "🕒 Backup DPS", value: fmtList(evt.backup.dps), inline: true }
    )
    .setFooter({ text: "Klikk rolle for å joine main hvis plass, ellers backup. Leave fjerner deg helt." });

  return embed;
}

function buildButtons(evt) {
  const disabled = isClosed(evt) || isLocked(evt);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(BTN.TANK).setLabel("🛡 Tank").setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId(BTN.HEAL).setLabel("💚 Healer").setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId(BTN.DPS).setLabel("⚔ DPS").setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId(BTN.LEAVE).setLabel("❌ Leave").setStyle(ButtonStyle.Secondary).setDisabled(isClosed(evt))
  );
  return [row];
}

async function updateMessage(interaction, evt) {
  await interaction.message.edit({ embeds: [buildEmbed(evt)], components: buildButtons(evt) });
}

function getTemplate(key) {
  return EVENT_TEMPLATES.find((t) => t.key === key) ?? EVENT_TEMPLATES[0];
}

export async function createEvent({ interaction, templateKey, whenInput, title, note }) {
  const dt = parseOsloDateTime(whenInput);
  if (!dt) throw new Error('Ugyldig datoformat. Bruk "YYYY-MM-DD HH:mm" (Oslo-tid).');

  const tpl = getTemplate(templateKey);

  const evt = {
    id: Math.random().toString(16).slice(2),
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    messageId: null,

    templateKey: tpl.key,
    templateLabel: tpl.label,
    whenInput,
    whenText: formatWhen(dt),

    title: title?.trim() ? title.trim() : tpl.label,
    note: note?.trim() ? note.trim() : "",

    max: tpl.max,
    caps: tpl.caps,

    locked: false,
    closed: false,

    main: { tank: [], healer: [], dps: [] },
    backup: { tank: [], healer: [], dps: [] },
    groups: {} // userId -> 1..5 (only main)
  };

  const msg = await interaction.channel.send({ embeds: [buildEmbed(evt)], components: buildButtons(evt) });
  evt.messageId = msg.id;

  const db = load();
  db[msg.id] = evt;
  save(db);

  return msg;
}

function canJoinMain(evt, roleKey) {
  if (totalMain(evt) >= evt.max) return false;
  if (evt.main[roleKey].length >= evt.caps[roleKey]) return false;
  return true;
}

function roleKeyFromButton(customId) {
  if (customId === BTN.TANK) return "tank";
  if (customId === BTN.HEAL) return "healer";
  return "dps";
}

export async function handleEventButton(interaction) {
  const db = load();
  const evt = db[interaction.message.id];
  if (!evt) return;

  const member = await interaction.guild.members.fetch(interaction.user.id);

  if (isClosed(evt)) {
    await interaction.reply({ content: "Dette eventet er closed.", ephemeral: true });
    return;
  }

  if (interaction.customId === BTN.LEAVE) {
    removeUserEverywhere(evt, interaction.user.id);
    db[interaction.message.id] = evt;
    save(db);
    await updateMessage(interaction, evt);
    await interaction.reply({ content: "Du er fjernet fra eventet.", ephemeral: true });
    return;
  }

  if (isLocked(evt)) {
    await interaction.reply({ content: "Eventet er locked.", ephemeral: true });
    return;
  }

  // Hard requirement: main class før signup
  if (!hasMainClass(member)) {
    await interaction.reply({
      content: "Du må velge Main class i #velg-roller før du kan signe deg opp.",
      ephemeral: true
    });
    return;
  }

  const roleKey = roleKeyFromButton(interaction.customId);

  // Move user cleanly first
  removeUserEverywhere(evt, interaction.user.id);

  if (canJoinMain(evt, roleKey)) {
    evt.main[roleKey].push(interaction.user.id);
    db[interaction.message.id] = evt;
    save(db);
    await updateMessage(interaction, evt);
    await interaction.reply({
      content: `✅ Du er i MAIN som ${roleKey.toUpperCase()} (${mainClassName(member)}).`,
      ephemeral: true
    });
    return;
  }

  // Otherwise backup per role
  evt.backup[roleKey].push(interaction.user.id);
  db[interaction.message.id] = evt;
  save(db);
  await updateMessage(interaction, evt);
  await interaction.reply({
    content: `🕒 MAIN er fullt for ${roleKey.toUpperCase()}. Du står nå i BACKUP (${mainClassName(member)}).`,
    ephemeral: true
  });
}

export function getEventByMessageId(messageId) {
  const db = load();
  return db[messageId] ?? null;
}

export function saveEvent(messageId, evt) {
  const db = load();
  db[messageId] = evt;
  save(db);
}

export function ensureManage(interaction) {
  if (!canManageEvents(interaction.member)) throw new Error("Ingen tilgang (krever Admin/Moderator/Raidleder).");
}

export function lockEvent(evt, locked) {
  evt.locked = !!locked;
}

export function closeEvent(evt) {
  evt.closed = true;
  evt.locked = true;
}

export function setGroup(evt, userId, groupNum) {
  // only for users in main
  const isInMain = ["tank", "healer", "dps"].some((k) => evt.main[k].includes(userId));
  if (!isInMain) throw new Error("Brukeren er ikke i MAIN.");
  evt.groups[userId] = groupNum;
}

export function moveUser(evt, userId, target, roleKey) {
  if (!["main", "backup"].includes(target)) throw new Error("target må være main eller backup.");
  if (!["tank", "healer", "dps"].includes(roleKey)) throw new Error("role må være tank/healer/dps.");

  removeUserEverywhere(evt, userId);

  if (target === "main") {
    if (!canJoinMain(evt, roleKey)) throw new Error("Ingen plass i MAIN for den rollen.");
    evt.main[roleKey].push(userId);
  } else {
    evt.backup[roleKey].push(userId);
  }
}