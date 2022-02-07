import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { Command } from 'src/types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ruina-card-image')
        .setDescription('Generates an image of a Library of Ruina card')
        .addStringOption((option) =>
            option
                .setName('cardname')
                .setDescription('The name of the card')
                .setRequired(true)
        ),
    async execute(interaction: CommandInteraction) {
        await interaction.reply({
            content: 'not implemented yet',
            ephemeral: true,
        });
    },
};
export default command;
