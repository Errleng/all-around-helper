import { SlashCommandBuilder } from '@discordjs/builders';
import { ButtonInteraction, CommandInteraction, MessageActionRow, MessageButton } from 'discord.js';
import { onCommandInteraction } from '../utils';
import { Command, SoundCategory } from '../types';
import { getSoundsFromDatabase } from '../database';
import { MAX_ACTION_ROWS, MAX_BUTTONS_PER_ROW } from '../constants';
import path from 'path';

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
        )
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('Sound name')
                .setRequired(false)
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

        const soundName = interaction.options.getString('name');
        if (soundName === null) {
            const randomSound = sounds[Math.floor(Math.random() * sounds.length)];

            await interaction.editReply({
                files: [randomSound.fileName]
            });
        } else {
            const foundSounds = sounds.filter(x => path.parse(x.fileName).name.toLocaleLowerCase().includes(soundName.toLocaleLowerCase()));
            if (foundSounds.length === 0) {
                await interaction.editReply({
                    content: 'Could not find any sounds',
                });
                return;
            }

            const rows: MessageActionRow[] = [];
            let currentRow = new MessageActionRow();
            for (const sound of foundSounds) {
                if (currentRow.components.length === MAX_BUTTONS_PER_ROW) {
                    rows.push(currentRow);
                    currentRow = new MessageActionRow();
                }
                if (rows.length === MAX_ACTION_ROWS) {
                    break;
                }

                currentRow.addComponents(
                    new MessageButton()
                        .setCustomId(path.parse(sound.fileName).name)
                        .setLabel(path.parse(sound.fileName).name)
                        .setStyle('SECONDARY')
                );
            }
            if (currentRow.components.length > 0) {
                rows.push(currentRow);
            }

            await interaction.editReply({
                content: 'Search results',
                components: rows,
            });

            const interactionMessage = await interaction.fetchReply();

            const collector =
                interaction.channel?.createMessageComponentCollector({
                    filter: (i: ButtonInteraction) =>
                        i.user.id === interaction.user.id,
                    componentType: 'BUTTON',
                    message: interactionMessage,
                    max: 1,
                    maxUsers: 1,
                    time: 60000,
                });

            collector?.on('collect', async (int: ButtonInteraction) => {
                await int.deferReply();
                const sound = sounds.find(x => x.fileName.includes(int.customId));
                if (sound === undefined) {
                    console.error(`button sound not found: ${int.customId}`);
                    return;
                }
                await int.editReply({
                    files: [sound.fileName]
                });
            });

            collector?.on('end', (collected) => {
                if (collected.size === 0) {
                    interaction.deleteReply();
                }
            });
        }
    },
};
export default command;
