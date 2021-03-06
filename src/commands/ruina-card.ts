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
import { Card, Command, DiceCategory, DiceType } from '../types';
import { getSyntaxForColor, onCommandInteraction, cardImageToPath } from '../utils';
import { getCardsFromDatabase } from '../database';
import {
    ASSETS_PATH,
    CARD_RANGE_IMAGE_MAP,
    CARD_RARITY_COLOR_MAP,
    DICE_CATEGORY_COLOR_MAP,
    DICE_TYPE_CUSTOM_EMOJI_MAP,
    DICE_TYPE_EMOJI_MAP,
    env,
    MAX_ACTION_ROWS,
    MAX_BUTTONS_PER_ROW,
} from '../constants';
import path from 'path';

const command: Command = {
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
                    .setLabel(`${card.cost}???? ${card.name} (${card.id})`)
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
            console.log('the interaction is', i);

            const cardImage = new MessageAttachment(cardImageToPath(card.image));
            console.log('card path', cardImageToPath(card.image), cardImage);
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
                        DICE_CATEGORY_COLOR_MAP[
                            dice.category
                        ] as ColorResolvable
                    )}\n${diceEmoji}[${diceRoll}]\t${dice.description}\n\`\`\``;
                } else {
                    text += `\n${diceEmoji}\t\t\t**${diceRoll}**\t\t\t${dice.description}`;
                }
            });

            const embed = new MessageEmbed()
                .setColor(CARD_RARITY_COLOR_MAP[card.rarity] as ColorResolvable)
                .setTitle(`${card.name}\t${card.cost}:bulb:`)
                .setDescription(text)
                .setImage(`attachment://${path.basename(cardImageToPath(card.image))}`)
                .setThumbnail(`attachment://${cardRangeImageName}`);
            await i.editReply({
                embeds: [embed],
                files: [cardImage, cardRangeImage],
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
