import { Client } from 'discord.js';
import {isWithinRateLimit, updateRateLimit} from './utils';

export const startSoFarListener = (client: Client) => {
    const triggerWords = new Set(['never', 'ever', 'forever']);
    const allowedGuilds = new Set(['922275863637135370', '770488167312785410']);

    client.on('messageCreate', (message) => {
        if (message.author.bot
            || !allowedGuilds.has(message.guildId ?? '')
            || !isWithinRateLimit()) {
            return;
        }

        const words = message.content.match(/\b(\w+)\b/g);
        if (words === null) {
            return;
        }

        for (const word of words) {
            if (triggerWords.has(word.toLowerCase())) {
                updateRateLimit();
                message.reply('*so far*');
                return;
            }
        }
    });
};

