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
    TIPHERETH_CARD_RANGE_RAW_DATA_MAP,
} from './constants';
import { XMLParser } from 'fast-xml-parser';
import { inspect } from 'util';

let useCount = 0;
setInterval(() => {
    if (useCount > 0) {
        console.log(`reset useCount from ${useCount} to zero`);
    }
    useCount = 0;
}, 1000 * 60);

let allChannelUseCount = 0;
setInterval(() => {
    if (allChannelUseCount > 0) {
        console.log(`reset allChannelUseCount ${allChannelUseCount} to zero`);
    }
    allChannelUseCount = 0;
}, 1000 * 60 * 60);

export const onCommandInteraction = (interaction: CommandInteraction) => {
    console.log(
        `${interaction.createdTimestamp} - Command ${
            interaction.commandName
        } used in channel "${
            interaction.guild?.channels.cache.get(interaction.channelId)?.name
        }" (${interaction.channelId}) by user ${
            interaction.user.username
        } with arguments ${interaction.options}`
    );
    if (
        interaction.guild &&
        !ALLOWED_CHANNEL_IDS.includes(interaction.channelId)
    ) {
        // const channelNames = getGuildChannelsFromIds(
        //     interaction.guild,
        //     ALLOWED_CHANNEL_IDS
        // ).map((channel) => `#${channel.name}`);
        // throw new Error(
        //     `This bot is restricted to the channels \`${channelNames.join(
        //         ', '
        //     )}\``
        // );
        if (allChannelUseCount >= env.ALL_CHANNEL_REQUEST_LIMIT) {
            throw new Error(
                `Exceeded all channel rate limit of ${env.ALL_CHANNEL_REQUEST_LIMIT} requests per hour.`
            );
        }
        ++allChannelUseCount;
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
            if (fileNameNoExt.toLowerCase() === targetFileName.toLowerCase()) {
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

export const getCardsFromXml = (xml: string) => {
    const ALWAYS_ARRAY_TAGS = ['Card', 'Behaviour', 'Desc'];
    const xmlParser = new XMLParser({
        ignoreAttributes: false,
        // attributeNamePrefix: '',
        // attributesGroupName: '@',
        isArray: (name) => ALWAYS_ARRAY_TAGS.includes(name),
    });

    const getCardName = (cardId: string) => {
        const cardNamesFiles = fs
            .readdirSync(`${env.EXTRACTED_ASSETS_DIR}/Text/EN`)
            .filter((name) => /EN_BattleCards[^a-zA-Z].*/.test(name));
        for (const cardNameFile of cardNamesFiles) {
            const cardNamesXml = fs.readFileSync(
                `${env.EXTRACTED_ASSETS_DIR}/Text/EN/${cardNameFile}`,
                'utf-8'
            );
            const cardNamesJs = xmlParser.parse(cardNamesXml);
            const cardDescs: any[] =
                cardNamesJs['BattleCardDescRoot']['cardDescList'][
                    'BattleCardDesc'
                ];
            const cardDesc = cardDescs.find((desc) => desc['@_ID'] === cardId);
            if (cardDesc === undefined) {
                // may be a Korean-only card
                continue;
            }
            const cardName = cardDesc['LocalizedName'];
            if (!cardName) {
                continue;
            }
            // console.log(
            //     `found card name ${cardName} for card ${cardId} in file ${cardNameFile}`
            // );
            return cardName;
        }
        console.warn(`could not find card name for ${cardId}`);
        return null;
    };

    const getAbilityText = (
        cardId: string,
        abilityId: string,
        diceIndex?: number
    ) => {
        const abilityFiles = fs
            .readdirSync(`${env.EXTRACTED_ASSETS_DIR}/Text/EN`)
            .filter((name) => /EN_BattleCardAbilities.*/.test(name));
        for (const abilityFile of abilityFiles) {
            const abilitiesXml = fs.readFileSync(
                `${env.EXTRACTED_ASSETS_DIR}/Text/EN/${abilityFile}`,
                'utf-8'
            );
            const abilitiesJs = xmlParser.parse(abilitiesXml);
            const abilities: any[] =
                abilitiesJs['BattleCardAbilityDescRoot']['BattleCardAbility'];
            const ability = abilities.find(
                (desc) => desc['@_ID'] === abilityId
            );
            if (ability === undefined) {
                continue;
            }

            const abilityDescs = ability['Desc'];
            if (!abilityDescs || abilityDescs.length === 0) {
                continue;
            }
            const abilityDesc = abilityDescs.join('\n');
            // console.log(
            //     `found ability ${abilityId} for card ${cardId} in ${abilityFile}`
            // );
            return abilityDesc;
        }

        const cardFiles = fs
            .readdirSync(`${env.EXTRACTED_ASSETS_DIR}/Text/EN`)
            .filter((name) => /EN_BattleCards[^a-zA-Z].*/.test(name));
        for (const cardFile of cardFiles) {
            const cardXml = fs.readFileSync(
                `${env.EXTRACTED_ASSETS_DIR}/Text/EN/${cardFile}`,
                'utf-8'
            );
            const cardJs = xmlParser.parse(cardXml);
            const cardDescs: any[] =
                cardJs['BattleCardDescRoot']['cardDescList']['BattleCardDesc'];
            const cardDesc = cardDescs.find((desc) => desc['@_ID'] === cardId);
            if (cardDesc === undefined) {
                // may be a Korean-only card
                continue;
            }
            let abilityDesc = cardDesc['Ability'];
            if (diceIndex !== undefined) {
                const diceDescs: any[] = cardDesc['Behaviour'];
                if (diceDescs) {
                    abilityDesc = diceDescs.find(
                        (desc) => desc['@_ID'] === diceIndex.toString()
                    );
                    if (abilityDesc) {
                        abilityDesc = abilityDesc['#text'];
                    }
                }
            }
            if (!abilityDesc) {
                continue;
            }
            // console.log(
            //     `found ability ${abilityId} for card ${cardId} in ${cardFile}`
            // );
            return abilityDesc;
        }
        console.warn(
            `could not find ability with id: ${abilityId} for card ${cardId} and dice ${diceIndex}`
        );
        return '';
    };

    const getImagePath = (artworkId: string) => {
        if (!artworkId) {
            console.warn('invalid artwork id:', artworkId);
            return null;
        }
        const imageDir = `${env.EXTRACTED_ASSETS_DIR}/RawImages`;
        const imagePath = findFileRecur(artworkId, imageDir);
        if (imagePath === null) {
            // some cards just have no image
            return null;
        }
        return imagePath;
    };

    const jsObj = xmlParser.parse(xml);

    const jsCards = jsObj['DiceCardXmlRoot']['Card'];
    const cards: Card[] = [];
    for (const jsCard of jsCards) {
        let diceBehaviours: any[] = jsCard['BehaviourList']['Behaviour'];
        if (!diceBehaviours) {
            // some cards have no dice
            diceBehaviours = [];
        }
        const dice: Dice[] = [];
        const cardId = jsCard['@_ID'];

        for (const [i, behaviour] of diceBehaviours.entries()) {
            const category =
                DiceCategory[behaviour['@_Type'] as keyof typeof DiceCategory];
            const type =
                DiceType[behaviour['@_Detail'] as keyof typeof DiceType];
            const script = behaviour['@_Script'];
            let scriptDesc = '';
            if (script) {
                scriptDesc = getAbilityText(cardId, script, i);
            }
            const die: Dice = {
                category,
                type,
                minRoll: behaviour['@_Min'],
                maxRoll: behaviour['@_Dice'],
                description: scriptDesc,
            };
            dice.push(die);
        }

        const spec = jsCard['Spec'];
        const cardScript = jsCard['Script'];
        const cardName = getCardName(cardId) ?? jsCard['Name'];
        const cardImage = getImagePath(jsCard['Artwork']);
        if (cardImage === null) {
            // probably a card that is cut from the game
            console.log(
                `skipping card ${cardName} (${cardId}) because it has no image`
            );
            continue;
        }

        const card: Card = {
            id: Number(cardId),
            name: cardName,
            description: cardScript ? getAbilityText(cardId, cardScript) : '',
            cost: Number(spec['@_Cost']),
            range: CardRange[spec['@_Range'] as keyof typeof CardRange],
            rarity: CardRarity[jsCard['Rarity'] as keyof typeof CardRarity],
            image: cardImage,
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
