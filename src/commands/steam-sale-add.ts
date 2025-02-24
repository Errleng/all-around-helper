import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ColorResolvable,
    PermissionFlagsBits,
    ChatInputCommandInteraction,
    MessageFlags,
} from 'discord.js';
import { onCommandInteraction } from '../utils';
import { Command, CommandOptions } from '../types';
import { addSteamGame } from '../steam';
import { buildSearchCommand } from '../command-builder';


const command: Command = {
    data: new SlashCommandBuilder()
        .setName('steam-sale-add')
        .setDescription(
            'Adds a Steam game to check for sales'
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .addStringOption((option) =>
            option
                .setName('gameid')
                .setRequired(true)
                .setDescription('ID of the Steam game to add')
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            onCommandInteraction(interaction);
        } catch (e) {
            if (e instanceof Error) {
                await interaction.reply({
                    content: e.message,
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                console.error('Error in command interaction hook!', e);
                await interaction.reply({
                    content: 'An error occurred while validating this command',
                    flags: MessageFlags.Ephemeral,
                });
            }
            return;
        }

        const gameId = interaction.options.getString('gameid')!;
        const success = await addSteamGame(gameId, interaction.user.id);

        if (success) {
            await interaction.reply({
                content: 'Successfully added Steam game',
                flags: MessageFlags.Ephemeral,
            });
        } else {
            await interaction.reply({
                content: 'Failed to add Steam game',
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
export default command;
