import { SlashCommandBuilder } from "@discordjs/builders";
import {
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ColorResolvable,
    EmbedBuilder,
    PermissionFlagsBits,
} from "discord.js";
import { Card, CommandOptions, DiceCategory, DiceType } from "../types";
import { getSyntaxForColor, cardImageToPath } from "../utils";
import { getCardsFromDatabase } from "../database";
import {
    ASSETS_PATH,
    CARD_RANGE_IMAGE_MAP,
    CARD_RARITY_COLOR_MAP,
    DICE_CATEGORY_COLOR_MAP,
    DICE_TYPE_CUSTOM_EMOJI_MAP,
    DICE_TYPE_EMOJI_MAP,
    env,
} from "../constants";
import path from "path";
import { buildSearchCommand } from "../command-builder";

const command = buildSearchCommand(
    new SlashCommandBuilder()
        .setName("ruina-card")
        .setDescription("Replies with the Library of Ruina card")
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .addStringOption((option) =>
            option.setName("cardname").setDescription("The name of the card").setRequired(true),
        ),
    async (options: CommandOptions) => {
        const query = options.getString("cardname");
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
        const cardImage = new AttachmentBuilder(cardImageToPath(item.image));
        const cardRangeImageName = CARD_RANGE_IMAGE_MAP[item.range];
        const cardRangeImage = new AttachmentBuilder(`${ASSETS_PATH}/images/${cardRangeImageName}`);
        let text = item.description;
        if (text.length > 0) {
            text += "\n";
        }

        item.dice.forEach((dice) => {
            const diceCategory: string = DiceCategory[dice.category];
            const diceType: string = DiceType[dice.type];
            const emojiKey = `${diceCategory}${diceType}`;
            let diceEmoji = DICE_TYPE_EMOJI_MAP[emojiKey];
            if (env.USE_CUSTOM_EMOJIS) {
                diceEmoji = DICE_TYPE_CUSTOM_EMOJI_MAP[emojiKey];
            }
            const diceRoll = `${dice.minRoll}-${dice.maxRoll}`;
            if (env.USE_COLORED_TEXT) {
                text += `\`\`\`${getSyntaxForColor(DICE_CATEGORY_COLOR_MAP[dice.category] as ColorResolvable)}\n${diceEmoji}[${diceRoll}]\t${dice.description}\n\`\`\``;
            } else {
                text += `\n${diceEmoji}\t\t\t**${diceRoll}**\t\t\t${dice.description}`;
            }
        });

        const embed = new EmbedBuilder()
            .setColor(CARD_RARITY_COLOR_MAP[item.rarity] as ColorResolvable)
            .setTitle(`${item.name}\t${item.cost}:bulb:`)
            .setDescription(text)
            .setImage(`attachment://${path.basename(cardImageToPath(item.image))}`)
            .setThumbnail(`attachment://${cardRangeImageName}`);

        return {
            embeds: [embed],
            files: [cardImage, cardRangeImage],
        };
    },
);

export default command;
