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

    const cardId = document
        .querySelector('.card_title')
        ?.querySelector('a')
        ?.href.match(/\d+/)?.[0];
    if (!cardId) {
        throw new Error(`Could not get id for card ${closestCardName}`);
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

    const cardCost = document.querySelector('.card_cost')?.textContent;
    if (!cardCost) {
        throw new Error(`Card ${closestCardName} cost is invalid!`);
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
            description: diceDesc,
        };
        cardDice.push(dice);
    });

    const cardRange = document
        .querySelector('.card_range .icon')
        ?.getAttribute('title');
    if (!cardRange) {
        throw new Error(`Unknown card range: ${cardRange}`);
    }

    const cardRarity = document
        .querySelector('.ent_info_table')
        ?.getAttribute('data-rarity');
    if (!cardRarity) {
        throw new Error(`Unknown card rarity: ${cardRarity}`);
    }
    const cardRarityColor = CARD_RARITY_COLOR_MAP[cardRarity];

    const card: Card = {
        id: Number(cardId),
        name: closestCardName,
        cost: Number(cardCost),
        description: cardDesc,
        range: cardRange,
        imageUrl: cardImgUrl,
        rarityColor: cardRarityColor,
        dice: cardDice,
    };

    if (isNaN(card.id) || isNaN(card.cost)) {
        throw new Error('Could not convert strings to numbers');
    }

    const dbClient = new Client(POSTGRES_CONNECTION);
    await dbClient.connect();
    await dbClient.query(
        'INSERT INTO cards VALUES($1, $2, $3, $4, $5, $6, $7)',
        [
            card.id,
            card.name,
            card.cost,
            card.description,
            card.range,
            card.imageUrl,
            card.rarityColor,
        ]
    );
    for (const [i, dice] of card.dice.entries()) {
        await dbClient.query(
            'INSERT INTO dice VALUES($1, $2, $3, $4, $5, $6, $7)',
            [
                card.id,
                DiceCategory[dice.category],
                DiceType[dice.type],
                dice.minRoll,
                dice.maxRoll,
                dice.description,
                i,
            ]
        );
    }
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

export const getCardFromDatabase = async (cardName: string) => {
    const dbClient = new Client(POSTGRES_CONNECTION);
    await dbClient.connect();
    const cards = await dbClient.query('SELECT * FROM cards WHERE name = $1', [
        cardName,
    ]);
    const matches: Card[] = [];

    for (const cardRow of cards.rows) {
        console.log('card row:', cardRow);
        const card: Card = {
            id: cardRow.id,
            name: cardRow.name,
            cost: cardRow.cost,
            description: cardRow.description,
            range: cardRow.range,
            imageUrl: cardRow.image_url,
            rarityColor: cardRow.rarity_color,
            dice: [],
        };
        const dice = await dbClient.query(
            'SELECT * FROM dice WHERE card_id = $1 ORDER BY index',
            [card.id]
        );
        for (const diceRow of dice.rows) {
            console.log('dice row:', diceRow);
            const die: Dice = {
                category: diceRow.category,
                type: diceRow.type,
                minRoll: diceRow.min_roll,
                maxRoll: diceRow.max_roll,
                description: diceRow.description,
            };
            card.dice.push(die);
        }
        console.log('final card:', card);
        matches.push(card);
    }
    await dbClient.end();
    return matches;
};

export const resetDatabase = async () => {
    const dbClient = new Client(POSTGRES_CONNECTION);

    // delete everything
    await dbClient.connect();
    await dbClient.query('DROP TABLE IF EXISTS dice');
    await dbClient.query('DROP TABLE IF EXISTS cards');
    await dbClient.query('DROP TYPE IF EXISTS dice_category');
    await dbClient.query('DROP TYPE IF EXISTS dice_type');

    // create everything
    await dbClient.query(
        "CREATE TYPE dice_type AS ENUM ('Slash', 'Pierce', 'Blunt', 'Guard', 'Evade')"
    );
    await dbClient.query(
        "CREATE TYPE dice_category AS ENUM ('Offensive', 'Defensive', 'Counter')"
    );
    await dbClient.query(`CREATE TABLE cards (
        id              int primary key,
        name            text,
        cost            int,
        description     text,
        range           text,
        image_url       text,
        rarity_color    text
    )`);
    await dbClient.query(`CREATE TABLE dice (
        card_id         int references cards(id),
        category        dice_category,
        type            dice_type,
        min_roll        int,
        max_roll        int,
        description     text,
        index           int
    )`);
    await dbClient.end();

    // for testing
    // await getCardData('Repressed Flesh');
    // await getCardFromDatabase('Repressed Flesh');
};
