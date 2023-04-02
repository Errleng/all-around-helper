import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ColorResolvable,
    PermissionFlagsBits,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ChatInputCommandInteraction,
} from 'discord.js';
import { Book, CommandOptions } from '../types';
import { getBooksFromDatabase } from '../database';
import { buildSearchCommand } from '../command-builder';


const command = buildSearchCommand(
    new SlashCommandBuilder()
        .setName('ruina-book')
        .setDescription(
            'Replies with a random Library of Ruina book description'
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('Name of the book to search for')
                .setRequired(false)
        ),
    async (options: CommandOptions) => {
        let books = await getBooksFromDatabase();
        books = books.filter((book) => book.descs.join('').length > 0);

        const query = options.getString('name');
        if (query === null) {
            const randomBook = books[Math.floor(Math.random() * books.length)];
            return [randomBook];
        }
        return books;
    },
    (item: Book) => {
        return new ButtonBuilder()
            .setCustomId(item.id.toString())
            .setLabel(`${item.name}💡 (${item.id})`)
            .setStyle(ButtonStyle.Secondary);
    },
    async (item: Book, int: ChatInputCommandInteraction) => {
        const embeds = makeEmbeds(item);
        return {
            embeds,
        };
    }
);

const makeEmbeds = (book: Book,) => {
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

            const embed = new EmbedBuilder()
                .setColor(randomColor as ColorResolvable)
                .setTitle(`${book.name} (${book.id})`)
                .setDescription(currentText);
            embeds.push(embed);
            currentText = '';
        }
    }

    return embeds;
};

export default command;
