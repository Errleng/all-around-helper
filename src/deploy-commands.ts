import { REST } from '@discordjs/rest';
import {
    RESTPostAPIApplicationCommandsJSONBody,
    Routes,
} from 'discord-api-types/v9';

import * as dotenv from 'dotenv';
import { COMMANDS_PATH } from './constants';
import { importDefaults } from './utils';
import { Command } from './types';
dotenv.config();

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.TEST_SERVER_ID;

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
            console.log('Successfully registered application commands.')
        )
        .catch(console.error);
};

registerCommands();
