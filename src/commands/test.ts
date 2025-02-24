import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { onCommandInteraction } from "../utils";
import { Command } from "../types";
import { env } from "../constants";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("test")
        .setDescription("Command testing")
        .setDefaultPermission(true),
    async execute(interaction: CommandInteraction) {
        try {
            onCommandInteraction(interaction);
        } catch (e) {
            if (e instanceof Error) {
                await interaction.reply({
                    content: e.message,
                    ephemeral: true,
                });
            } else {
                console.error("Error in command interaction hook!", e);
                await interaction.reply({
                    content: "An error occurred while validating this command",
                    ephemeral: true,
                });
            }
            return;
        }

        if (interaction.user.id !== env.DEV_USER) {
            console.debug(
                `unauthorized user ${interaction.user.username} tried to use ${command.data.name}`,
            );
            await interaction.reply({
                content: "Unauthorized",
                ephemeral: true,
            });
            await interaction.deleteReply();
            return;
        }
    },
};
export default command;
