import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ButtonInteraction, CommandInteraction, GuildMember, MessageActionRow, MessageButton, MessageEmbed,
} from 'discord.js';
import { onCommandInteraction } from '../utils';
import { Command } from '../types';
import fs from 'fs';
import { DOWNLOADED_AUDIO_PATH, MAX_ACTION_ROWS, MAX_BUTTONS_PER_ROW } from '../constants';
import { createAudioResource, DiscordGatewayAdapterCreator, joinVoiceChannel } from '@discordjs/voice';
import ytsr, { Video } from 'ytsr';
import ytdl from 'ytdl-core';
import { enqueueAudio, getQueue, startConnection, startPlaying } from '../audio-manager';

const downloadAudio = async (video: Video): Promise<string> => {
    if (!fs.existsSync(DOWNLOADED_AUDIO_PATH)) {
        fs.mkdirSync(DOWNLOADED_AUDIO_PATH, { recursive: true });
    }
    const fileName = `${video.id}.mp3`;
    const filePath = `${DOWNLOADED_AUDIO_PATH}/${fileName}`;

    return new Promise((resolve, reject) => {
        try {
            const stream = ytdl(video.url, { filter: 'audioonly' });
            const fileStream = stream.pipe(fs.createWriteStream(filePath));
            fileStream.on('finish', () => {
                resolve(filePath);
            });
        } catch (e) {
            console.error(`Error while downloading audio for video ${video.id} - ${video.url} - ${video.title} (${video.duration}):`, e);
            reject();
        }
    });
};

const handleQuery = async (interaction: CommandInteraction, query: string) => {
    const videos: Video[] = [];
    const results = await ytsr(query, { limit: 5 });
    for (const item of results.items) {
        if (item.type === 'video') {
            videos.push(item as Video);
        }
    }

    if (videos.length === 0) {
        await interaction.reply({
            content: `No results for query '${query}'`
        });
        return;
    }

    const embed = new MessageEmbed()
        .setColor('WHITE')
        .setTitle(`Results for query "${query}"`)
        .setDescription(videos.map((a, index) => `**${index + 1}:** ${a.title} (${a.duration})`).join('\n\n'));

    const rows: MessageActionRow[] = [];
    let currentRow = new MessageActionRow();
    for (const [i, video] of videos.entries()) {
        if (currentRow.components.length === MAX_BUTTONS_PER_ROW) {
            rows.push(currentRow);
            currentRow = new MessageActionRow();
        }
        if (rows.length === MAX_ACTION_ROWS) {
            break;
        }
        currentRow.addComponents(
            new MessageButton()
                .setCustomId(video.id)
                .setLabel(`${i + 1}`)
                .setStyle('SECONDARY')
        );
    }
    if (currentRow.components.length > 0) {
        rows.push(currentRow);
    }

    await interaction.reply({
        embeds: [embed],
        components: rows,
        ephemeral: false,
    });

    const interactionMessage = await interaction.fetchReply();

    const collector =
        interaction.channel?.createMessageComponentCollector({
            filter: (i: ButtonInteraction) =>
                i.user.id === interaction.user.id,
            componentType: 'BUTTON',
            message: interactionMessage,
            max: 1,
            maxUsers: 1,
            time: 60000,
        });

    collector?.on('collect', async (int: ButtonInteraction) => {
        await int.deferReply();
        await int.deleteReply();

        const videoId = int.customId;
        const video = videos.find((x) => x.id === videoId);
        if (video === undefined) {
            console.error(`Could not find video in list with id ${videoId}, which should never happen`);
            return;
        }

        if (interaction.guild === null) {
            console.error('Interaction guild is null', interaction);
            return;
        }
        const guildMember = interaction.member as GuildMember;
        if (guildMember.voice.channelId === null) {
            console.error('Voice channel is', interaction);
            return;
        }

        const connection = joinVoiceChannel({
            channelId: guildMember.voice.channelId,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
        });
        startConnection(connection);

        const playQueue = getQueue();
        const createResource = () => {
            const stream = ytdl(video.url, {
                filter: 'audioonly',
                highWaterMark: 1 << 62,
                liveBuffer: 1 << 62,
                dlChunkSize: 0,
                quality: 'lowestaudio',
            });
            return createAudioResource(stream);
        };
        const audioName = `${video.title} (${video.duration})`;

        if (playQueue.length > 0) {
            await interaction.editReply({
                content: `Queued **${audioName}**`,
                embeds: [],
                components: []
            });
            enqueueAudio(audioName, createResource);
            return;
        }

        await interaction.editReply({
            content: `Playing **${audioName}**`,
            embeds: [],
            components: [],
        });

        startPlaying(audioName, createResource);
    });

    collector?.on('end', (collected) => {
        if (collected.size === 0) {
            interaction.deleteReply();
        }
    });
};

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('play-audio')
        .setDescription(
            'Play audio'
        )
        .setDefaultPermission(true)
        .addStringOption((option) =>
            option
                .setName('query')
                .setRequired(true)
                .setDescription('Query or URL')
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

        const query = interaction.options.getString('query')!;
        await handleQuery(interaction, query);
    },
};
export default command;
