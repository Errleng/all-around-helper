import { SlashCommandBuilder } from '@discordjs/builders';
import {
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
} from 'discord.js';
import { Card, CommandOptions } from '../types';
import { getCanvasLines, cardImageToPath } from '../utils';
import * as Canvas from 'canvas';
import { getCardsFromDatabase } from '../database';
import { buildSearchCommand } from '../command-builder';

const command = buildSearchCommand(
    new SlashCommandBuilder()
        .setName('ruina-card-meme')
        .setDescription(
            'Generates a TOP TEXT BOTTOM TEXT meme of a Library of Ruina card art'
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
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
    async (options: CommandOptions) => {
        const query = options.getString('cardname');
        if (query === null) {
            throw new Error(`Invalid query: ${query}`);
        }
        const cards = await getCardsFromDatabase(query);
        return cards;
    },
    (item: Card) => {
        return new ButtonBuilder()
            .setCustomId(item.id.toString())
            .setLabel(`${item.cost}💡 ${item.name} (${item.id})`)
            .setStyle(ButtonStyle.Secondary);
    },
    async (item: Card, int: ChatInputCommandInteraction) => {
        const topText = int.options.getString('toptext') ?? '';
        const bottomText = int.options.getString('bottomtext') ?? '';
        const cardImage = await Canvas.loadImage(cardImageToPath(item.image));
        const canvas = await drawMeme(cardImage, topText, bottomText);
        const attachment = new AttachmentBuilder(canvas.toBuffer());

        return {
            files: [attachment],
        };
    }
);

const drawMeme = async (image: Canvas.Image, topText: string, bottomText: string) => {
    const topTextHeight = 40;
    const bottomTextHeight = 290;
    const lineHeight = 32;
    // card art is usually 410x310
    const canvas = Canvas.createCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

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
    return canvas;
};

export default command;
