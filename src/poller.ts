import { client } from './index';
import { env, MAX_STATUS_CHARS } from './constants';
import { GuildMember } from 'discord.js';
import { ActivityTypes } from 'discord.js/typings/enums';
import { splitIntoPhrases } from './utils';

type ChannelStates = Map<string, Map<string, Map<string, GuildMember>>>;

const channelStateChanged = (oldState: ChannelStates, newState: ChannelStates) => {
    for (const [guildName, channels] of newState) {
        if (!oldState.has(guildName)) {
            return true;
        }
        const oldChannels = oldState.get(guildName) ?? new Map();
        for (const [channelName, members] of channels) {
            if (!oldChannels.has(channelName)) {
                return true;
            }
            const oldMembers = oldChannels.get(channelName) ?? new Map();
            for (const memberId of members.keys()) {
                if (!oldMembers.has(memberId)) {
                    return true;
                }
            }
        }
    }
    return false;
};

let channelStates: ChannelStates = new Map();
const listenChannelState = async () => {
    const user = await client.users.fetch(env.DEV_USER);
    const guilds = await client.guilds.fetch();
    const newChannelStates: ChannelStates = new Map();
    for (const authGuild of guilds.values()) {
        const guild = await authGuild.fetch();
        const channels = await guild.channels.fetch();
        const newChannelMap = new Map();
        for (const channel of channels.values()) {
            if (channel.isVoice()) {
                const newMemberMap = new Map();
                for (const member of channel.members.values()) {
                    newMemberMap.set(member.id, member);
                }
                newChannelMap.set(channel.name, newMemberMap);
            }
        }
        newChannelStates.set(guild.name, newChannelMap);
    }

    if (channelStateChanged(channelStates, newChannelStates)) {
        const channelStateStr = Array.from(newChannelStates).map(([guildName, channels]) =>
            `${guildName}\n${Array.from(channels)
                .filter((x) => x[1].size > 0)
                .map(([channelName, members]) => {
                    return `> ${channelName}: ${Array.from(members.values()).map((x) => {
                        let res = `${x.user.username}`;
                        if (x.voice.streaming) {
                            res += ' (streaming)';
                        }
                        return res;
                    }).join(', ')}`;
                }).join('\n')}`
        ).join('\n');
        user.send(channelStateStr);
    } else {
        console.debug('No changes in voice channels');
    }
    channelStates = newChannelStates;
};

let showActivityMessageTimer: NodeJS.Timer | null = null;
const showActivityMessage = (phrases: string[], curIdx: number, delayBetween: number) => {
    const newMsg = phrases[curIdx] ?? '';
    client.user?.setActivity(newMsg, { type: ActivityTypes.PLAYING });

    if (phrases.length > 1) {
        showActivityMessageTimer = setTimeout(() => showActivityMessage(phrases, (curIdx + 1) % phrases.length, delayBetween), delayBetween);
    }
};

let curMsgIdx = -1;
const changeActivityMessage = async () => {
    const guilds = await client.guilds.fetch();
    const randomGuild = guilds.random();
    const guild = await randomGuild?.fetch();
    const users = await guild?.members.fetch();
    const user = users?.filter((x) => x?.user.bot !== true)?.random();

    const name = `${user?.user.username ?? 'NAME'}`;
    const messages = [
        'All-Around Helper is well versed in all manner of cleaning. It was designed to take care of a family household all on its own.',
        'When it was discovered that All-Around Helper contained a critical error, it had already been sent to a household.',
        'Blood covered the whole floor, screams echoed, people were running away, and All-Around Helper was gleefully learning the concept of “cleaning”.',
        'A pristine white surface sleek with fine lines and short but efficient legs, All-Around Helper was created to help people.',
        'XX Incorporated, the manufacturer of All-Around Helper, was famous for its robotics products.',
        'All-Around Helper has various functions installed in its body. From burglar alarms and a monitoring system to a coffee maker and light control, it contains everything a household needs.',
        'You may be surprised to learn the numerous functionalities All-Around Helper contains in its compact body. If you were to dismantle it, you would be even more impressed by how efficiently they packed all the necessary equipment into it.',
        'If All-Around Helper were to have any capacity of emotion, it would likely feel very proud of itself for all the help it provides to others.',
        'All-Around Helper always ponders on how it can do more to help.',
        'Most people are unaware of this, but All-Around Helper makes amazing coffee. Of course, no one is likely to ask it to do such a thing now.',
        'The helper-bot can help you with any household chores!',
        'What kind of task do you want me to do? I can help with anything.',
        'Contamination scan complete. Initiating cleaning protocol.',
        'Beebeebeep~ Beep. Contamination spotted! Proceeding with trash disposal protocol.',
        'I will help you with my wide selection of tools.',
        `All-Around Helper spins around ${name}, however, ${name} continues to concentrate on the task at hand.`,
        `${name} has decided against buying a robot vacuum cleaner after seeing All-Around Helper.`,
        `${name} only hopes that All-Around Helper’s “cleaning” mode is never activated.`
    ];

    // max limit is 128 characters
    let newMsgIdx = -1;
    do {
        newMsgIdx = Math.floor(Math.random() * messages.length);
    } while (messages.length > 1 && newMsgIdx === curMsgIdx);
    curMsgIdx = newMsgIdx;

    const message = messages[curMsgIdx];
    const phrases = splitIntoPhrases(message, MAX_STATUS_CHARS);
    console.debug(`update activity ${curMsgIdx}, ${message.length}, ${phrases.length}`);

    if (showActivityMessageTimer !== null) {
        clearTimeout(showActivityMessageTimer);
    }
    showActivityMessage(phrases, 0, 15 * 1000);
};

let tick = 0;
export const mainLoop = () => {
    if (tick % (10 * 60) == 0) {
        listenChannelState();
    }
    if (tick % (5 * 60) == 0) {
        changeActivityMessage();
    }
    tick = (tick + 1) % (60 * 60 * 24 * 10); // reset after 10 days
    setTimeout(mainLoop, 1000);
};
