import { SlashCommandBuilder } from "discord.js";
import { EVENT_TEMPLATES } from "./events.js";
import { CLASSES } from "./classLeaders.js";

export function buildCommands() {
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
    )
    .addSubcommand((sc) =>
      sc
        .setName("lock")
        .setDescription("Lock et event (message_id).")
        .addStringOption((o) => o.setName("message_id").setDescription("Event message id").setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName("unlock")
        .setDescription("Unlock et event (message_id).")
        .addStringOption((o) => o.setName("message_id").setDescription("Event message id").setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName("close")
        .setDescription("Close et event (message_id).")
        .addStringOption((o) => o.setName("message_id").setDescription("Event message id").setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName("group")
        .setDescription("Sett gruppe (1-5) for en MAIN-spiller.")
        .addStringOption((o) => o.setName("message_id").setDescription("Event message id").setRequired(true))
        .addUserOption((o) => o.setName("user").setDescription("Bruker").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("group").setDescription("Gruppe 1-5").setRequired(true).setMinValue(1).setMaxValue(5)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("move")
        .setDescription("Flytt en bruker (main/backup) med rolle.")
        .addStringOption((o) => o.setName("message_id").setDescription("Event message id").setRequired(true))
        .addUserOption((o) => o.setName("user").setDescription("Bruker").setRequired(true))
        .addStringOption((o) =>
          o
            .setName("target")
            .setDescription("main eller backup")
            .setRequired(true)
            .addChoices({ name: "main", value: "main" }, { name: "backup", value: "backup" })
        )
        .addStringOption((o) =>
          o
            .setName("role")
            .setDescription("tank/healer/dps")
            .setRequired(true)
            .addChoices({ name: "tank", value: "tank" }, { name: "healer", value: "healer" }, { name: "dps", value: "dps" })
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("remove")
        .setDescription("Fjern bruker helt fra event.")
        .addStringOption((o) => o.setName("message_id").setDescription("Event message id").setRequired(true))
        .addUserOption((o) => o.setName("user").setDescription("Bruker").setRequired(true))
    );

  const setup = new SlashCommandBuilder().setName("setup").setDescription("Bygg/oppdater server (idempotent).");
  const apply = new SlashCommandBuilder().setName("apply").setDescription("Resync med template.json (idempotent).");

  const postVerify = new SlashCommandBuilder().setName("post-verify").setDescription("Post verifisering i #verifisering.");
  const postRoles = new SlashCommandBuilder().setName("post-role-menus").setDescription("Post rollemenyer i #velg-roller.");

  const cl = new SlashCommandBuilder()
    .setName("cl")
    .setDescription("Class leader (1 per klasse).")
    .addSubcommand((sc) =>
      sc
        .setName("set")
        .setDescription("Sett CL for en klasse.")
        .addStringOption((o) => {
          o.setName("class").setDescription("Klasse").setRequired(true);
          for (const c of CLASSES) o.addChoices({ name: c, value: c });
          return o;
        })
        .addUserOption((o) => o.setName("user").setDescription("Bruker").setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName("clear")
        .setDescription("Fjern alle CL-roller fra en bruker.")
        .addUserOption((o) => o.setName("user").setDescription("Bruker").setRequired(true))
    );

  const changelog = new SlashCommandBuilder()
    .setName("changelog")
    .setDescription("Post til #changelog.")
    .addSubcommand((sc) =>
      sc
        .setName("post")
        .setDescription("Post changelog entry.")
        .addStringOption((o) => o.setName("text").setDescription("Tekst").setRequired(true))
    );

  return [setup, apply, postVerify, postRoles, event, cl, changelog].map((c) => c.toJSON());
}