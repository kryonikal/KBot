import { EmbedBuilder, PermissionsBitField } from "discord.js";

function canPost(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionsBitField.Flags.Administrator)) return true;
  const names = new Set(member.roles.cache.map((r) => r.name));
  return names.has("Admin") || names.has("Moderator") || names.has("Raidleder");
}

export async function postChangelog(interaction, text) {
  if (!canPost(interaction.member)) throw new Error("Ingen tilgang til changelog.");
  const channel = interaction.guild.channels.cache.find((c) => c.name === "changelog");
  if (!channel || !channel.isTextBased()) throw new Error("Fant ikke #changelog.");
  const embed = new EmbedBuilder().setTitle("Changelog").setDescription(text);
  await channel.send({ embeds: [embed] });
}