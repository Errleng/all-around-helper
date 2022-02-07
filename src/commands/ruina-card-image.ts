import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, MessageAttachment } from 'discord.js';
import { env } from '../constants';
import { Command } from '../types';
import { getCanvasLines, getCardData, onCommandInteraction } from '../utils';
import * as Canvas from 'canvas';

const command: Command = {
    permissions: [
        {
            id: env.DEV_USER,
            type: 'USER',
            permission: true,
        },
    ],
    data: new SlashCommandBuilder()
        .setName('ruina-card-image')
        .setDescription('Generates an image of a Library of Ruina card')
        .setDefaultPermission(false)
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

        const topTextHeight = 30;
        const bottomTextHeight = 290;
        let lineHeight = 32;
        // card art is usually 410x310
        const canvas = Canvas.createCanvas(610, 410);
        const context = canvas.getContext('2d');
        const cardImage = await Canvas.loadImage(card.imageUrl);

        context.font = '32px sans-serif';
        context.fillStyle = 'black';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.fillStyle = 'white';
        context.strokeStyle = 'black';
        context.textAlign = 'center';
        context.lineWidth = 5;

        context.drawImage(cardImage, 0, 50, 410, 310);
        context.strokeText(card.name, canvas.width / 2, topTextHeight);
        context.fillText(card.name, canvas.width / 2, topTextHeight);

        context.font = '12px sans-serif';
        const cardDescLines = getCanvasLines(
            context,
            card.description,
            canvas.width
        );
        for (let i = 0; i < cardDescLines.length; i++) {
            const line = cardDescLines[i];
            const lineY =
                bottomTextHeight -
                (cardDescLines.length - 1) * lineHeight +
                i * lineHeight;
            context.strokeText(line, canvas.width / 2, lineY);
            context.fillText(line, canvas.width / 2, lineY);
        }

        context.textAlign = 'left';
        lineHeight = 12;
        // for (const dice of card.dice) {
        //     const lineX = 430;
        // const lineY = 50;
        // const descLines = getCanvasLines(
        //     context,
        //     dice.desc,
        //     canvas.width - lineX
        // );
        // for (let i = 0; i < descLines.length; i++) {
        //     const line = descLines[i];
        //     context.fillText(line, lineX, lineY + i * lineHeight);
        // }
        // }

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
