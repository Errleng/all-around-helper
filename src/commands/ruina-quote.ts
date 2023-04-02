import { SlashCommandBuilder } from '@discordjs/builders';
import { BufferResolvable, PermissionFlagsBits, ChatInputCommandInteraction } from 'discord.js';
import { onCommandInteraction } from '../utils';
import { Command, DialogueCategory } from '../types';
import { getDialoguesFromDatabase, getSoundsFromDatabase } from '../database';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ruina-quote')
        .setDescription('Replies with a random Library of Ruina quote')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .addStringOption((option) =>
            option
                .setName('category')
                .setDescription('Dialogue category')
                .setRequired(false)
                .addChoices(
                    { name: 'Story', value: DialogueCategory[DialogueCategory.Story] },
                    { name: 'Combat', value: DialogueCategory[DialogueCategory.Combat] },
                )
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

        const files: BufferResolvable[] = [];
        if (DialogueCategory[selectedCategory as keyof typeof DialogueCategory] === DialogueCategory.Story) {
            const sounds = await getSoundsFromDatabase();
            const dialogueSound = sounds.find(x => x.fileName.includes(randomDialogue.voiceFile + '.wav'));
            if (dialogueSound === undefined) {
                console.error('Could not find any voice file for', randomDialogue);
                return;
            }
            files.push(dialogueSound.fileName);
        }

        await interaction.reply({
            content: `${randomDialogue.speaker}: ${randomDialogue.text}`,
            files: files
        });
    },
};
export default command;
