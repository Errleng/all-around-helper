import { SlashCommandBuilder } from '@discordjs/builders';
import { AudioPlayer } from '@discordjs/voice';
import { CommandInteraction } from 'discord.js';
import { Command } from '../types';
import { onCommandInteraction } from '../utils';

export const players: AudioPlayer[] = [];
const command: Command = {
    data: new SlashCommandBuilder()
        .setName('stop-sounds')
        .setDescription('Stops all sound players')
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
        for (const player of players) {
            player.stop();
        }
        await interaction.reply({
            content: 'Stopped playing sounds',
            ephemeral: true
        });
    }
};

export default command;
