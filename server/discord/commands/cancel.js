/**
 * /cancel Slash Command
 *
 * Cancels the running task in the current thread.
 * Usage: /cancel
 */

import { SlashCommandBuilder } from 'discord.js';
import { cancelTask, tasks } from '../../lib/tasks.js';
import { getSession } from '../lib/sessions.js';

export const data = new SlashCommandBuilder()
  .setName('cancel')
  .setDescription('Cancel the running task in this thread');

export async function handleCancel(interaction) {
  const channel = interaction.channel;

  if (!channel.isThread()) {
    await interaction.reply({
      content: 'Use this command inside a thread.',
      flags: 64, // ephemeral
    });
    return;
  }

  const sessionMapping = getSession(channel.id);
  if (!sessionMapping?.sessionId) {
    await interaction.reply({
      content: 'No session found for this thread.',
      flags: 64, // ephemeral
    });
    return;
  }

  // Use tasks.get() instead of getOrCreateTask() to avoid creating phantom tasks
  const task = tasks.get(sessionMapping.sessionId);
  if (!task || task.status !== 'running') {
    await interaction.reply({
      content: 'No running task to cancel.',
      flags: 64, // ephemeral
    });
    return;
  }

  const success = cancelTask(sessionMapping.sessionId);
  if (success) {
    await interaction.reply({ content: '⛔ Task cancelled.', flags: 64 });

    // Edit the last bot message in the thread to append a cancelled notice
    try {
      const msgs = await interaction.channel.messages.fetch({ limit: 20 });
      const lastBotMsg = msgs.find((m) => m.author.bot && m.editable);
      if (lastBotMsg) {
        await lastBotMsg.edit(`${lastBotMsg.content}\n\n-# ⛔ Cancelled`);
      }
    } catch {
      // Non-critical — cancelled reply already sent
    }
  } else {
    await interaction.reply({
      content: 'Failed to cancel task.',
      flags: 64,
    });
  }
}
