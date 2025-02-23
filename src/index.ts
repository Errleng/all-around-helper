import { Client, Collection, IntentsBitField, GatewayIntentBits } from 'discord.js';
import { ALLOWED_GUILD_IDS, COMMANDS_PATH, env, EVENTS_PATH } from './constants';
import { startSoFarListener } from './listener';
import { mainLoop } from './poller';
import { ClientEvent, Command } from './types';
import { importDefaults } from './utils';

const token = env.BOT_TOKEN;

export const commandsDict = new Collection<string, Command>();

// Create a new client instance
const intents = [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.GuildPresences, IntentsBitField.Flags.GuildInvites, IntentsBitField.Flags.GuildVoiceStates, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.DirectMessages];
export const client = new Client({
    intents: Object.keys(GatewayIntentBits).map((a: string) => {
        return GatewayIntentBits[a as keyof typeof GatewayIntentBits];
    })
});

const setupCommands = async () => {
    const commands = await importDefaults<Command>(COMMANDS_PATH);
    for (const command of commands) {
        commandsDict.set(command.data.name, command);
    }
};

const setupEvents = async () => {
    const events = await importDefaults<ClientEvent>(EVENTS_PATH);
    for (const event of events) {
        if (event.once) {
            client.once(event.name, (args) => event.execute(args));
        } else {
            client.on(event.name, (args) => event.execute(args));
        }
    }
};

setupCommands();
setupEvents();
// Login to Discord with your client's token
client.login(token);
client.on('ready', () => {
    startSoFarListener(client);
    mainLoop();
});
