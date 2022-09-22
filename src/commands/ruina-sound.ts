import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { onCommandInteraction } from '../utils';
import { Command, DialogueCategory, SoundCategory } from '../types';
import { getDialoguesFromDatabase } from '../database';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ruina-sound')
        .setDescription('Replies with a random Library of Ruina sound')
        .setDefaultPermission(true)
        .addStringOption((option) =>
            option
                .setName('category')
                .setDescription('Sound category')
                .setRequired(true)
                .addChoices([
                    ['SFX', SoundCategory[SoundCategory.SoundEffect]],
                    ['Music', SoundCategory[SoundCategory.Music]],
                    ['Dialogue', SoundCategory[SoundCategory.Dialogue]],
                ])
        ),
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

        let dialogues = await getDialoguesFromDatabase();
        if (dialogues.length === 0) {
            await interaction.reply({
                content: 'Could not find any quotes',
                ephemeral: true,
            });
            return;
        }

        const selectedCategory = interaction.options.getString('category');
        if (selectedCategory !== null) {
            const filterCategory =
                DialogueCategory[
                    selectedCategory as keyof typeof DialogueCategory
                ];
            dialogues = dialogues.filter(
                (dialogue) => dialogue.category === filterCategory
            );
        }

        const randomDialogue =
            dialogues[Math.floor(Math.random() * dialogues.length)];

        await interaction.reply({
            content: `${randomDialogue.speaker}: ${randomDialogue.text}`,
        });
    },
};
export default command;
