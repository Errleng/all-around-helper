import { REST } from '@discordjs/rest';
import {
    RESTPostAPIApplicationCommandsJSONBody,
    Routes,
} from 'discord-api-types/v9';
import { COMMANDS_PATH, env } from './constants';
import { importDefaults } from './utils';
import { Command } from './types';
import { ApplicationCommand, Client, IntentsBitField } from 'discord.js';

const token = env.BOT_TOKEN;
const clientId = env.CLIENT_ID;
const guildId = env.TEST_SERVER_ID;

const client = new Client({ intents: [IntentsBitField.Flags.Guilds] });
client.login(token);
const registerCommands = async () => {
    const commands = await importDefaults<Command>(COMMANDS_PATH);
    const commandsJson: RESTPostAPIApplicationCommandsJSONBody[] = commands.map(
        (command) => command.data.toJSON()
    );

    console.log('Registering commands:', commandsJson);

    const rest = new REST({ version: '9' }).setToken(token);

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commandsJson,
    });
    console.log('Successfully registered application guild commands');

    await rest.put(Routes.applicationCommands(clientId), {
        body: commandsJson,
    });

    console.log('Successfully registered application commands');
    const registeredCommands = await client.application?.commands.fetch();
    if (!registeredCommands) {
        console.error('Could not get registered commands');
        return;
    }
    const guilds = await client.guilds.fetch();
    guilds.forEach((guild) => {
        registeredCommands.forEach(async (command) => {
            const commandData = commands.find(
                (x) => x.data.name === command.name
            );
            if (!commandData) {
                console.warn(`Could not find command ${command.name}`);
                return;
            }
            console.log(
                `Updated permissions for command "${command.name}" in guild "${guild.name}"`,
                command.defaultMemberPermissions
            );
        });
    });
};

const unregisterCommands = async () => {
    const commands = await client.application?.commands.fetch();
    const promises: Promise<ApplicationCommand>[] = [];
    commands?.forEach((command) => {
        promises.push(command.delete());
    });
    Promise.all(promises).then(() => {
        console.log('Successfully deleted application commands');
    });
};

client.on('ready', async () => {
    registerCommands().then(() => {
        process.exit();
    });
});
