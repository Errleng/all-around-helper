import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { stopPlaying } from '../audio-manager';
import { Command } from '../types';
import { onCommandInteraction } from '../utils';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Stops all sound players and clears all queues')
        .setDefaultPermission(true)
    ,
    async execute(interaction: CommandInteraction) {
        try {
            onCommandInteraction(interaction);
        } catch (e) {
            if (e instanceof Error) {
                console.error('Error in command interaction hook!', e);
                await interaction.reply({
                    content: 'An error occurred while validating this command',
                    ephemeral: true,
                });
            }
        }
        stopPlaying();
        await interaction.reply({
            content: 'Stopped playing sounds',
            ephemeral: true
        });
    }
};

export default command;
