import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

export const VERIFY_BUTTON_ID = "verify_accept_rules";

export async function postVerifyMessage(channel) {
  const embed = new EmbedBuilder()
    .setTitle("Verifisering")
    .setDescription("Trykk knappen under for å godta reglene og få tilgang til serveren.");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(VERIFY_BUTTON_ID).setLabel("✅ Jeg godtar reglene").setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [row] });
}