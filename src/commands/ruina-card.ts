import { SlashCommandBuilder } from '@discordjs/builders';
import { ColorResolvable, CommandInteraction, MessageEmbed } from 'discord.js';
import { Command } from 'src/types';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import {
    CARD_RARITY_COLOR_MAP,
    DICE_GROUP_COLOR_MAP,
    DICE_TYPE_IMAGE_MAP,
} from '../constants';
import { getSyntaxForColor } from '../utils';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ruina-card')
        .setDescription('Replies with the Library of Ruina card')
        .addStringOption((option) =>
            option
                .setName('cardname')
                .setDescription('The name of the card')
                .setRequired(true)
        ),
    async execute(interaction: CommandInteraction) {
        const errorMessage =
            'An error occurred while trying to search for the card';

        const cardName = interaction.options.getString('cardname');
        let url = `${process.env.DATABASE_URL}/lor/cards/?qn=${cardName}`;
        let response = await fetch(url);
        console.log(`response 1 from ${url} is ${response}`);
        let responseBody = await response.text();
        let { document } = new JSDOM(responseBody).window;
        if (document === null) {
            console.warn('document 1 is null');
            await interaction.reply(errorMessage);
            return;
        }

        const cardDetailLink = document
            .querySelector('.card_title')
            ?.querySelector('a')?.href;
        if (cardDetailLink === undefined) {
            console.warn(
                `Could not get link to detail page for card ${cardName}`
            );
            await interaction.reply(`No card matches ${cardName}`);
            return;
        }

        url = `${process.env.DATABASE_URL}${cardDetailLink}`;
        response = await fetch(url);
        console.log(`response 2 from ${url} is ${response}`);
        responseBody = await response.text();

        document = new JSDOM(responseBody).window.document;
        if (document === null) {
            console.warn('document 2 is null');
            await interaction.reply(errorMessage);
            return;
        }

        const closestCardName = document
            .querySelector('.card_title')
            ?.querySelector('span[data-lang="en"]')?.textContent;

        let cardImgUrl = document
            .querySelector('[data-label="Artwork"]')
            ?.querySelector('img')?.src;
        let cardText = document.querySelector(
            '.card_script[data-lang="en"]'
        )?.textContent;
        const cardCost = document.querySelector('.card_cost')?.textContent;
        const cardDice = document.querySelectorAll('.card_back .card_dice');

        if (!cardText) {
            cardText = '';
        }
        cardDice.forEach((dice) => {
            const diceGroup = dice.getAttribute('data-type');
            const diceType = dice.getAttribute('data-detail');
            const diceRange = dice
                .querySelector('.card_dice_range')
                ?.textContent?.replace(' - ', '~');
            let diceDesc = dice.querySelector(
                '.card_dice_desc span[data-lang="en"]:not(:empty)'
            )?.textContent;
            if (!diceGroup) {
                console.warn(`Dice group '${diceGroup}' is invalid!`);
                return;
            }
            if (!diceType) {
                console.warn(`Dice type '${diceType}' is invalid!`);
                return;
            }
            if (!diceRange) {
                console.warn(`Dice range '${diceRange}' is invalid!`);
                return;
            }
            if (!diceDesc) {
                console.warn(`Dice description '${diceDesc}' is invalid!`);
                diceDesc = '';
            }
            const text = `\`\`\`${getSyntaxForColor(
                DICE_GROUP_COLOR_MAP[diceGroup]
            )}\n${
                DICE_TYPE_IMAGE_MAP[diceType]
            }[${diceRange}]\t${diceDesc}\n\`\`\``;
            cardText += text;
        });

        if (!cardImgUrl) {
            cardImgUrl = '';
            console.warn(`Card ${closestCardName} has no image!`);
        } else {
            cardImgUrl = `${process.env.DATABASE_URL}${cardImgUrl}`;
        }
        const cardRarity = document
            .querySelector('.ent_info_table')
            ?.getAttribute('data-rarity');
        if (!cardRarity) {
            console.error(`Unknown card rarity: ${cardRarity}`);
            await interaction.reply(errorMessage);
            return;
        }
        const cardRarityColor = CARD_RARITY_COLOR_MAP[
            cardRarity
        ] as ColorResolvable;

        const embed = new MessageEmbed()
            .setColor(cardRarityColor)
            .setTitle(`${closestCardName} (${cardCost}:bulb:)`)
            .setDescription(cardText)
            .setImage(cardImgUrl);
        await interaction.reply({
            embeds: [embed],
        });
    },
};

export default command;
