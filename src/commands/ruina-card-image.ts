import { SlashCommandBuilder } from '@discordjs/builders';
import * as Canvas from 'canvas';
import {
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
} from 'discord.js';
import { getCardsFromDatabase } from '../database';
import {
    ASSETS_PATH,
    DICE_CATEGORY_COLOR_MAP,
    DICE_IMAGE_MAP,
} from '../constants';
import { Card, CommandOptions, DiceCategory, DiceType } from '../types';
import { getCanvasLines, getTextHeight, cardImageToPath } from '../utils';
import { buildSearchCommand } from '../command-builder';

const command = buildSearchCommand(
    new SlashCommandBuilder()
        .setName('ruina-card-image')
        .setDescription('Generates an image of a Library of Ruina card')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .addStringOption((option) =>
            option
                .setName('cardname')
                .setDescription('The name of the card')
                .setRequired(true)
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
        const cardArt = new AttachmentBuilder(cardImageToPath(item.image));
        // resize card dice image
        const canvas = Canvas.createCanvas(410, 310);
        const finalCanvas = await drawCardDice(canvas, item);
        const cardDice = new AttachmentBuilder(finalCanvas.toBuffer());
        return {
            files: [cardArt, cardDice],
        };
    }
);

const drawCardDice: (
    canvas: Canvas.Canvas,
    card: Card
) => Promise<Canvas.Canvas> = async (canvas, card) => {
    const topTextHeight = 35;
    // card art is usually 410x310
    const context = canvas.getContext('2d');

    const fontName = 'Verdana';
    context.font = `32px ${fontName}`;
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = 'white';
    context.strokeStyle = 'black';
    context.textAlign = 'center';
    context.lineWidth = 5;
    let lineHeight = getTextHeight(context, card.name);
    const titleHeight = lineHeight;

    context.fillText(card.name, canvas.width / 2, topTextHeight);

    context.font = `14px ${fontName}`;
    const cardDescLines = getCanvasLines(
        context,
        card.description,
        canvas.width
    );
    lineHeight = getTextHeight(context, card.description);
    let diceY = 0;
    for (let i = 0; i < cardDescLines.length; i++) {
        const line = cardDescLines[i];
        const lineY = titleHeight + 30 + i * lineHeight;
        context.fillText(line, canvas.width / 2, lineY);
        diceY = Math.max(diceY, lineY);
    }
    if (card.description.length > 0) {
        diceY += 10;
    } else {
        diceY = titleHeight + 20;
    }

    context.textAlign = 'left';
    const diceIconWidth = 50;
    const diceIconHeight = 50;
    for (let i = 0; i < card.dice.length; i++) {
        const dice = card.dice[i];

        const diceCategory = DiceCategory[dice.category];
        const diceType = DiceType[dice.type];
        const diceImagePath = `${ASSETS_PATH}/images/${DICE_IMAGE_MAP[`${diceCategory}${diceType}`]
            }`;
        const diceArt = await Canvas.loadImage(diceImagePath);
        context.drawImage(diceArt, 10, diceY + diceIconHeight * i, 50, 50);

        context.font = `20px ${fontName}`;
        context.fillStyle = DICE_CATEGORY_COLOR_MAP[dice.category];
        const diceRoll = `${dice.minRoll}-${dice.maxRoll}`;
        lineHeight = getTextHeight(context, diceRoll);
        context.fillText(
            diceRoll,
            diceIconWidth + 20,
            diceY + diceIconHeight * (i + 0.5) + lineHeight / 2
        );

        const rollWidth = context.measureText(diceRoll).width;
        const descX = diceIconWidth + rollWidth + 30;
        const descLines = getCanvasLines(
            context,
            dice.description,
            canvas.width - descX
        );
        context.font = `14px ${fontName}`;
        context.fillStyle = 'white';
        lineHeight = getTextHeight(context, dice.description);
        for (let j = 0; j < descLines.length; j++) {
            const desc = descLines[j];
            context.fillText(
                desc,
                descX,
                diceY + diceIconHeight * i + (j + 1) * lineHeight
            );
        }
    }
    const maxHeight = diceY + diceIconHeight * card.dice.length + 10;
    if (Math.abs(maxHeight - canvas.height) > 10) {
        const resizedCanvas = Canvas.createCanvas(canvas.width, maxHeight);
        console.log(
            'Resizing canvas to',
            resizedCanvas.width,
            resizedCanvas.height
        );
        return drawCardDice(resizedCanvas, card);
    } else {
        return canvas;
    }
};

export default command;
