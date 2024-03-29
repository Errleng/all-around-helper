import { Client, Collection, IntentsBitField } from 'discord.js';
import { COMMANDS_PATH, env, EVENTS_PATH } from './constants';
import { startSoFarListener } from './listener';
import { mainLoop } from './poller';
import { ClientEvent, Command } from './types';
import { importDefaults } from './utils';

const token = env.BOT_TOKEN;

export const commandsDict = new Collection<string, Command>();

// Create a new client instance
export const client = new Client({ intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.GuildVoiceStates, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.DirectMessages] });

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
