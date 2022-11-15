import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ButtonInteraction,
    ColorResolvable,
    CommandInteraction,
    MessageActionRow,
    MessageAttachment,
    MessageButton,
    MessageEmbed,
} from 'discord.js';
import { Command, AbnoPage } from '../types';
import { cardImageToPath, onCommandInteraction } from '../utils';
import { getAbnoPagesFromDatabase } from '../database';
import {
    MAX_ACTION_ROWS,
    MAX_BUTTONS_PER_ROW,
    EMOTION_COLOR_MAP,
} from '../constants';
import path from 'path';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ruina-abno-page')
        .setDescription('Replies with the Library of Ruina abnormality page')
        .setDefaultPermission(true)
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('The name of the abnormality page')
                .setRequired(true)
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

        const name = interaction.options.getString('name');

        if (!name) {
            console.error('Invalid name', name);
            await interaction.reply({
                content: 'Name is invalid',
                ephemeral: true,
            });
            return;
        }

        let pages: AbnoPage[] | null = null;
        try {
            pages = await getAbnoPagesFromDatabase(name);
        } catch (e) {
            if (e instanceof Error) {
                console.error('Error while getting abnormality page data', e.message, e);
            } else {
                console.error('Error while getting abnormality page data', e);
            }
            await interaction.reply({
                content: `An error occurred while trying to search for the abnormality page "${name}"`,
                ephemeral: true,
            });
            return;
        }

        if (!pages || pages.length === 0) {
            console.error('No abnormality pages found:', pages);
            await interaction.reply({
                content: `No results for abnormality page named "${name}"`,
                ephemeral: true,
            });
            return;
        }

        const rows: MessageActionRow[] = [];
        let currentRow = new MessageActionRow();
        for (const page of pages) {
            if (currentRow.components.length === MAX_BUTTONS_PER_ROW) {
                rows.push(currentRow);
                currentRow = new MessageActionRow();
            }
            if (rows.length === MAX_ACTION_ROWS) {
                break;
            }
            currentRow.addComponents(
                new MessageButton()
                    .setCustomId(page.id.toString())
                    .setLabel(`${page.sephirah} - ${page.name}`)
                    .setStyle('SECONDARY')
            );
        }
        if (currentRow.components.length > 0) {
            rows.push(currentRow);
        }

        await interaction.reply({
            content: 'Search results',
            components: rows,
            ephemeral: false,
        });

        const interactionMessage = await interaction.fetchReply();

        const collector = interaction.channel?.createMessageComponentCollector({
            filter: (i: ButtonInteraction) => i.user.id === interaction.user.id,
            componentType: 'BUTTON',
            message: interactionMessage,
            max: 1,
            maxUsers: 1,
            time: 60000,
        });

        collector?.on('collect', async (i: ButtonInteraction) => {
            await i.deferReply();

            if (!pages) {
                console.error(
                    `Abnormality page list is invalid: ${pages} when responding to button`
                );
                return;
            }

            const pageId = i.customId;
            const page = pages.find((c) => c.id === pageId);
            if (!page) {
                console.error(
                    `Could not find page with id ${pageId} in page list: ${pages}`
                );
                return;
            }

            await interaction.editReply({
                content: `Displaying ${page.name} (${page.id})`,
                components: [],
            });

            const pageImage = new MessageAttachment(cardImageToPath(page.image));

            const embed = new MessageEmbed()
                .setColor(EMOTION_COLOR_MAP[page.emotion] as ColorResolvable)
                .setTitle(`${page.sephirah} - ${page.abnormality} - ${page.name} (${page.emotionLevel})`)
                .setDescription(page.description)
                .setImage(`attachment://${path.basename(cardImageToPath(page.image))}`)
                .addFields(
                    { name: 'Flavor text', value: page.flavorText },
                    { name: 'Dialogue', value: page.dialogue.join('\n') }
                );
            await i.editReply({
                embeds: [embed],
                files: [pageImage],
            });
        });

        collector?.on('end', (collected) => {
            if (collected.size === 0) {
                interaction.deleteReply();
            }
        });
    },
};
export default command;
