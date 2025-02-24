import { client } from './index';
import { env, ALLOWED_GUILD_IDS, MAX_STATUS_CHARS, NAME_POOL, STATUS_MESSAGES } from './constants';
import { ActivityType, GuildMember, OAuth2Guild } from 'discord.js';
import { splitIntoPhrases } from './utils';
import { checkSteamSales } from './steam';

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

const logGuildMembers = async(guilds: OAuth2Guild[]) => {
    const guildValues = await Promise.all(guilds.map(async (x) => await x.fetch()));
    const scanString = (await Promise.all(guildValues.map(async (guild) => {
        const members = await guild.members.fetch();
        const usernames = members.map((x) => x.user.username);
        const membersStr = usernames.slice(0, 100).join(', ');
        const guildStr = `(${members.size}) ${guild.name}\n${membersStr}`;
        return guildStr;
    }))).join('\n');
    console.debug(scanString);
};

let channelStates: ChannelStates = new Map();
const listenChannelState = async () => {
    const user = await client.users.fetch(env.DEV_USER);
    const guilds = await client.guilds.fetch();
    const newChannelStates: ChannelStates = new Map();

    for (const authGuild of guilds.values()) {
        const guild = await authGuild.fetch();
        if (!ALLOWED_GUILD_IDS.includes(guild.id)) {
            console.debug(`Found guild that is not allowed! ${guild.id} ${guild.name}`);
            // guild.leave();
        }
        const channels = await guild.channels.fetch();
        const newChannelMap = new Map();
        for (const channel of channels.values()) {
            if (channel === null) {
                continue;
            }
            if (channel.isVoiceBased()) {
                const newMemberMap = new Map();
                for (const member of channel.members.values()) {
                    newMemberMap.set(member.id, member);
                }
                newChannelMap.set(channel.name, newMemberMap);
            }
        }
        newChannelStates.set(guild.name, newChannelMap);
    }

    logGuildMembers(Array.from(guilds.values()));


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

let showActivityMessageTimer: NodeJS.Timeout | null = null;
const showActivityMessage = (phrases: string[], curIdx: number, delayBetween: number) => {
    const newMsg = phrases[curIdx] ?? '';
    client.user?.setActivity(newMsg, { type: ActivityType.Playing });

    if (phrases.length > 1) {
        showActivityMessageTimer = setTimeout(() => showActivityMessage(phrases, (curIdx + 1) % phrases.length, delayBetween), delayBetween);
    }
};

let curMsgIdx = -1;
const changeActivityMessage = async () => {
    // max limit is 128 characters
    let newMsgIdx = -1;
    do {
        newMsgIdx = Math.floor(Math.random() * STATUS_MESSAGES.length);
    } while (STATUS_MESSAGES.length > 1 && newMsgIdx === curMsgIdx);
    curMsgIdx = newMsgIdx;

    const name = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
    const message = STATUS_MESSAGES[curMsgIdx].replace('<name>', name);
    const phrases = splitIntoPhrases(message, MAX_STATUS_CHARS);
    console.debug(`update activity ${curMsgIdx}, ${message.length}, ${phrases.length}`);

    if (showActivityMessageTimer !== null) {
        clearTimeout(showActivityMessageTimer);
    }
    showActivityMessage(phrases, 0, 15 * 1000);
};

let tick = 0;
export const mainLoop = () => {
    if (tick % (10 * 60) === 0) {
        listenChannelState();
    }
    if (tick % (5 * 60) === 0) {
        changeActivityMessage();
    }
    if (tick % (60 * 60) === 0) {
        checkSteamSales();
    }
    tick = (tick + 1) % (60 * 60 * 24 * 10); // reset after 10 days
    setTimeout(mainLoop, 1000);
};
