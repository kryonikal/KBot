export function setupLogging(client) {
  function getModLog(guild) {
    return guild.channels.cache.find((c) => c.name === "mod-log" && c.isTextBased()) ?? null;
  }

  client.on("guildMemberAdd", async (member) => {
    const ch = getModLog(member.guild);
    if (ch) ch.send(`➕ Member joined: ${member.user.tag} (${member.id})`);
  });

  client.on("guildMemberRemove", async (member) => {
    const ch = getModLog(member.guild);
    if (ch) ch.send(`➖ Member left: ${member.user?.tag ?? "unknown"} (${member.id})`);
  });

  client.on("messageDelete", async (message) => {
    const guild = message.guild;
    if (!guild) return;
    const ch = getModLog(guild);
    if (!ch) return;
    const author = message.author ? `${message.author.tag} (${message.author.id})` : "unknown author";
    ch.send(`🗑️ Message deleted in #${message.channel?.name ?? "unknown"} by ${author}`);
  });

  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const ch = getModLog(newMember.guild);
    if (!ch) return;

    const oldRoles = new Set(oldMember.roles.cache.map((r) => r.id));
    const newRoles = new Set(newMember.roles.cache.map((r) => r.id));

    const added = [...newRoles].filter((id) => !oldRoles.has(id));
    const removed = [...oldRoles].filter((id) => !newRoles.has(id));
    if (!added.length && !removed.length) return;

    const addedNames = added.map((id) => newMember.guild.roles.cache.get(id)?.name).filter(Boolean);
    const removedNames = removed.map((id) => newMember.guild.roles.cache.get(id)?.name).filter(Boolean);

    ch.send(
      `🧩 Roles changed for ${newMember.user.tag}:` +
        (addedNames.length ? ` +[${addedNames.join(", ")}]` : "") +
        (removedNames.length ? ` -[${removedNames.join(", ")}]` : "")
    );
  });
}