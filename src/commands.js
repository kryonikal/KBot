import { SlashCommandBuilder } from "discord.js";
import { EVENT_TEMPLATES } from "./events.js";
import { CLASSES } from "./classLeaders.js";

export function buildCommands() {
  const setup = new SlashCommandBuilder().setName("setup").setDescription("Bygg/oppdater server (idempotent).");
  const apply = new SlashCommandBuilder().setName("apply").setDescription("Resync med template.json (idempotent).");

  const postVerify = new SlashCommandBuilder().setName("post-verify").setDescription("Post verifisering i #verifisering.");
  const postRoles = new SlashCommandBuilder().setName("post-role-menus").setDescription("Post rollepanel i #velg-roller.");
  const postWelcome = new SlashCommandBuilder().setName("post-welcome").setDescription("Post velkomstmelding i #velkommen.");
  const postCommands = new SlashCommandBuilder().setName("post-commands").setDescription("Post/oppdater kommando-oversikt i #commands.");
  const postRegler = new SlashCommandBuilder().setName("post-regler").setDescription("Post regler i #regler (krever ✅ før verifisering).");

  const event = new SlashCommandBuilder()
    .setName("event")
    .setDescription("Event commands")
    .addSubcommand((sc) =>
      sc
        .setName("create")
        .setDescription("Lag event (bruk i #signups).")
        .addStringOption((o) => {
          o.setName("template").setDescription("Template").setRequired(true);
          for (const t of EVENT_TEMPLATES) o.addChoices({ name: t.label, value: t.key });
          return o;
        })
        .addStringOption((o) =>
          o.setName("when").setDescription('Dato/tid Oslo: "YYYY-MM-DD HH:mm"').setRequired(true)
        )
        .addStringOption((o) => o.setName("title").setDescription("Tittel (valgfri)").setRequired(false))
        .addStringOption((o) => o.setName("note").setDescription("Notat (valgfri)").setRequired(false))
    );

  const cl = new SlashCommandBuilder()
    .setName("cl")
    .setDescription("Class leader (1 per klasse).");

  const changelog = new SlashCommandBuilder()
    .setName("changelog")
    .setDescription("Post til #changelog.");

  return [
    setup,
    apply,
    postVerify,
    postRoles,
    postWelcome,
    postCommands,
    postRegler,
    event,
    cl,
    changelog
  ].map((c) => c.toJSON());
}