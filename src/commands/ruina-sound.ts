import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { onCommandInteraction } from '../utils';
import { Command, SoundCategory } from '../types';
import { getSoundsFromDatabase } from '../database';

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

        await interaction.deferReply();

        let sounds = await getSoundsFromDatabase();
        if (sounds.length === 0) {
            await interaction.reply({
                content: 'Could not find any sounds',
                ephemeral: true,
            });
            return;
        }

        const selectedCategory = interaction.options.getString('category');
        const filterCategory =
            SoundCategory[
                selectedCategory as keyof typeof SoundCategory
            ];
        sounds = sounds.filter(
            (sound) => sound.category === filterCategory
        );

        const randomSound = sounds[Math.floor(Math.random() * sounds.length)];

        await interaction.editReply({
            files: [randomSound.fileName]
        });
    },
};
export default command;
