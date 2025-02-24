import { SlashCommandBuilder } from "@discordjs/builders";
import {
    ColorResolvable,
    PermissionFlagsBits,
    ChatInputCommandInteraction,
    MessageFlags,
} from "discord.js";
import { onCommandInteraction } from "../utils";
import { Command, CommandOptions } from "../types";
import { buildSearchCommand } from "../command-builder";
import { getSteamSalesFromDatabase } from "../database";
import { client } from "../index";
import { getGameData } from "../steam";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("steam-sale-list")
        .setDescription("Lists all Steam games currently being checked for sales")
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            onCommandInteraction(interaction);
        } catch (e) {
            if (e instanceof Error) {
                await interaction.reply({
                    content: e.message,
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                console.error("Error in command interaction hook!", e);
                await interaction.reply({
                    content: "An error occurred while validating this command",
                    flags: MessageFlags.Ephemeral,
                });
            }
            return;
        }

        const steamSales = await getSteamSalesFromDatabase();
        const reply = (
            await Promise.all(
                steamSales.map(async (sale) => {
                    const user = await client.users.fetch(sale.creatorId);
                    const gameData = await getGameData(sale.gameId);
                    if (gameData === null) {
                        return `${sale.gameId}`;
                    }
                    return `${gameData[sale.gameId].data.name} (${sale.gameId})`;
                }),
            )
        ).join("\n");
        if (reply.length > 0) {
            await interaction.reply({
                content: reply,
                flags: MessageFlags.Ephemeral,
            });
        } else {
            await interaction.reply({
                content: "None",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
export default command;
