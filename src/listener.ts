import { Client } from 'discord.js';
import { isWithinRateLimit, updateRateLimit } from './utils';
const pos = require('pos');

export const startSoFarListener = (client: Client) => {
    const allowedGuilds = new Set(['922275863637135370', '770488167312785410']);

    client.on('messageCreate', (message) => {
        console.debug(`${message.guild?.name} > ${message.author.username}: ${message.content}`);
        if (message.author.bot
            || !allowedGuilds.has(message.guildId ?? '')
            || !isWithinRateLimit()) {
            return;
        }

        const words = new pos.Lexer().lex(message.content);
        const tagger = new pos.Tagger();
        const taggedWords = tagger.tag(words);

        let hasTriggerWord = false;
        let hasSuperlative = false;
        for (const token of taggedWords) {
            const word = token[0];
            const tag = token[1];
            if (tag === 'JJS') {
                hasSuperlative = true;
                break;
            }
        }

        if (hasTriggerWord || (hasSuperlative && Math.random() < 0.05)) {
            updateRateLimit();
            message.reply('*so far*');
        }
        if (!hasSuperlative) {
            // console.debug('no superlatives in', taggedWords);
        }
    });
};

