import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ColorResolvable,
    CommandInteraction,
    MessageAttachment,
    MessageEmbed,
} from 'discord.js';
import { Command, DiceCategory, DiceType } from '../types';
import { getCardData, getSyntaxForColor, onCommandInteraction } from '../utils';
import {
    ASSETS_PATH,
    DICE_CATEGORY_COLOR_MAP,
    DICE_TYPE_CUSTOM_EMOJI_MAP,
    DICE_TYPE_EMOJI_MAP,
    env,
} from '../constants';

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

        const cardRangeImage = new MessageAttachment(
            `${ASSETS_PATH}/images/${card.rangeFileName}`
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
                    DICE_CATEGORY_COLOR_MAP[diceCategory]
                )}\n${diceEmoji}[${diceRoll}]\t${dice.desc}\n\`\`\``;
            } else {
                text += `\n${diceEmoji}\t\t\t**${diceRoll}**\t\t\t${dice.desc}`;
            }
        });

        const embed = new MessageEmbed()
            .setColor(card.rarityColor as ColorResolvable)
            .setTitle(`${card.name}\t${card.cost}:bulb:`)
            .setDescription(text)
            .setImage(card.imageUrl)
            .setThumbnail(`attachment://${card.rangeFileName}`);
        await interaction.reply({
            embeds: [embed],
            files: [cardRangeImage],
        });
    },
};
export default command;
