/**
 * /session Slash Command
 *
 * - In a thread: shows current session info (ID, message count, status, started)
 * - In a channel: lists recent sessions for the mapped project (with active indicator)
 *
 * Usage: /session
 */

import { SlashCommandBuilder } from 'discord.js';
import { getAllTitles } from '../../lib/session-titles.js';
import { getSessionsList } from '../../lib/sessions.js';
import { tasks } from '../../lib/tasks.js';
import { getChannelMapping } from '../config.js';
import { getSession } from '../lib/sessions.js';

export const data = new SlashCommandBuilder()
  .setName('session')
  .setDescription('Show current session info, or list recent sessions');

export async function handleSession(interaction) {
  const channel = interaction.channel;

  // --- In a thread: show current session details ---
  if (channel.isThread()) {
    const sessionMapping = getSession(channel.id);
    if (!sessionMapping?.sessionId) {
      await interaction.reply({
        content: '_No session found for this thread._',
        flags: 64,
      });
      return;
    }

    const { sessionId, projectSlug, createdAt } = sessionMapping;
    const mapping = getChannelMapping(channel.parentId);
    const titles = getAllTitles(projectSlug);
    const title = titles[sessionId] || channel.name;

    const sessions = await getSessionsList(projectSlug);
    const session = sessions.find((s) => s.sessionId === sessionId);
    const msgCount = session?.messageCount ?? '?';

    const task = tasks.get(sessionId);
    const statusEmoji = task?.status === 'running' ? '🟡 Running' : '🟢 Idle';
    const created = createdAt
      ? new Date(createdAt).toLocaleString()
      : 'Unknown';

    const lines = [
      '## 📎 Current Session',
      `**Title**: ${title}`,
      `**Project**: \`${mapping?.projectPath ?? projectSlug}\``,
      `**Session ID**: \`${sessionId}\``,
      `**Messages**: ${msgCount}`,
      `**Status**: ${statusEmoji}`,
      `**Started**: ${created}`,
    ];

    await interaction.reply({ content: lines.join('\n'), flags: 64 });
    return;
  }

  // --- In a channel: list recent sessions ---
  const mapping = getChannelMapping(channel.id);
  if (!mapping) {
    await interaction.reply({
      content: 'This channel is not configured. Use `/setup` first.',
      flags: 64,
    });
    return;
  }

  const sessions = await getSessionsList(mapping.projectSlug);
  const titles = getAllTitles(mapping.projectSlug);

  const recent = sessions.slice(0, 10);
  const lines = recent.map((s, i) => {
    const title = titles[s.sessionId] || s.firstPrompt || 'Untitled';
    const modified = new Date(s.modified).toLocaleDateString();
    const task = tasks.get(s.sessionId);
    const active = task?.status === 'running' ? ' 🟡' : '';
    return `${i + 1}. **${title}**${active} — ${s.messageCount} msgs · ${modified}`;
  });

  await interaction.reply({
    content:
      `📋 **Sessions for** \`${mapping.projectPath}\`\n\n` +
      (lines.join('\n') || '_No sessions yet._'),
    flags: 64,
  });
}
