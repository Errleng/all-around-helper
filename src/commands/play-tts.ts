import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits } from 'discord.js';
import { onCommandInteraction } from '../utils';
import { Command } from '../types';
import * as googleTTS from 'google-tts-api';
import { createAudioResource, DiscordGatewayAdapterCreator, joinVoiceChannel } from '@discordjs/voice';
import { enqueueAudio, getQueue, startConnection, startPlaying } from '../audio-manager';
import { env } from '../constants';
const FakeYou = require('fakeyou.js');

const FAKEYOU_MAX_CHARS = 150;
const fy = new FakeYou.Client({
    usernameOrEmail: env.FAKEYOU_USERNAME,
    password: env.FAKEYOU_PASSWORD
});

fy.start();

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('play-tts')
        .setDescription(
            'Text-to-speech'
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages | PermissionFlagsBits.SendTTSMessages)
        .addStringOption((option) =>
            option
                .setName('text')
                .setRequired(true)
                .setDescription('Text')
        )
        .addStringOption((option) =>
            option
                .setName('generator')
                .setRequired(true)
                .setDescription('TTS generator')
                .addChoices(
                    { name: 'Google Translate', value: 'google' },
                    { name: 'FakeYou', value: 'fakeyou' },
                )
        ),
    async execute(interaction: ChatInputCommandInteraction) {
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
        await interaction.reply({
            content: 'Trying to queue TTS',
            ephemeral: true,
        });

        const text = interaction.options.getString('text')!;
        const generator = interaction.options.getString('generator')!;

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

        let urls: string[] = [];
        if (generator === 'google') {
            urls = googleTTS.getAllAudioUrls(text, {
                lang: 'en',
                slow: false,
                host: 'https://translate.google.com'
            }).map((x) => x.url);
        } else if (generator === 'fakeyou') {
            const models = fy.searchModel('Shaggy Rogers (Matthew Lillard)');
            console.debug('FakeYou models:', models);
            const model = models.first();
            if (model) {
                const words = text.split(' ');
                if (words === null) {
                    console.error(`Splitting "${text}" into words failed`);
                    return;
                }

                const textSections = [];
                let curSection = '';
                for (const word of words) {
                    if (curSection.length + word.length >= FAKEYOU_MAX_CHARS) {
                        textSections.push(curSection);
                        curSection = '';
                    }
                    if (curSection.length > 0) {
                        curSection += ' ';
                    }
                    curSection += word;
                }
                if (curSection.length > 0) {
                    textSections.push(curSection);
                }
                console.debug('FakeYou text sections:', textSections);

                for (const section of textSections) {
                    const res = await model.request(section);
                    urls.push(`https://storage.googleapis.com/vocodes-public${res.audioPath}`);
                }
            } else {
                console.warn('Could not find FakeYou model');
                return;
            }
        }
        console.debug('TTS URLs:', urls);

        const playQueue = getQueue();

        if (playQueue.length > 0) {
            for (const url of urls) {
                const createResource = () => {
                    const resource = createAudioResource(url, { inlineVolume: true });
                    return resource;
                };
                enqueueAudio('TTS', createResource);
            }
            return;
        }

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const createResource = () => {
                const resource = createAudioResource(url, { inlineVolume: true });
                return resource;
            };
            if (i === 0) {
                startPlaying('TTS', createResource);
            } else {
                enqueueAudio('TTS', createResource);
            }
        }
    },
};
export default command;
