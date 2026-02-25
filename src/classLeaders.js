import { PermissionsBitField } from "discord.js";

export const CLASSES = ["Warrior","Paladin","Hunter","Rogue","Priest","Shaman","Mage","Warlock","Druid"];

function canManage(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionsBitField.Flags.Administrator)) return true;
  const names = new Set(member.roles.cache.map((r) => r.name));
  return names.has("Admin") || names.has("Moderator") || names.has("Raidleder");
}

export async function clSet(interaction, className, user) {
  if (!canManage(interaction.member)) throw new Error("Ingen tilgang.");
  const roleName = `CL: ${className}`;
  const role = interaction.guild.roles.cache.find((r) => r.name === roleName);
  if (!role) throw new Error(`Fant ikke rolle: ${roleName}`);

  // En leder per klasse: fjern fra alle andre først
  for (const [, m] of role.members) {
    if (m.id !== user.id) await m.roles.remove(role);
  }

  const target = await interaction.guild.members.fetch(user.id);
  await target.roles.add(role);
  return roleName;
}

export async function clClear(interaction, user) {
  if (!canManage(interaction.member)) throw new Error("Ingen tilgang.");
  const target = await interaction.guild.members.fetch(user.id);
  const toRemove = target.roles.cache.filter((r) => r.name.startsWith("CL: "));
  for (const [, r] of toRemove) await target.roles.remove(r);
  return toRemove.size;
}