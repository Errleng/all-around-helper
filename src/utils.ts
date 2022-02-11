import {
    ColorResolvable,
    CommandInteraction,
    Guild,
    GuildBasedChannel,
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { Card, Dice, DiceCategory, DiceType } from './types';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import {
    ALLOWED_CHANNEL_IDS,
    CARD_RANGE_IMAGE_MAP,
    CARD_RARITY_COLOR_MAP,
    env,
    POSTGRES_CONNECTION,
} from './constants';
import { Client } from 'pg';

export const getFileNamesNoExt: (dirPath: string) => string[] = (dirPath) => {
    return fs
        .readdirSync(dirPath)
        .filter((fileName) => fileName.endsWith('.ts'))
        .map((fileName) => path.parse(fileName).name);
};

export const importDefaults: <Type>(
    dirPath: string
) => Promise<Type[]> = async (dirPath) => {
    const fileNames = getFileNamesNoExt(`./src/${dirPath}`);
    const imports = [];
    for (const fileName of fileNames) {
        imports.push((await import(`${dirPath}/${fileName}`)).default);
    }
    return imports;
};

export const getGuildChannelsFromIds: (
    guild: Guild,
    ids: string[]
) => GuildBasedChannel[] = (guild, ids) => {
    const channels: GuildBasedChannel[] = [];
    ids.forEach((id) => {
        const channel = guild.channels.cache.get(id);
        if (channel) {
            channels.push(channel);
        }
    });
    return channels;
};

export const getSyntaxForColor: (color: ColorResolvable) => string = (
    color
) => {
    switch (color) {
        case 'YELLOW':
            return 'fix';
        case 'ORANGE':
            return 'css';
        case 'BLUE':
            return 'ini';
        default:
            return '';
    }
};

export const getCardDetailHtml: (cardName: string) => Promise<string> = async (
    cardName
) => {
    let url = `${env.DATABASE_URL}/lor/cards/?qn=${cardName}`;
    let response = await fetch(url);
    console.log(`response 1 from ${url} is ${response}`);
    let responseBody = await response.text();
    const { document } = new JSDOM(responseBody).window;

    if (document === null) {
        throw new Error(`document is null when getting ${cardName} page`);
    }

    const cardDetailLink = document
        .querySelector('.card_title')
        ?.querySelector('a')?.href;
    if (cardDetailLink === undefined) {
        throw new Error(
            `Could not get link to detail page for card ${cardName}`
        );
    }

    url = `${env.DATABASE_URL}${cardDetailLink}`;
    response = await fetch(url);
    console.log(`response 2 from ${url} is ${response}`);
    responseBody = await response.text();
    return responseBody;
};

export const getCardData: (cardName: string) => Promise<Card> = async (
    cardName
) => {
    const cardPageHtml = await getCardDetailHtml(cardName);
    const document = new JSDOM(cardPageHtml).window.document;
    if (document === null) {
        throw new Error(`Card ${cardName} data page's document is null`);
    }

    const closestCardName = document
        .querySelector('.card_title')
        ?.querySelector('span[data-lang="en"]')?.textContent;

    if (!closestCardName) {
        throw new Error(`Invalid closest card name: ${closestCardName}`);
    }

    let cardImgUrl = document
        .querySelector('[data-label="Artwork"]')
        ?.querySelector('img')?.src;

    if (!cardImgUrl) {
        throw new Error(`Card ${closestCardName} has no image!`);
    } else {
        cardImgUrl = `${env.DATABASE_URL}${cardImgUrl}`;
    }

    const cardDesc = document.querySelector(
        '.card_script[data-lang="en"]'
    )?.textContent;

    if (cardDesc === null || cardDesc === undefined) {
        throw new Error(
            `Card ${closestCardName} has null or undefined description!`
        );
    }

    const cardCostText = document.querySelector('.card_cost')?.textContent;
    if (!cardCostText) {
        throw new Error(`Card ${closestCardName} cost is invalid!`);
    }
    const cardCost = parseInt(cardCostText, 10);
    if (isNaN(cardCost)) {
        throw new Error(`Cannot parse ${cardCostText} as a number`);
    }

    const cardDice: Dice[] = [];
    const cardDiceElems = document.querySelectorAll('.card_back .card_dice');
    cardDiceElems.forEach((diceElem) => {
        const diceCategory = diceElem.getAttribute('data-type');
        const diceType = diceElem.getAttribute('data-detail');
        const diceRoll =
            diceElem.querySelector('.card_dice_range')?.textContent;
        let diceDesc = diceElem.querySelector(
            '.card_dice_desc span[data-lang="en"]:not(:empty)'
        )?.textContent;
        if (!diceCategory) {
            console.warn(`Dice category '${diceCategory}' is invalid!`);
            return;
        }
        if (!diceType) {
            console.warn(`Dice type '${diceType}' is invalid!`);
            return;
        }
        if (!diceRoll) {
            console.warn(`Dice range '${diceRoll}' is invalid!`);
            return;
        }
        if (!diceDesc) {
            // console.warn(`Dice description '${diceDesc}' is invalid!`);
            diceDesc = '';
        }

        const diceCategoryMap: Record<string, DiceCategory> = {
            Atk: DiceCategory.Offensive,
            Def: DiceCategory.Defensive,
            Standby: DiceCategory.Counter,
        };
        const diceTypeMap: Record<string, DiceType> = {
            Slash: DiceType.Slash,
            Pierce: DiceType.Pierce,
            Blunt: DiceType.Blunt,
            Guard: DiceType.Guard,
            Evade: DiceType.Evade,
        };

        const diceRolls = diceRoll.split(' - ');
        const minRoll = parseInt(diceRolls[0]);
        const maxRoll = parseInt(diceRolls[1]);
        if (isNaN(minRoll) || isNaN(maxRoll)) {
            throw new Error(
                `Could not parse dice rolls ${diceRolls} to numbers`
            );
        }

        const dice: Dice = {
            category: diceCategoryMap[diceCategory],
            type: diceTypeMap[diceType],
            minRoll,
            maxRoll,
            desc: diceDesc,
        };
        cardDice.push(dice);
    });

    const cardRange = document
        .querySelector('.card_range .icon')
        ?.getAttribute('title');
    if (!cardRange) {
        throw new Error(`Unknown card range: ${cardRange}`);
    }
    const cardRangeImageFileName = CARD_RANGE_IMAGE_MAP[cardRange];

    const cardRarity = document
        .querySelector('.ent_info_table')
        ?.getAttribute('data-rarity');
    if (!cardRarity) {
        throw new Error(`Unknown card rarity: ${cardRarity}`);
    }
    const cardRarityColor = CARD_RARITY_COLOR_MAP[cardRarity];

    const card: Card = {
        name: closestCardName,
        cost: cardCost,
        description: cardDesc,
        range: cardRange,
        rangeFileName: cardRangeImageFileName,
        imageUrl: cardImgUrl,
        rarityColor: cardRarityColor,
        dice: cardDice,
    };
    const dbClient = new Client(POSTGRES_CONNECTION);
    await dbClient.connect();
    await dbClient.end();
    return card;
};

let useCount = 0;
setInterval(() => {
    if (useCount > 0) {
        console.log(`ruina-card-meme reset useCount from ${useCount} to zero`);
    }
    useCount = 0;
}, 1000 * 60);
export const onCommandInteraction = (interaction: CommandInteraction) => {
    console.log(
        `Command ${interaction.commandName} used in channel ${
            interaction.guild?.channels.cache.get(interaction.channelId)?.name
        } (${interaction.channelId})`
    );
    if (
        interaction.guild &&
        !ALLOWED_CHANNEL_IDS.includes(interaction.channelId)
    ) {
        const channelNames = getGuildChannelsFromIds(
            interaction.guild,
            ALLOWED_CHANNEL_IDS
        ).map((channel) => `#${channel.name}`);
        throw new Error(
            `This bot is restricted to the channels \`${channelNames.join(
                ', '
            )}\``
        );
    }

    if (useCount >= env.REQUEST_LIMIT) {
        throw new Error(
            `Exceeded rate limit of ${env.REQUEST_LIMIT} requests per minute.`
        );
    }
    ++useCount;
};

export const getTextHeight = (
    context: CanvasRenderingContext2D,
    text: string
) => {
    const metrics = context.measureText(text);
    return metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
};

export const getCanvasLines = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
) => {
    if (!text) {
        return [];
    }
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + ' ' + word).width;
        if (width < maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
};

export const resetDatabase = async () => {
    const dbClient = new Client(POSTGRES_CONNECTION);
    await dbClient.connect();
    dbClient.query(`CREATE TABLE cards (
        name    text,
        cost 
    )`);
    await dbClient.end();
};
