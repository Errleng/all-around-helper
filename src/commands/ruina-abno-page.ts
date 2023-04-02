import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ColorResolvable,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    AttachmentBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction,
} from 'discord.js';
import { AbnoPage, CommandOptions } from '../types';
import { cardImageToPath } from '../utils';
import { getAbnoPagesFromDatabase } from '../database';
import {
    EMOTION_COLOR_MAP,
} from '../constants';
import path from 'path';
import { buildSearchCommand } from '../command-builder';

const command = buildSearchCommand(
    new SlashCommandBuilder()
        .setName('ruina-abno-item')
        .setDescription('Replies with the Library of Ruina abnormality item')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('The name of the abnormality item')
                .setRequired(true)
        ),
    async (options: CommandOptions) => {
        const query = options.getString('name');
        if (query === null) {
            throw new Error(`Invalid query: ${query}`);
        }
        return await getAbnoPagesFromDatabase(query);
    },
    (item: AbnoPage) => {
        return new ButtonBuilder()
            .setCustomId(item.id.toString())
            .setLabel(`${item.sephirah} - ${item.name}`)
            .setStyle(ButtonStyle.Secondary);
    },
    async (item: AbnoPage, int: ChatInputCommandInteraction) => {
        const itemImage = new AttachmentBuilder(cardImageToPath(item.image));
        const embed = new EmbedBuilder()
            .setColor(EMOTION_COLOR_MAP[item.emotion] as ColorResolvable)
            .setTitle(`${item.sephirah} - ${item.abnormality} - ${item.name} (${item.emotionLevel})`)
            .setDescription(item.description)
            .setImage(`attachment://${path.basename(cardImageToPath(item.image))}`)
            .addFields(
                { name: 'Flavor text', value: item.flavorText },
                { name: 'Dialogue', value: item.dialogue.join('\n') }
            );
        return {
            embeds: [embed],
            files: [itemImage],
        };
    }
);
export default command;
