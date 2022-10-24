import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { getQueue } from '../audio-manager';
import { Command } from '../types';
import { onCommandInteraction } from '../utils';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('loop-audio')
        .setDescription(
            'Toggle whether to loop the current audio'
        )
        .setDefaultPermission(true),
    async execute(interaction: CommandInteraction) {
        try {
            onCommandInteraction(interaction);
        } catch (e) {
            if (e instanceof Error) {
                await interaction.reply({
                    content: e.message,
                    ephemeral: true,
                });
            } else {
                console.error('Error in command interaction hook!', e);
                await interaction.reply({
                    content: 'An error occurred while validating this command',
                    ephemeral: true,
                });
            }
            return;
        }
        const playQueue = getQueue();
        if (playQueue.length === 0) {
            await interaction.reply({
                content: 'There is nothing in the queue'
            });
            return;
        }
        const currentAudio = playQueue[0];
        currentAudio.loop = !currentAudio.loop;
        await interaction.reply({
            content: `${currentAudio.loop ? 'Looping' : 'No longer looping'} ${currentAudio.name}`
        });
    },
};
export default command;
