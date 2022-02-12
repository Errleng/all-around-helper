import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ColorResolvable,
    CommandInteraction,
    MessageAttachment,
    MessageEmbed,
} from 'discord.js';
import { Command, DiceCategory, DiceType } from '../types';
import { getSyntaxForColor, onCommandInteraction } from '../utils';
import {
    ASSETS_PATH,
    DICE_CATEGORY_COLOR_MAP,
    DICE_TYPE_CUSTOM_EMOJI_MAP,
    DICE_TYPE_EMOJI_MAP,
    env,
    CARD_RARITY_COLOR_MAP,
    CARD_RANGE_IMAGE_MAP,
} from '../constants';
import { getCardsFromDatabase } from '../database';
import path from 'path';

let useCount = 0;
setInterval(() => {
    if (useCount > 0) {
        console.log(`ruina-card reset useCount from ${useCount} to zero`);
    }
    useCount = 0;
}, 1000 * 60);

const command: Command = {
    permissions: [],
    data: new SlashCommandBuilder()
        .setName('ruina-card')
        .setDescription('Replies with the Library of Ruina card')
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

        let cards = null;
        try {
            cards = await getCardsFromDatabase(cardName);
        } catch (e) {
            if (e instanceof Error) {
                console.error('Error while getting card data', e.message, e);
            } else {
                console.error('Error while getting card data', e);
            }
            await interaction.reply({ content: errorMessage, ephemeral: true });
            return;
        }

        if (!cards || cards.length === 0) {
            console.error('Card data is invalid:', cards);
            await interaction.reply({ content: errorMessage, ephemeral: true });
            return;
        }
        const card = cards[0];

        const cardImage = new MessageAttachment(card.image);
        const cardRangeImageName = CARD_RANGE_IMAGE_MAP[card.range];
        const cardRangeImage = new MessageAttachment(
            `${ASSETS_PATH}/images/${cardRangeImageName}`
        );
        let text = card.description;
        if (text.length > 0) {
            text += '\n';
        }

        card.dice.forEach((dice) => {
            const diceCategory: string = DiceCategory[dice.category];
            const diceType: string = DiceType[dice.type];
            const emojiKey = `${diceCategory}${diceType}`;
            let diceEmoji = DICE_TYPE_EMOJI_MAP[emojiKey];
            if (env.USE_CUSTOM_EMOJIS) {
                diceEmoji = DICE_TYPE_CUSTOM_EMOJI_MAP[emojiKey];
            }
            const diceRoll = `${dice.minRoll}-${dice.maxRoll}`;
            if (env.USE_COLORED_TEXT) {
                text += `\`\`\`${getSyntaxForColor(
                    DICE_CATEGORY_COLOR_MAP[dice.category] as ColorResolvable
                )}\n${diceEmoji}[${diceRoll}]\t${dice.description}\n\`\`\``;
            } else {
                text += `\n${diceEmoji}\t\t\t**${diceRoll}**\t\t\t${dice.description}`;
            }
        });

        const embed = new MessageEmbed()
            .setColor(CARD_RARITY_COLOR_MAP[card.rarity] as ColorResolvable)
            .setTitle(`${card.name}\t${card.cost}:bulb:`)
            .setDescription(text)
            .setImage(`attachment://${path.basename(card.image)}`)
            .setThumbnail(`attachment://${cardRangeImageName}`);
        await interaction.reply({
            embeds: [embed],
            files: [cardImage, cardRangeImage],
        });
    },
};
export default command;
