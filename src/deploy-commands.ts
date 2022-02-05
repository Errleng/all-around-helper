import { REST } from '@discordjs/rest';
import {
    RESTPostAPIApplicationCommandsJSONBody,
    Routes,
} from 'discord-api-types/v9';
import fs from 'fs';
import path from 'path';

import * as dotenv from 'dotenv';
import { COMMANDS_PATH } from './constants';
dotenv.config();

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.TEST_SERVER_ID;

const registerCommands = async () => {
    const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];
    const commandFiles = fs
        .readdirSync(`./src/${COMMANDS_PATH}`)
        .filter((file) => file.endsWith('.ts'));

    for (const file of commandFiles) {
        const command = (
            await import(`${COMMANDS_PATH}/${path.parse(file).name}`)
        ).default;
        // Set a new item in the Collection
        // With the key as the command name and the value as the exported module
        commands.push(command.data.toJSON());
    }

    console.log('Registering commands:', commands);

    const rest = new REST({ version: '9' }).setToken(token);

    rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
    })
        .then(() =>
            console.log('Successfully registered application commands.')
        )
        .catch(console.error);
};

registerCommands();
