import { Client, Collection, Intents } from 'discord.js';
import { COMMANDS_PATH, env, EVENTS_PATH } from './constants';
import { ClientEvent, Command } from './types';
import { importDefaults, resetDatabase } from './utils';

const token = env.BOT_TOKEN;

export const commandsDict = new Collection<string, Command>();

// Create a new client instance
export const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

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

resetDatabase();

setupCommands();
setupEvents();
// Login to Discord with your client's token
client.login(token);
