import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ButtonInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ComponentType,
    ChatInputCommandInteraction,
    BaseMessageOptions,
    APIEmbed,
    JSONEncodable,
} from 'discord.js';
import { Command, CommandOptions } from './types';
import { onCommandInteraction } from './utils';
import {
    MAX_ACTION_ROWS,
    MAX_BUTTONS_PER_ROW,
} from './constants';

interface SearchItem {
    id: string | number;
}

function buildSearchCommand<T extends SearchItem>(
    commandInfo: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">,
    getSearchResults: (options: CommandOptions) => Promise<T[]>,
    buildButton: (item: T) => ButtonBuilder,
    buildMessage: (item: T, int: ChatInputCommandInteraction) => Promise<BaseMessageOptions>,
): Command {
    return {
        data: commandInfo,
        async execute(interaction: ChatInputCommandInteraction) {
            try {
                onCommandInteraction(interaction);
            } catch (e) {
                if (e instanceof Error) {
                    await interaction.reply({
                        content: e.message,
                        ephemeral: true,
                    });
                } else {
                    console.error('Error in command interaction hook!', e);
                    await interaction.reply({
                        content: 'An error occurred while validating this command',
                        ephemeral: true,
                    });
                }
                return;
            }

            let results: T[] | null = null;
            try {
                results = await getSearchResults(interaction.options);
            } catch (e) {
                if (e instanceof Error) {
                    console.error('Error while searching', e.message, e);
                } else {
                    console.error('Unknown error while searching', e);
                }
                await interaction.reply({
                    content: `An error occurred while trying to search with options: ${interaction.options.resolved}`,
                    ephemeral: true,
                });
                return;
            }

            if (!results || results.length === 0) {
                console.error('No results found:', results);
                await interaction.reply({
                    content: `No results`,
                    ephemeral: true,
                });
                return;
            }

            const rows: ActionRowBuilder<ButtonBuilder>[] = [];
            let currentRow = new ActionRowBuilder<ButtonBuilder>();
            for (const result of results) {
                if (currentRow.components.length === MAX_BUTTONS_PER_ROW) {
                    rows.push(currentRow);
                    currentRow = new ActionRowBuilder();
                }
                if (rows.length === MAX_ACTION_ROWS) {
                    break;
                }
                currentRow.addComponents(
                    buildButton(result)
                );
            }
            if (currentRow.components.length > 0) {
                rows.push(currentRow);
            }

            await interaction.reply({
                content: 'Search results',
                components: rows,
                ephemeral: false,
            });

            const interactionMessage = await interaction.fetchReply();

            const collector = interaction.channel?.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                componentType: ComponentType.Button,
                message: interactionMessage,
                max: 1,
                maxUsers: 1,
                time: 60000,
            });

            collector?.on('collect', async (i: ButtonInteraction) => {
                await i.deferReply();

                if (!results) {
                    console.error(
                        `Results are invalid: ${results} when responding to button`
                    );
                    return;
                }

                const itemId = i.customId;
                const item = results.find((c) => c.id.toString() === itemId);
                if (!item) {
                    console.error(
                        `Could not find result with id ${itemId} in results list: ${results}`
                    );
                    return;
                }

                await interaction.editReply({
                    content: `Displaying`,
                    components: [],
                });

                try {
                    const message = await buildMessage(item, interaction);

                    let embeds: (APIEmbed | JSONEncodable<APIEmbed>)[] = [];
                    if (message.embeds && message.embeds.length > 1) {
                        embeds = message.embeds.slice(1);
                        message.embeds = [message.embeds[0]];
                    }

                    await i.editReply(message);

                    for (const embed of embeds) {
                        await i.followUp({
                            embeds: [embed],
                        });
                    }
                } catch (e) {
                    if (e instanceof Error) {
                        console.error('Error while replying', e.message, e);
                    } else {
                        console.error('Unknown error while replying', e);
                    }
                    await i.editReply({
                        content: 'Error occurred',
                    });
                    return;
                }
            });

            collector?.on('end', (collected) => {
                if (collected.size === 0) {
                    interaction.deleteReply();
                }
            });
        },
    };
};

export { buildSearchCommand };
