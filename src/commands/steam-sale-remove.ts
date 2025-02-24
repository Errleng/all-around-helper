import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ColorResolvable,
    PermissionFlagsBits,
    ChatInputCommandInteraction,
    MessageFlags,
} from 'discord.js';
import { onCommandInteraction } from '../utils';
import { Command, CommandOptions } from '../types';
import { removeSteamGame } from '../steam';
import { buildSearchCommand } from '../command-builder';


const command: Command = {
    data: new SlashCommandBuilder()
        .setName('steam-sale-remove')
        .setDescription(
            'Removes a Steam game to check for sales'
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .addStringOption((option) =>
            option
                .setName('gameid')
                .setRequired(true)
                .setDescription('ID of the Steam game to remove')
        ),
    async execute(interaction: ChatInputCommandInteraction) {
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

        const gameId = interaction.options.getString('gameid')!;
        await removeSteamGame(gameId);
        await interaction.reply({
            content: 'Removed Steam game',
            flags: MessageFlags.Ephemeral,
        });
    },
};
export default command;
