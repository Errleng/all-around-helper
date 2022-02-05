import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { Command } from 'src/types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ruina-card')
        .setDescription('Replies with the Library of Ruina card'),
    async execute(interaction: CommandInteraction) {
        await interaction.reply('Pong!');
    },
};

export default command;
