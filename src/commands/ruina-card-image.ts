import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { ALLOWED_CHANNEL_IDS, env } from '../constants';
import { Command } from 'src/types';
import { createImage, getCardData, getGuildChannelsFromIds } from '../utils';

let useCount = 0;
setInterval(() => {
    if (useCount > 0) {
        console.log(`ruina-card-image reset useCount from ${useCount} to zero`);
    }
    useCount = 0;
}, 1000 * 60);

const command: Command = {
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
    permissions: [
        {
            id: env.DEV_USER,
            type: 'USER',
            permission: true,
        },
    ],
    async execute(interaction: CommandInteraction) {
        console.log(
            `Command ${interaction.commandName} used in channel ${
                interaction.guild?.channels.cache.get(interaction.channelId)
                    ?.name
            } (${interaction.channelId})`
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

        let imageAttachment = null;
        try {
            imageAttachment = await createImage(cardName);
        } catch (e) {
            if (e instanceof Error) {
                console.error('Error while getting card data', e.message, e);
            } else {
                console.error('Error while getting card data', e);
            }
            await interaction.reply({ content: errorMessage, ephemeral: true });
            return;
        }

        console.log('image attachment', imageAttachment);

        await interaction.reply({
            files: [imageAttachment],
        });
    },
};
export default command;
