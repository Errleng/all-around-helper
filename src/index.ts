import * as dotenv from 'dotenv';
import { Client, Collection, Intents } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { COMMANDS_PATH } from './constants';
import { Command } from './types';
import { importDefaults } from './utils';

dotenv.config();
console.log('Process.env:', process.env);

const token = process.env.BOT_TOKEN;

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log('Ready!');
});

const setupCommands = async () => {
    const commandsDict = new Collection<string, Command>();
    const commands = await importDefaults<Command>(COMMANDS_PATH);
    for (const command of commands) {
        commandsDict.set(command.data.name, command);
    }

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isCommand()) return;
        const command = commandsDict.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(
                `Error executing command ${interaction.commandName}`,
                error
            );
            await interaction.reply({
                content: 'There was an error while executing this command!',
                ephemeral: true,
            });
        }
    });
};

setupCommands();
// Login to Discord with your client's token
client.login(token);
