import { SlashCommandBuilder } from '@discordjs/builders';
import { ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, PermissionFlagsBits, VoiceChannel } from 'discord.js';
import { CommandOptions, Sound, SoundCategory } from '../types';
import { getSoundsFromDatabase } from '../database';
import path from 'path';
import { client } from '../index';
import { createAudioResource, DiscordGatewayAdapterCreator, joinVoiceChannel, } from '@discordjs/voice';
import { startConnection, startPlaying } from '../audio-manager';
import { buildSearchCommand } from '../command-builder';

const command = buildSearchCommand(
    new SlashCommandBuilder()
        .setName('ruina-sound')
        .setDescription('Replies with a random Library of Ruina sound')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .addStringOption((option) =>
            option
                .setName('category')
                .setDescription('Sound category')
                .setRequired(true)
                .addChoices(
                    { name: 'SFX', value: SoundCategory[SoundCategory.SoundEffect] },
                    { name: 'Music', value: SoundCategory[SoundCategory.Music] },
                    { name: 'Dialogue', value: SoundCategory[SoundCategory.Dialogue] },
                ))
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('Sound name')
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName('channel')
                .setDescription('Voice channel ID to play sound in')
                .setRequired(false)
        ),
    async (options: CommandOptions) => {
        let sounds = await getSoundsFromDatabase();
        const selectedCategory = options.getString('category');
        const filterCategory = SoundCategory[selectedCategory as keyof typeof SoundCategory];
        sounds = sounds.filter(
            (sound) => sound.category === filterCategory
        );

        const query = options.getString('name');
        if (query === null) {
            const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
            return [randomSound];
        }
        return sounds;
    },
    (item: Sound) => {
        return new ButtonBuilder()
            .setCustomId(item.id.toString())
            .setLabel(path.parse(item.fileName).name)
            .setStyle(ButtonStyle.Secondary);
    },
    async (item: Sound, int: ChatInputCommandInteraction) => {
        const channelId = int.options.getString('channel');
        if (channelId === null) {
            return {
                files: [item.fileName]
            };
        } else {
            let channel = null;
            try {
                channel = await client.channels.fetch(channelId);
            } catch (error) {
                console.error(`Error fetching channel ${channelId}:`, error);
            }
            if (channel === null) {
                return {
                    content: `Invalid voice channel: ${channelId}`,
                    ephemeral: true
                };
            }
            if (!channel.isVoiceBased()) {
                return {
                    content: `Not a voice channel: ${channelId}`,
                    ephemeral: true
                };
            }

            console.log('voice channel', channel);
            const voiceChannel = channel as VoiceChannel;
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
            });
            startConnection(connection);

            const fileName = path.parse(item.fileName).name;
            startPlaying(fileName, () => {
                const resource = createAudioResource(item.fileName, { inlineVolume: true });
                resource.volume?.setVolume(0.2);
                return resource;
            });
            return {
                content: `Playing ${fileName} in channel ${channel.guild.name} > ${channel.name}`,
                components: [],
            };
        }
    }
);

export default command;
