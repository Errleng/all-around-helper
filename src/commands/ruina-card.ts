import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ColorResolvable,
    CommandInteraction,
    MessageAttachment,
    MessageEmbed,
} from 'discord.js';
import { Command } from 'src/types';
import { getCardData, getGuildChannelsFromIds } from '../utils';
import { env } from '../index';
import { ALLOWED_CHANNEL_IDS, ASSETS_PATH } from '../constants';

let useCount = 0;
setInterval(() => {
    if (useCount > 0) {
        console.log(`reset useCount from ${useCount} to zero`);
    }
    useCount = 0;
}, 1000 * 60);

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
        console.log(
            `Command ${interaction.commandName} used in channel ${interaction.channel} (${interaction.channelId})`
        );
        if (
            interaction.guild &&
            !ALLOWED_CHANNEL_IDS.includes(interaction.channelId)
        ) {
            const channelNames = getGuildChannelsFromIds(
                interaction.guild,
                ALLOWED_CHANNEL_IDS
            ).map((channel) => `#${channel.name}`);
            await interaction.reply({
                content: `This bot is restricted to the channels \`${channelNames.join(
                    ', '
                )}\``,
                ephemeral: true,
            });
            return;
        }

        if (useCount >= env.REQUEST_LIMIT) {
            await interaction.reply({
                content: `Exceeded rate limit of ${env.REQUEST_LIMIT} requests per minute.`,
                ephemeral: true,
            });
            return;
        }
        ++useCount;

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

        const embed = new MessageEmbed()
            .setColor(card.rarityColor as ColorResolvable)
            .setTitle(`\u200b${card.name}\t${card.cost}:bulb:`)
            .setDescription(card.description)
            .setImage(card.imageUrl)
            .setThumbnail(`attachment://${card.rangeFileName}`);
        await interaction.reply({
            embeds: [embed],
            files: [cardRangeImage],
        });
    },
};

export default command;
