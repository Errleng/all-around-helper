import * as dotenv from 'dotenv';
import dotenvParseVariables from 'dotenv-parse-variables';
import { Client, Collection, Intents } from 'discord.js';
import { COMMANDS_PATH, EVENTS_PATH } from './constants';
import { ClientEvent, Command } from './types';
import { importDefaults } from './utils';

const rawEnv = dotenv.config();
if (rawEnv.error || rawEnv.parsed === undefined) {
    throw new Error(`Environment variable parsing error: ${rawEnv.error}`);
}
export const env = dotenvParseVariables(rawEnv.parsed) as NodeJS.ProcessEnv;

const token = env.BOT_TOKEN;

export const commandsDict = new Collection<string, Command>();

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

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
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
};

setupCommands();
setupEvents();
// Login to Discord with your client's token
client.login(token);
