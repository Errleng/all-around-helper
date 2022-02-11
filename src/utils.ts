import {
    ColorResolvable,
    CommandInteraction,
    Guild,
    GuildBasedChannel,
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import {
    Card,
    CardRange,
    CardRarity,
    Dice,
    DiceCategory,
    DiceType,
} from './types';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import {
    ALLOWED_CHANNEL_IDS,
    env,
    POSTGRES_CONNECTION,
    TIPHERETH_CARD_RANGE_RAW_DATA_MAP,
} from './constants';
import { Client } from 'pg';
import { XMLParser } from 'fast-xml-parser';
import { inspect } from 'util';

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

export const getFileNamesNoExt: (dirPath: string) => string[] = (dirPath) => {
    return fs
        .readdirSync(dirPath)
        .filter((fileName) => fileName.endsWith('.ts'))
        .map((fileName) => path.parse(fileName).name);
};

export const findFileRecur: (
    targetFileName: string,
    dir: string
) => string | null = (targetFileName, dir) => {
    const files = fs.readdirSync(dir);
    for (const fileName of files) {
        const fullPath = path.join(dir, fileName);
        if (fs.lstatSync(fullPath).isDirectory()) {
            const result = findFileRecur(targetFileName, fullPath);
            if (result !== null) {
                return result;
            }
        } else {
            const fileNameNoExt = path.parse(fileName).name;
            if (fileNameNoExt === targetFileName) {
                return fullPath;
            }
        }
    }
    return null;
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

export const getCardDataTiphereth: (cardName: string) => Promise<Card> = async (
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

        const diceRolls = diceRoll.split(' - ');
        const minRoll = parseInt(diceRolls[0]);
        const maxRoll = parseInt(diceRolls[1]);
        if (isNaN(minRoll) || isNaN(maxRoll)) {
            throw new Error(
                `Could not parse dice rolls ${diceRolls} to numbers`
            );
        }

        const dice: Dice = {
            category: DiceCategory[diceCategory as keyof typeof DiceCategory],
            type: DiceType[diceType as keyof typeof DiceType],
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

    const card: Card = {
        id: Number(cardId),
        name: closestCardName,
        description: cardDesc,
        cost: Number(cardCost),
        rarity: CardRarity[cardRarity as keyof typeof CardRarity],
        range: TIPHERETH_CARD_RANGE_RAW_DATA_MAP[cardRange],
        image: cardImgUrl,
        dice: cardDice,
    };

    if (isNaN(card.id) || isNaN(card.cost)) {
        throw new Error('Could not convert strings to numbers');
    }
    return card;
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
            description: cardRow.description,
            cost: cardRow.cost,
            rarity: cardRow.rarity,
            range: cardRow.range,
            image: cardRow.image,
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

export const getCardsFromXml = (xml: string) => {
    const ALWAYS_ARRAY_TAGS = ['Behaviour'];
    const xmlParser = new XMLParser({
        ignoreAttributes: false,
        // attributeNamePrefix: '',
        // attributesGroupName: '@',
        isArray: (name) => ALWAYS_ARRAY_TAGS.includes(name),
    });

    const getCardName = (cardId: string) => {
        const cardNamesXml = fs.readFileSync(
            `${env.EXTRACTED_ASSETS_DIR}/Text/EN/EN_BattleCards.txt`,
            'utf-8'
        );
        const cardNamesJs = xmlParser.parse(cardNamesXml);
        console.log('card names parsed:', cardNamesJs);
        const cardDescs: any[] =
            cardNamesJs['BattleCardDescRoot']['cardDescList']['BattleCardDesc'];
        const cardDesc = cardDescs.find((desc) => desc['@_ID'] === cardId);
        if (cardDesc === undefined) {
            throw new Error(`Could not find card name with id: ${cardDesc}`);
        }
        return cardDesc['LocalizedName'];
    };

    const getAbilityText = (abilityId: string) => {
        const abilitiesXml = fs.readFileSync(
            `${env.EXTRACTED_ASSETS_DIR}/Text/EN/EN_BattleCardAbilities.txt`,
            'utf-8'
        );
        const abilitiesJs = xmlParser.parse(abilitiesXml);
        console.log('card abilities parsed:', abilitiesJs);
        const abilities: any[] =
            abilitiesJs['BattleCardAbilityDescRoot']['BattleCardAbility'];
        const ability = abilities.find((desc) => desc['@_ID'] === abilityId);
        if (ability === undefined) {
            throw new Error(`Could not find ability with id: ${abilityId}`);
        }
        return ability['Desc'];
    };

    const getImagePath = (artworkId: string) => {
        const imageDir = `${env.EXTRACTED_ASSETS_DIR}/RawImages`;
        const imagePath = findFileRecur(artworkId, imageDir);
        if (imagePath === null) {
            throw new Error(`Could not find image of card: ${artworkId}`);
        }
        console.log(`Found image path for ${artworkId}: ${imagePath}`);
        return imagePath;
    };

    console.log('xml', xml);
    const jsObj = xmlParser.parse(xml);
    console.log(inspect(jsObj, false, null));

    const jsCards = jsObj['DiceCardXmlRoot']['Card'];
    const cards: Card[] = [];
    for (const jsCard of jsCards) {
        const diceBehaviours = jsCard['BehaviourList']['Behaviour'];
        console.log('dice behaviour', diceBehaviours);
        const dice: Dice[] = [];
        for (const behaviour of diceBehaviours) {
            const category =
                DiceCategory[behaviour['@_Type'] as keyof typeof DiceCategory];
            const type =
                DiceType[behaviour['@_Detail'] as keyof typeof DiceType];
            const die: Dice = {
                category,
                type,
                minRoll: behaviour['@_Min'],
                maxRoll: behaviour['@_Dice'],
                description: behaviour['@_Desc'],
            };
            dice.push(die);
        }

        const spec = jsCard['Spec'];

        const cardId = jsCard['@_ID'];
        const cardScript = jsCard['Script'];
        const cardName = getCardName(cardId);

        const card: Card = {
            id: Number(cardId),
            name: cardName,
            description: cardScript ? getAbilityText(cardScript) : '',
            cost: Number(spec['@_Cost']),
            range: CardRange[spec['@_Range'] as keyof typeof CardRange],
            rarity: CardRarity[jsCard['Rarity'] as keyof typeof CardRarity],
            image: getImagePath(jsCard['Artwork']),
            dice,
        };
        cards.push(card);
    }
    return cards;
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
