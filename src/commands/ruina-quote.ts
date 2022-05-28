import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { env } from '../constants';
import { onCommandInteraction } from '../utils';
import { Command } from '../types';
import { getDialoguesFromDatabase } from '../database';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ruina-quote')
        .setDescription('Replies with a random Library of Ruina quote')
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

        const dialogues = await getDialoguesFromDatabase();
        if (dialogues.length === 0) {
            await interaction.reply({
                content: 'Could not find any quotes',
                ephemeral: true,
            });
            return;
        }
        console.log(dialogues, dialogues.length);

        const randomDialogue =
            dialogues[Math.floor(Math.random() * dialogues.length)];

        await interaction.reply({
            content: `${randomDialogue.speaker}: ${randomDialogue.text}`,
        });
    },
};
export default command;
