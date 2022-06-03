import { SlashCommandBuilder } from '@discordjs/builders';
import {
    CommandInteraction,
    ButtonInteraction,
    MessageActionRow,
    MessageButton,
} from 'discord.js';
import { onCommandInteraction } from '../utils';
import { Book, Command } from '../types';
import { getBooksFromDatabase } from '../database';
import { MAX_ACTION_ROWS, MAX_BUTTONS_PER_ROW } from '../constants';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ruina-book')
        .setDescription(
            'Replies with a random Library of Ruina book description'
        )
        .setDefaultPermission(true)
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('Name of the book to search for')
                .setRequired(false)
        ),
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
                console.error('Error in command interaction hook!', e);
                await interaction.reply({
                    content: 'An error occurred while validating this command',
                    ephemeral: true,
                });
            }
            return;
        }

        const bookName = interaction.options.getString('name');
        if (bookName === null) {
            const books = await getBooksFromDatabase();
            if (books.length === 0) {
                await interaction.reply({
                    content: 'Could not find any books',
                    ephemeral: true,
                });
                return;
            }

            const randomBook = books[Math.floor(Math.random() * books.length)];
            await interaction.reply({
                content: `**${randomBook.name} (${
                    randomBook.id
                })**\n${randomBook.descs.join('\n')}`,
            });
        } else {
            let books: Book[] | null = null;
            try {
                books = await getBooksFromDatabase(bookName);
            } catch (e) {
                if (e instanceof Error) {
                    console.error(
                        'Error while getting book data',
                        e.message,
                        e
                    );
                } else {
                    console.error('Error while getting book data', e);
                }
                await interaction.reply({
                    content: `An error occurred while trying to search for the book "${bookName}"`,
                    ephemeral: true,
                });
                return;
            }

            if (!books || books.length === 0) {
                console.error('No books found:', books);
                await interaction.reply({
                    content: `No results for book named "${bookName}"`,
                    ephemeral: true,
                });
                return;
            }

            const rows: MessageActionRow[] = [];
            let currentRow = new MessageActionRow();
            for (const book of books) {
                if (currentRow.components.length === MAX_BUTTONS_PER_ROW) {
                    rows.push(currentRow);
                    currentRow = new MessageActionRow();
                }
                if (rows.length === MAX_ACTION_ROWS) {
                    break;
                }
                currentRow.addComponents(
                    new MessageButton()
                        .setCustomId(book.id.toString())
                        .setLabel(`${book.name}💡 (${book.id})`)
                        .setStyle('SECONDARY')
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

            const collector =
                interaction.channel?.createMessageComponentCollector({
                    filter: (i: ButtonInteraction) =>
                        i.user.id === interaction.user.id,
                    componentType: 'BUTTON',
                    message: interactionMessage,
                    max: 1,
                    maxUsers: 1,
                    time: 60000,
                });

            collector?.on('collect', async (i: ButtonInteraction) => {
                await i.deferReply();

                if (!books) {
                    console.error(
                        `Book list is invalid: ${books} when responding to button`
                    );
                    return;
                }

                const bookId = Number(i.customId);
                const book = books.find((c) => c.id === bookId);
                if (!book) {
                    console.error(
                        `Could not find book with id ${bookId} in book list: ${books}`
                    );
                    return;
                }

                await interaction.editReply({
                    content: `Displaying ${book.name} (${book.id})`,
                    components: [],
                });
                console.log('the interaction is', i);

                await i.editReply({
                    content: `**${book.name} (${book.id})**\n${book.descs.join(
                        '\n'
                    )}`,
                });
            });

            collector?.on('end', (collected) => {
                if (collected.size === 0) {
                    interaction.deleteReply();
                }
            });
        }
    },
};
export default command;
