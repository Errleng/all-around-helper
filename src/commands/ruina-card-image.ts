import { SlashCommandBuilder } from '@discordjs/builders';
import * as Canvas from 'canvas';
import { CommandInteraction, MessageAttachment } from 'discord.js';
import { ASSETS_PATH, DICE_CATEGORY_JS_COLOR_MAP } from '../constants';
import { Card, Command, DiceCategory, DiceType } from '../types';
import {
    getCanvasLines,
    getCardData,
    getTextHeight,
    onCommandInteraction,
} from '../utils';

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
        const diceImagePath = `${ASSETS_PATH}/images/${diceCategory}-${diceType}.png`;
        const diceArt = await Canvas.loadImage(diceImagePath);
        context.drawImage(diceArt, 10, diceY + diceIconHeight * i, 50, 50);

        context.font = `20px ${fontName}`;
        context.fillStyle = DICE_CATEGORY_JS_COLOR_MAP[dice.category];
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

const command: Command = {
    permissions: [
        // {
        //     id: env.DEV_USER,
        //     type: 'USER',
        //     permission: true,
        // },
    ],
    data: new SlashCommandBuilder()
        .setName('ruina-card-image')
        .setDescription('Generates an image of a Library of Ruina card')
        .setDefaultPermission(true)
        .addStringOption((option) =>
            option
                .setName('cardname')
                .setDescription('The name of the card')
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
        }

        const cardName = interaction.options.getString('cardname');
        const errorMessage = `An error occurred while trying to search for the card "${cardName}"`;
        if (!cardName) {
            console.error('Invalid card name', cardName);
            await interaction.reply({
                content: 'Card name is invalid',
                ephemeral: true,
            });
            return;
        }

        let card = null;
        try {
            card = await getCardData(cardName);
        } catch (e) {
            if (e instanceof Error) {
                console.error('Error while getting card data', e.message, e);
            } else {
                console.error('Error while getting card data', e);
            }
            await interaction.reply({ content: errorMessage, ephemeral: true });
            return;
        }

        if (!card) {
            console.error('Card data is invalid:', card);
            await interaction.reply({ content: errorMessage, ephemeral: true });
            return;
        }

        await interaction.deferReply();

        const cardArt = new MessageAttachment(card.imageUrl, 'card-art.png');
        // resize card dice image
        const canvas = Canvas.createCanvas(410, 310);
        const finalCanvas = await drawCardDice(canvas, card);
        const cardDice = new MessageAttachment(
            finalCanvas.toBuffer(),
            'card-dice.png'
        );

        interaction.ephemeral = false;
        await interaction.editReply({
            files: [cardArt, cardDice],
        });
    },
};
export default command;
