import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, MessageAttachment } from 'discord.js';
import { Command } from '../types';
import {
    getCardDataTiphereth,
    getCanvasLines,
    onCommandInteraction,
} from '../utils';
import * as Canvas from 'canvas';

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
            card = await getCardDataTiphereth(cardName);
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

        const topTextHeight = 40;
        const bottomTextHeight = 290;
        const lineHeight = 32;
        // card art is usually 410x310
        const canvas = Canvas.createCanvas(410, 310);
        const context = canvas.getContext('2d');
        const cardImage = await Canvas.loadImage(card.image);
        context.drawImage(cardImage, 0, 0, canvas.width, canvas.height);

        const topText = interaction.options.getString('toptext') ?? '';
        const bottomText = interaction.options.getString('bottomtext') ?? '';
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

        await interaction.reply({
            files: [attachment],
        });
    },
};
export default command;
