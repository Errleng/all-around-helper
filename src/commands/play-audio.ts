import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ButtonBuilder,
    ButtonStyle, ChatInputCommandInteraction, GuildMember, PermissionFlagsBits,
} from 'discord.js';
import { CommandOptions } from '../types';
import fs from 'fs';
import { DOWNLOADED_AUDIO_PATH } from '../constants';
import { createAudioResource, DiscordGatewayAdapterCreator, joinVoiceChannel } from '@discordjs/voice';
import ytsr, { Video } from 'ytsr';
import ytdl from 'ytdl-core';
import { enqueueAudio, getQueue, startConnection, startPlaying } from '../audio-manager';
import { buildSearchCommand } from '../command-builder';

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

const command = buildSearchCommand(
    new SlashCommandBuilder()
        .setName('play')
        .setDescription(
            'Play audio'
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages | PermissionFlagsBits.Speak)
        .addStringOption((option) =>
            option
                .setName('query')
                .setRequired(true)
                .setDescription('Query or URL')
        ),

    async (options: CommandOptions) => {
        const query = options.getString('query')!;

        if (query === null) {
            throw new Error(`Invalid query: ${query}`);
        }

        const videos: Video[] = [];
        const results = await ytsr(query, { limit: 5 });
        for (const item of results.items) {
            if (item.type === 'video') {
                videos.push(item as Video);
            }
        }
        return videos;
    },
    (item: Video) => {
        return new ButtonBuilder()
            .setCustomId(item.id)
            .setLabel(`${item.title} (${item.duration})`)
            .setStyle(ButtonStyle.Secondary);
    },
    async (item: Video, int: ChatInputCommandInteraction) => {
        if (int.guild === null) {
            throw new Error('Could not get server');
        }

        const guildMember = int.member as GuildMember;
        if (guildMember.voice.channelId === null) {
            console.error('Voice channel is', int);
            throw new Error('Could not get voice channel');
        }

        const connection = joinVoiceChannel({
            channelId: guildMember.voice.channelId,
            guildId: int.guild.id,
            adapterCreator: int.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
        });
        startConnection(connection);

        const playQueue = getQueue();
        const createResource = () => {
            const stream = ytdl(item.url, {
                filter: 'audioonly',
                highWaterMark: 1 << 62,
                liveBuffer: 1 << 62,
                dlChunkSize: 0,
                quality: 'lowestaudio',
            });
            return createAudioResource(stream);
        };
        const audioName = `${item.title} (${item.duration})`;

        if (playQueue.length > 0) {
            enqueueAudio(audioName, createResource);
            return {
                content: `Queued **${audioName}**`,
                embeds: [],
                components: []
            };
        }

        startPlaying(audioName, createResource);
        return {
            content: `Playing **${audioName}**`,
            embeds: [],
            components: [],
        };
    }
);

export default command;
