import { commandsDict } from "../index";
import { ClientEvent } from "../types";
import { ApplicationCommandType, CacheType, Interaction } from "discord.js";

const event: ClientEvent = {
    name: "interactionCreate",
    once: false,
    async execute(interaction: Interaction<CacheType>) {
        if (interaction.isCommand()) {
            const command = commandsDict.get(interaction.commandName);

            if (!command) return;

            try {
                if (interaction.commandType == ApplicationCommandType.ChatInput) {
                    await command.execute(interaction);
                } else {
                    console.error(
                        `Do not know how to handle command type: ${interaction.commandType}`,
                    );
                }
            } catch (error) {
                console.error(`Error executing command ${interaction.commandName}`, error);
                await interaction.reply({
                    content: "There was an error while executing this command!",
                    ephemeral: true,
                });
            }
        }
    },
};

export default event;
