import { REST } from '@discordjs/rest';
import {
    RESTPostAPIApplicationCommandsJSONBody,
    Routes,
} from 'discord-api-types/v9';

import * as dotenv from 'dotenv';
import dotenvParseVariables from 'dotenv-parse-variables';
import { COMMANDS_PATH } from './constants';
import { importDefaults } from './utils';
import { Command } from './types';

const rawEnv = dotenv.config();
if (rawEnv.error || rawEnv.parsed === undefined) {
    throw new Error(`Environment variable parsing error: ${rawEnv.error}`);
}
export const env = dotenvParseVariables(rawEnv.parsed) as NodeJS.ProcessEnv;

const token = env.BOT_TOKEN;
const clientId = env.CLIENT_ID;
const guildId = env.TEST_SERVER_ID;

const registerCommands = async () => {
    const commands = await importDefaults<Command>(COMMANDS_PATH);
    const commandsJson: RESTPostAPIApplicationCommandsJSONBody[] = commands.map(
        (command) => command.data.toJSON()
    );

    console.log('Registering commands:', commandsJson);

    const rest = new REST({ version: '9' }).setToken(token);

    rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commandsJson,
    })
        .then(() =>
            console.log('Successfully registered application guild commands.')
        )
        .catch(console.error);

    rest.put(Routes.applicationCommands(clientId), {
        body: commandsJson,
    })
        .then(() =>
            console.log('Successfully registered application commands.')
        )
        .catch(console.error);
};

registerCommands();
