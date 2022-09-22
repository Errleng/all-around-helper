import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ColorResolvable,
    CommandInteraction,
    ButtonInteraction,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
} from 'discord.js';
import { onCommandInteraction } from '../utils';
import { Book, Command } from '../types';
import { getBooksFromDatabase } from '../database';
import { MAX_ACTION_ROWS, MAX_BUTTONS_PER_ROW } from '../constants';

const sendBookEmbeds = async (
    book: Book,
    int: CommandInteraction | ButtonInteraction
) => {
    const MAX_EMBED_LENGTH = 4096 - 100;
    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
    const embeds = [];

    let currentText = '';
    for (let i = 0; i < book.descs.length; ++i) {
        const desc = book.descs[i];
        currentText += desc + '\n\n';
        if (
            i === book.descs.length - 1 ||
            currentText.length + book.descs[i + 1].length > MAX_EMBED_LENGTH
        ) {
            currentText = currentText.replace(/\n+$/, '');
            console.log(
                'current text length',
                currentText.length,
                book.descs[i + 1]?.length
            );

            const embed = new MessageEmbed()
                .setColor(randomColor as ColorResolvable)
                .setTitle(`${book.name} (${book.id})`)
                .setDescription(currentText);
            embeds.push(embed);
            currentText = '';
        }
    }

    let firstReply = true;
    for (const embed of embeds) {
        if (firstReply) {
            firstReply = false;
            if (int.deferred || int.replied) {
                await int.editReply({
                    embeds: [embed],
                });
            } else {
                await int.reply({
                    embeds: [embed],
                });
            }
        } else {
            await int.followUp({
                embeds: [embed],
            });
        }
    }
};

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
            let books = await getBooksFromDatabase();
            if (books.length === 0) {
                await interaction.reply({
                    content: 'Could not find any books',
                    ephemeral: true,
                });
                return;
            }
            books = books.filter((book) => book.descs.join('').length > 0);
            const randomBook = books[Math.floor(Math.random() * books.length)];
            await sendBookEmbeds(randomBook, interaction);
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

            collector?.on('collect', async (int: ButtonInteraction) => {
                await int.deferReply();

                if (!books) {
                    console.error(
                        `Book list is invalid: ${books} when responding to button`
                    );
                    return;
                }

                const bookId = Number(int.customId);
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
                console.log('the interaction is', int);
                await sendBookEmbeds(book, int);
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
