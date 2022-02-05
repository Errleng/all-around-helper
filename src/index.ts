import * as dotenv from 'dotenv';
import { Client, Collection, Intents } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { COMMANDS_PATH } from './constants';
import { Command } from './types';

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
    const commands = new Collection<string, Command>();
    const commandFiles = fs
        .readdirSync(`./src/${COMMANDS_PATH}`)
        .filter((file) => file.endsWith('.ts'));

    for (const file of commandFiles) {
        const command = (
            await import(`${COMMANDS_PATH}/${path.parse(file).name}`)
        ).default;
        // Set a new item in the Collection
        // With the key as the command name and the value as the exported module
        console.log('command', command);
        commands.set(command.data.name, command);
    }

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isCommand()) return;
        const command = commands.get(interaction.commandName);

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
