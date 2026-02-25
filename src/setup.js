import fs from "fs";
import { ChannelType, PermissionsBitField } from "discord.js";

function byName(collection, name) {
  return collection.find((x) => x.name === name) ?? null;
}

async function ensureRole(guild, spec) {
  const existing = byName(guild.roles.cache, spec.name);
  if (existing) return existing;

  return guild.roles.create({
    name: spec.name,
    color: spec.color ?? undefined,
    hoist: !!spec.hoist,
    mentionable: !!spec.mentionable
  });
}

async function ensureCategory(guild, name, overwrites) {
  const existing = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === name);
  if (existing) {
    await existing.permissionOverwrites.set(overwrites);
    return existing;
  }
  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    permissionOverwrites: overwrites
  });
}

async function ensureChannel(guild, category, ch, overwrites) {
  const type = ch.type === "voice" ? ChannelType.GuildVoice : ChannelType.GuildText;
  const existing = guild.channels.cache.find(
    (c) => c.parentId === category.id && c.type === type && c.name === ch.name
  );

  if (existing) {
    await existing.permissionOverwrites.set(overwrites);
    return existing;
  }

  return guild.channels.create({
    name: ch.name,
    type,
    parent: category.id,
    permissionOverwrites: overwrites
  });
}

export async function applyTemplate(guild) {
  const template = JSON.parse(fs.readFileSync(new URL("../template.json", import.meta.url)));
  const roleMap = {};

  for (const r of template.roles) {
    const role = await ensureRole(guild, r);
    roleMap[r.name] = role;
  }

  const everyone = guild.roles.everyone;
  const verified = roleMap["Verified"];
  const mod = roleMap["Moderator"];
  const admin = roleMap["Admin"];
  const raidleader = roleMap["Raidleder"];

  if (!verified || !mod || !admin || !raidleader) {
    throw new Error("Mangler kjerne-roller (Verified/Moderator/Admin/Raidleder). Kjør /setup igjen.");
  }

  // Permissions model:
  // - Unverified: only START HER
  // - Verified: sees everything except STAFF
  // - STAFF category: only mod/admin/raidleader
  const hideToUnverified = [
    { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    { id: verified.id, allow: [PermissionsBitField.Flags.ViewChannel] },
    { id: mod.id, allow: [PermissionsBitField.Flags.ViewChannel] },
    { id: admin.id, allow: [PermissionsBitField.Flags.ViewChannel] },
    { id: raidleader.id, allow: [PermissionsBitField.Flags.ViewChannel] }
  ];

  const startHereOverwrites = [
    { id: everyone.id, allow: [PermissionsBitField.Flags.ViewChannel] },
    { id: verified.id, allow: [PermissionsBitField.Flags.ViewChannel] }
  ];

  const staffOverwrites = [
    { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    { id: verified.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    { id: mod.id, allow: [PermissionsBitField.Flags.ViewChannel] },
    { id: admin.id, allow: [PermissionsBitField.Flags.ViewChannel] },
    { id: raidleader.id, allow: [PermissionsBitField.Flags.ViewChannel] }
  ];

  const readOnlyChannels = new Set(["velkommen", "regler"]);
  const changelogName = "changelog";

  for (const cat of template.categories) {
    const isStart = cat.name === "START HER";
    const isStaff = cat.name === "STAFF";
    const catOverwrites = isStart ? startHereOverwrites : isStaff ? staffOverwrites : hideToUnverified;

    const category = await ensureCategory(guild, cat.name, catOverwrites);

    for (const ch of cat.channels) {
      let overwrites = catOverwrites;

      if (ch.type === "text" && readOnlyChannels.has(ch.name)) {
        overwrites = [
          ...catOverwrites,
          { id: everyone.id, deny: [PermissionsBitField.Flags.SendMessages] },
          { id: verified.id, deny: [PermissionsBitField.Flags.SendMessages] },
          { id: mod.id, allow: [PermissionsBitField.Flags.SendMessages] },
          { id: admin.id, allow: [PermissionsBitField.Flags.SendMessages] },
          { id: raidleader.id, allow: [PermissionsBitField.Flags.SendMessages] }
        ];
      }

      if (ch.type === "text" && ch.name === changelogName) {
        // read-only for everyone except Admin/Mod/Raidleder
        overwrites = [
          ...catOverwrites,
          { id: everyone.id, deny: [PermissionsBitField.Flags.SendMessages] },
          { id: verified.id, deny: [PermissionsBitField.Flags.SendMessages] },
          { id: mod.id, allow: [PermissionsBitField.Flags.SendMessages] },
          { id: admin.id, allow: [PermissionsBitField.Flags.SendMessages] },
          { id: raidleader.id, allow: [PermissionsBitField.Flags.SendMessages] }
        ];
      }

      await ensureChannel(guild, category, ch, overwrites);
    }
  }

  return { roleMap };
}