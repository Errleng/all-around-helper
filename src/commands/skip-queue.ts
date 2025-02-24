import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { getQueue, playQueued } from "../audio-manager";
import { Command } from "../types";
import { onCommandInteraction } from "../utils";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("skip-queue")
        .setDescription("Skip the first audio in the queue")
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

        const playQueue = getQueue();
        if (playQueue.length === 0) {
            await interaction.reply({
                content: "There is nothing in the queue",
            });
            return;
        }
        await interaction.reply({
            content: `Skipping ${playQueue[0].name}`,
        });
        playQueue.shift();
        playQueued();
    },
};
export default command;
