import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ButtonInteraction,
    CommandInteraction,
    MessageActionRow,
    MessageAttachment,
    MessageButton,
} from 'discord.js';
import { Card, Command } from '../types';
import { getCanvasLines, onCommandInteraction, cardImageToPath } from '../utils';
import * as Canvas from 'canvas';
import { getCardsFromDatabase } from '../database';
import { MAX_ACTION_ROWS, MAX_BUTTONS_PER_ROW, env } from '../constants';

const command: Command = {
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('ruina-card-meme')
        .setDescription(
            'Generates a TOP TEXT BOTTOM TEXT meme of a Library of Ruina card art'
        )
        .setDefaultPermission(true)
        .addStringOption((option) =>
            option
                .setName('cardname')
                .setDescription('The name of the card')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('toptext')
                .setDescription('The text at the top of the image')
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName('bottomtext')
                .setDescription('The text at the bottom of the image')
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

        const cardName = interaction.options.getString('cardname');
        if (!cardName) {
            console.error('Invalid card name', cardName);
            await interaction.reply({
                content: 'Card name is invalid',
                ephemeral: true,
            });
            return;
        }

        let cards: Card[] | null = null;
        try {
            cards = await getCardsFromDatabase(cardName);
        } catch (e) {
            if (e instanceof Error) {
                console.error('Error while getting card data', e.message, e);
            } else {
                console.error('Error while getting card data', e);
            }
            await interaction.reply({
                content: `An error occurred while trying to search for the card "${cardName}"`,
                ephemeral: true,
            });
            return;
        }

        if (!cards || cards.length === 0) {
            console.error('No cards found:', cards);
            await interaction.reply({
                content: `No results for card named "${cardName}"`,
                ephemeral: true,
            });
            return;
        }

        const rows: MessageActionRow[] = [];
        let currentRow = new MessageActionRow();
        for (const card of cards) {
            if (currentRow.components.length === MAX_BUTTONS_PER_ROW) {
                rows.push(currentRow);
                currentRow = new MessageActionRow();
            }
            if (rows.length === MAX_ACTION_ROWS) {
                break;
            }
            currentRow.addComponents(
                new MessageButton()
                    .setCustomId(card.id.toString())
                    .setLabel(`${card.cost}💡 ${card.name} (${card.id})`)
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

            if (!cards) {
                console.error(
                    `Card list is invalid: ${cards} when responding to button`
                );
                return;
            }

            const cardId = Number(i.customId);
            const card = cards.find((c) => c.id === cardId);
            if (!card) {
                console.error(
                    `Could not find card with id ${cardId} in card list: ${cards}`
                );
                return;
            }

            await interaction.editReply({
                content: `Displaying ${card.name} (${card.id})`,
                components: [],
            });

            const topTextHeight = 40;
            const bottomTextHeight = 290;
            const lineHeight = 32;
            // card art is usually 410x310
            const canvas = Canvas.createCanvas(410, 310);
            const context = canvas.getContext('2d');
            const cardImage = await Canvas.loadImage(cardImageToPath(card.image));
            context.drawImage(cardImage, 0, 0, canvas.width, canvas.height);

            const topText = interaction.options.getString('toptext') ?? '';
            const bottomText =
                interaction.options.getString('bottomtext') ?? '';
            context.font = '32px Impact';
            context.fillStyle = '#FFFFFF';
            context.strokeStyle = '#000000';
            context.textAlign = 'center';
            context.lineWidth = 5;

            const topTextLines = getCanvasLines(context, topText, canvas.width);
            for (let i = 0; i < topTextLines.length; i++) {
                const line = topTextLines[i];
                const lineY = topTextHeight + i * lineHeight;
                context.strokeText(line, canvas.width / 2, lineY);
                context.fillText(line, canvas.width / 2, lineY);
            }
            const bottomTextLines = getCanvasLines(
                context,
                bottomText,
                canvas.width
            );
            for (let i = 0; i < bottomTextLines.length; i++) {
                const line = bottomTextLines[i];
                const lineY =
                    bottomTextHeight -
                    (bottomTextLines.length - 1) * lineHeight +
                    i * lineHeight;
                context.strokeText(line, canvas.width / 2, lineY);
                context.fillText(line, canvas.width / 2, lineY);
            }

            const attachment = new MessageAttachment(
                canvas.toBuffer(),
                'card-image.png'
            );

            console.log('image attachment', attachment);

            await i.editReply({
                files: [attachment],
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
