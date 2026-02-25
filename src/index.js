import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  PermissionsBitField,
  StringSelectMenuBuilder,
  ActionRowBuilder
} from "discord.js";

import { buildCommands } from "./commands.js";
import { applyTemplate } from "./setup.js";
import { postVerifyMessage, VERIFY_BUTTON_ID } from "./verify.js";
import { setupLogging } from "./logging.js";

import {
  handleEventButton,
  createEvent,
  getEventByMessageId,
  saveEvent,
  ensureManage,
  lockEvent,
  closeEvent,
  setGroup,
  moveUser,
  refreshEventMessage,
  removeUserFromEvent,
  deleteEventFromStore,
  deleteEventMessage,
  joinWithClass
} from "./events.js";

import { clSet, clClear } from "./classLeaders.js";
import { postChangelog } from "./changelog.js";

import {
  postRolePanel,
  buildRolePanel,
  buildRoleStatus,
  ROLE_BTN,
  ROLE_VIEW,
  CLASSES,
  WOW_ROLES,
  WOW_VERSIONS,
  COMMUNITY_ROLES
} from "./roles.js";

const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error("Mangler DISCORD_TOKEN i .env");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel, Partials.Message]
});

setupLogging(client);

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
});

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(token);
  const appId = client.application.id;
  await rest.put(Routes.applicationCommands(appId), { body: buildCommands() });
  console.log("Slash commands registered (global).");
}

function findTextChannel(guild, name) {
  const ch = guild.channels.cache.find((c) => c.name === name);
  return ch && ch.isTextBased() ? ch : null;
}

function canManageServer(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionsBitField.Flags.Administrator)) return true;
  const names = new Set(member.roles.cache.map((r) => r.name));
  return names.has("Admin") || names.has("Moderator") || names.has("Raidleder");
}

async function toggleByName(guild, member, roleName) {
  const role = guild.roles.cache.find((r) => r.name === roleName);
  if (!role) throw new Error(`Fant ikke rolle: ${roleName}`);
  const has = member.roles.cache.has(role.id);
  if (has) await member.roles.remove(role);
  else await member.roles.add(role);
  return !has;
}

async function clearByNames(guild, member, names) {
  for (const name of names) {
    const role = guild.roles.cache.find((r) => r.name === name);
    if (role && member.roles.cache.has(role.id)) await member.roles.remove(role);
  }
}

client.on("interactionCreate", async (interaction) => {
  try {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      if (["setup", "apply", "post-verify", "post-role-menus", "post-welcome", "post-commands"].includes(interaction.commandName)) {
        if (!canManageServer(interaction.member)) throw new Error("Ingen tilgang (krever Admin/Moderator/Raidleder).");
      }

      if (interaction.commandName === "setup" || interaction.commandName === "apply") {
        await interaction.deferReply({ ephemeral: true });
        await applyTemplate(interaction.guild);
        await interaction.editReply("✅ Template applied/oppdatert.");
        return;
      }

      if (interaction.commandName === "post-verify") {
        await interaction.deferReply({ ephemeral: true });
        const ch = findTextChannel(interaction.guild, "verifisering");
        if (!ch) throw new Error("Fant ikke #verifisering.");
        await postVerifyMessage(ch);
        await interaction.editReply("✅ Verifisering postet.");
        return;
      }

      if (interaction.commandName === "post-role-menus") {
        await interaction.deferReply({ ephemeral: true });
        const ch = findTextChannel(interaction.guild, "velg-roller");
        if (!ch) throw new Error("Fant ikke #velg-roller.");
        await postRolePanel(ch);
        await interaction.editReply("✅ Rollepanel postet (1 melding).");
        return;
      }

      if (interaction.commandName === "post-welcome") {
        await interaction.deferReply({ ephemeral: true });
        const ch = findTextChannel(interaction.guild, "velkommen");
        if (!ch) throw new Error("Fant ikke #velkommen.");

        const msg = await ch.send(
`👋 **Velkommen til ${interaction.guild.name}!**

Dette er et norsk gaming-community (WoW + andre spill).

**Start her:**
1️⃣ Gå til **#verifisering** og trykk “Jeg godtar reglene”.
2️⃣ Gå til **#velg-roller** og velg class/roller.

**Hvor går du nå?**
• Generell prat → #prat
• WoW → #wow-prat
• Finn gruppe → #lfg / #signups
• Foreslå spill → #spill-forslag

Skriv gjerne hei i #prat og si hva du spiller 👋`
        );

        await msg.pin().catch(() => {});
        await interaction.editReply("✅ Velkomstmelding postet og pinnet.");
        return;
      }

      if (interaction.commandName === "post-commands") {
        await interaction.deferReply({ ephemeral: true });
        const ch = findTextChannel(interaction.guild, "commands");
        if (!ch) throw new Error("Fant ikke #commands.");

        const text =
`**KBot – Kommandooversikt**

**Server / oppsett**
• /setup – bygger/oppdater serverstruktur (idempotent)
• /apply – resync med template.json (idempotent)
• /post-verify – poster verifisering i #verifisering
• /post-role-menus – poster rollepanel i #velg-roller
• /post-welcome – poster og pinner velkomst i #velkommen
• /post-commands – poster/oppdater denne oversikten i #commands

**Changelog**
• /changelog post text:<tekst> – poster i #changelog

**Class leaders**
• /cl set class:<klasse> user:<bruker> – sett CL for klasse (1 leder per klasse)
• /cl clear user:<bruker> – fjern CL-roller fra bruker

**Events**
• /event create template:<...> when:"YYYY-MM-DD HH:mm" title:<...> note:<...>
• /event lock message_id:<id>
• /event unlock message_id:<id>
• /event close message_id:<id>
• /event group message_id:<id> user:<bruker> group:<1-5>
• /event move message_id:<id> user:<bruker> target:<main|backup> role:<tank|healer|dps>
• /event remove message_id:<id> user:<bruker>
• /event delete message_id:<id>

**Tips**
• Message ID: høyreklikk melding → Copy Message ID (Developer Mode)
`;

        const pinned = await ch.messages.fetchPinned().catch(() => null);
        const existing = pinned?.find(
          (m) => m.author.id === interaction.client.user.id && m.content.startsWith("**KBot – Kommandooversikt**")
        );

        if (existing) {
          await existing.edit(text);
        } else {
          const msg = await ch.send(text);
          await msg.pin().catch(() => {});
        }

        await interaction.editReply("✅ #commands er oppdatert (og pinnet).");
        return;
      }

      if (interaction.commandName === "changelog") {
        await interaction.deferReply({ ephemeral: true });
        const sub = interaction.options.getSubcommand();
        if (sub === "post") {
          const text = interaction.options.getString("text", true);
          await postChangelog(interaction, text);
          await interaction.editReply("✅ Postet i #changelog.");
          return;
        }
      }

      if (interaction.commandName === "cl") {
        await interaction.deferReply({ ephemeral: true });
        const sub = interaction.options.getSubcommand();
        if (sub === "set") {
          const cls = interaction.options.getString("class", true);
          const user = interaction.options.getUser("user", true);
          const roleName = await clSet(interaction, cls, user);
          await interaction.editReply(`✅ Satt ${roleName} til ${user.tag}`);
          return;
        }
        if (sub === "clear") {
          const user = interaction.options.getUser("user", true);
          const n = await clClear(interaction, user);
          await interaction.editReply(`✅ Fjernet ${n} CL-roller fra ${user.tag}`);
          return;
        }
      }

      if (interaction.commandName === "event") {
        const sub = interaction.options.getSubcommand();

        if (sub === "create") {
          await interaction.deferReply({ ephemeral: true });
          ensureManage(interaction);

          const template = interaction.options.getString("template", true);
          const when = interaction.options.getString("when", true);
          const title = interaction.options.getString("title") ?? "";
          const note = interaction.options.getString("note") ?? "";

          await createEvent({ interaction, templateKey: template, whenInput: when, title, note });
          await interaction.editReply("✅ Event postet i kanalen.");
          return;
        }

        ensureManage(interaction);
        await interaction.deferReply({ ephemeral: true });

        const messageId = interaction.options.getString("message_id", true);
        const evt = getEventByMessageId(messageId);
        if (!evt) throw new Error("Fant ikke event. Sjekk message_id.");

        if (sub === "lock") {
          lockEvent(evt, true);
          saveEvent(messageId, evt);
          await refreshEventMessage(interaction.guild, evt);
          await interaction.editReply("🔒 Event locked.");
          return;
        }

        if (sub === "unlock") {
          lockEvent(evt, false);
          saveEvent(messageId, evt);
          await refreshEventMessage(interaction.guild, evt);
          await interaction.editReply("🔓 Event unlocked.");
          return;
        }

        if (sub === "close") {
          closeEvent(evt);
          saveEvent(messageId, evt);
          await refreshEventMessage(interaction.guild, evt);
          await interaction.editReply("⛔ Event closed.");
          return;
        }

        if (sub === "group") {
          const user = interaction.options.getUser("user", true);
          const group = interaction.options.getInteger("group", true);
          setGroup(evt, user.id, group);
          saveEvent(messageId, evt);
          await refreshEventMessage(interaction.guild, evt);
          await interaction.editReply(`✅ Satte ${user.tag} til gruppe ${group}.`);
          return;
        }

        if (sub === "move") {
          const user = interaction.options.getUser("user", true);
          const target = interaction.options.getString("target", true);
          const role = interaction.options.getString("role", true);
          moveUser(evt, user.id, target, role);
          saveEvent(messageId, evt);
          await refreshEventMessage(interaction.guild, evt);
          await interaction.editReply(`✅ Flyttet ${user.tag} → ${target.toUpperCase()} (${role.toUpperCase()}).`);
          return;
        }

        if (sub === "remove") {
          const user = interaction.options.getUser("user", true);
          removeUserFromEvent(evt, user.id);
          saveEvent(messageId, evt);
          await refreshEventMessage(interaction.guild, evt);
          await interaction.editReply(`✅ Fjernet ${user.tag} fra event.`);
          return;
        }

        if (sub === "delete") {
          await deleteEventMessage(interaction.guild, evt);
          deleteEventFromStore(messageId);
          await interaction.editReply("🗑️ Event slettet (melding + data).");
          return;
        }
      }
    }

    // Buttons
    if (interaction.isButton()) {
      // Verify
      if (interaction.customId === VERIFY_BUTTON_ID) {
        const role = interaction.guild.roles.cache.find((r) => r.name === "Verified");
        if (!role) throw new Error("Mangler Verified. Kjør /setup.");

        const member = await interaction.guild.members.fetch(interaction.user.id);
        if (member.roles.cache.has(role.id)) {
          await interaction.reply({ content: "Du er allerede verifisert.", ephemeral: true });
          return;
        }

        await member.roles.add(role);
        await interaction.reply({ content: "✅ Verifisert! Du har nå tilgang.", ephemeral: true });
        return;
      }

      // Role Panel: switch view (tabs)
      if (interaction.customId.startsWith(ROLE_BTN.VIEW_PREFIX)) {
        const view = interaction.customId.slice(ROLE_BTN.VIEW_PREFIX.length);
        if (!Object.values(ROLE_VIEW).includes(view)) {
          await interaction.deferUpdate();
          return;
        }
        await interaction.update(buildRolePanel(view));
        return;
      }

      // Role Panel: status
      if (interaction.customId === ROLE_BTN.STATUS) {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await interaction.reply({ content: buildRoleStatus(member), ephemeral: true });
        return;
      }

      // Role Panel: toggles / clears
      if (interaction.customId.startsWith("role_")) {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (interaction.customId.startsWith(ROLE_BTN.CLASS_PREFIX)) {
          const cls = interaction.customId.slice(ROLE_BTN.CLASS_PREFIX.length);
          if (!CLASSES.includes(cls)) throw new Error("Ugyldig class.");
          await toggleByName(interaction.guild, member, cls);
          await interaction.reply({ content: buildRoleStatus(member), ephemeral: true });
          return;
        }

        if (interaction.customId.startsWith(ROLE_BTN.WOWROLE_PREFIX)) {
          const r = interaction.customId.slice(ROLE_BTN.WOWROLE_PREFIX.length);
          if (!WOW_ROLES.includes(r)) throw new Error("Ugyldig WoW rolle.");
          await toggleByName(interaction.guild, member, r);
          await interaction.reply({ content: buildRoleStatus(member), ephemeral: true });
          return;
        }

        if (interaction.customId.startsWith(ROLE_BTN.WOWVER_PREFIX)) {
          const v = interaction.customId.slice(ROLE_BTN.WOWVER_PREFIX.length);
          if (!WOW_VERSIONS.includes(v)) throw new Error("Ugyldig versjon.");
          await toggleByName(interaction.guild, member, v);
          await interaction.reply({ content: buildRoleStatus(member), ephemeral: true });
          return;
        }

        if (interaction.customId.startsWith(ROLE_BTN.COMMUNITY_PREFIX)) {
          const r = interaction.customId.slice(ROLE_BTN.COMMUNITY_PREFIX.length);
          if (!COMMUNITY_ROLES.includes(r)) throw new Error("Ugyldig community-rolle.");
          await toggleByName(interaction.guild, member, r);
          await interaction.reply({ content: buildRoleStatus(member), ephemeral: true });
          return;
        }

        if (interaction.customId === ROLE_BTN.CLEAR_CLASS) {
          await clearByNames(interaction.guild, member, CLASSES);
          await interaction.reply({ content: buildRoleStatus(member), ephemeral: true });
          return;
        }

        if (interaction.customId === ROLE_BTN.CLEAR_WOW) {
          await clearByNames(interaction.guild, member, WOW_ROLES);
          await interaction.reply({ content: buildRoleStatus(member), ephemeral: true });
          return;
        }

        if (interaction.customId === ROLE_BTN.CLEAR_VERS) {
          await clearByNames(interaction.guild, member, WOW_VERSIONS);
          await interaction.reply({ content: buildRoleStatus(member), ephemeral: true });
          return;
        }

        if (interaction.customId === ROLE_BTN.CLEAR_COMMUNITY) {
          await clearByNames(interaction.guild, member, COMMUNITY_ROLES);
          await interaction.reply({ content: buildRoleStatus(member), ephemeral: true });
          return;
        }
      }

      // Event join -> class picker
      if (interaction.customId.startsWith("event_join:")) {
        const roleKey = interaction.customId.split(":")[1]; // tank/healer/dps
        const member = await interaction.guild.members.fetch(interaction.user.id);

        const picked = CLASSES.filter((c) => member.roles.cache.some((r) => r.name === c));
        if (!picked.length) {
          await interaction.reply({
            content: "Velg minst én class i #velg-roller før du kan signe deg opp.",
            ephemeral: true
          });
          return;
        }

        const menu = new StringSelectMenuBuilder()
          .setCustomId(`event_classpick:${interaction.message.id}:${roleKey}`)
          .setPlaceholder("Velg class for signup")
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(picked.map((c) => ({ label: c, value: c })));

        await interaction.reply({
          content: "Velg hvilken class du vil signe opp som:",
          components: [new ActionRowBuilder().addComponents(menu)],
          ephemeral: true
        });
        return;
      }

      // Event leave
      if (interaction.customId.startsWith("event_")) {
        await handleEventButton(interaction);
        return;
      }
    }

    // Select menu: event class pick
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("event_classpick:")) {
        const [, messageId, roleKey] = interaction.customId.split(":");
        const className = interaction.values[0];

        const evt = getEventByMessageId(messageId);
        if (!evt) throw new Error("Fant ikke event (slettet?).");

        const result = joinWithClass(evt, interaction.user.id, roleKey, className);
        saveEvent(messageId, evt);
        await refreshEventMessage(interaction.guild, evt);

        await interaction.update({
          content:
            result.placed === "main"
              ? `✅ Signet som ${className} i MAIN (${roleKey.toUpperCase()}).`
              : `🕒 Signet som ${className} i BACKUP (${roleKey.toUpperCase()}).`,
          components: []
        });
        return;
      }
    }
  } catch (err) {
    console.error(err);
    const msg = err?.message ?? "Ukjent feil.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: `❌ ${msg}` }).catch(() => {});
    } else {
      await interaction.reply({ content: `❌ ${msg}`, ephemeral: true }).catch(() => {});
    }
  }
});

client.login(token);