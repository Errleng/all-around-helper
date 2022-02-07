import {
    ColorResolvable,
    Guild,
    GuildBasedChannel,
    MessageAttachment,
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { Card } from './types';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import {
    ASSETS_PATH,
    CARD_RANGE_IMAGE_MAP,
    CARD_RARITY_COLOR_MAP,
    DICE_GROUP_COLOR_MAP,
    DICE_TYPE_CUSTOM_EMOJI_MAP,
    DICE_TYPE_EMOJI_MAP,
    env,
} from './constants';
import * as Canvas from 'canvas';

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

    let cardText = document.querySelector(
        '.card_script[data-lang="en"]'
    )?.textContent;

    if (cardText === null || cardText === undefined) {
        throw new Error(
            `Card ${closestCardName} has null or undefined description!`
        );
    }
    if (cardText.length > 0) {
        cardText += '\n';
    }

    const cardCost = document.querySelector('.card_cost')?.textContent;
    if (!cardCost) {
        throw new Error(`Card ${closestCardName} cost is invalid!`);
    }

    const cardDice = document.querySelectorAll('.card_back .card_dice');
    cardDice.forEach((dice) => {
        const diceGroup = dice.getAttribute('data-type');
        const diceType = dice.getAttribute('data-detail');
        const diceRolls = dice
            .querySelector('.card_dice_range')
            ?.textContent?.replace(' - ', '~');
        let diceDesc = dice.querySelector(
            '.card_dice_desc span[data-lang="en"]:not(:empty)'
        )?.textContent;
        if (!diceGroup) {
            console.warn(`Dice group '${diceGroup}' is invalid!`);
            return;
        }
        if (!diceType) {
            console.warn(`Dice type '${diceType}' is invalid!`);
            return;
        }
        if (!diceRolls) {
            console.warn(`Dice range '${diceRolls}' is invalid!`);
            return;
        }
        if (!diceDesc) {
            // console.warn(`Dice description '${diceDesc}' is invalid!`);
            diceDesc = '';
        }

        const emojiKey = `${diceGroup}${diceType}`;
        let diceEmoji = DICE_TYPE_EMOJI_MAP[emojiKey];
        if (env.USE_CUSTOM_EMOJIS) {
            diceEmoji = DICE_TYPE_CUSTOM_EMOJI_MAP[emojiKey];
        }

        let text = '';
        if (env.USE_COLORED_TEXT) {
            text = `\`\`\`${getSyntaxForColor(
                DICE_GROUP_COLOR_MAP[diceGroup]
            )}\n${diceEmoji}[${diceRolls}]\t${diceDesc}\n\`\`\``;
        } else {
            text = `\n${diceEmoji}\t\t\t**${diceRolls}**\t\t\t${diceDesc}`;
        }
        cardText += text;
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
        description: cardText,
        range: cardRange,
        rangeFileName: cardRangeImageFileName,
        imageUrl: cardImgUrl,
        rarityColor: cardRarityColor,
    };
    return card;
};

export const createImage = async (
    cardName: string,
    topText: string,
    bottomText: string
) => {
    const card = await getCardData(cardName);
    if (!card) {
        throw new Error(`Card ${cardName} data is invalid`);
    }

    // card art is usually 410x310
    const canvas = Canvas.createCanvas(410, 310);
    const context = canvas.getContext('2d');
    const cardImage = await Canvas.loadImage(card.imageUrl);

    const topTextHeight = 40;
    const bottomTextHeight = 290;
    const lineHeight = 30;

    context.font = '32px Impact';
    context.fillStyle = '#FFFFFF';
    context.strokeStyle = '#000000';

    context.drawImage(cardImage, 0, 0, canvas.width, canvas.height);

    context.textAlign = 'center';
    context.lineWidth = 5;
    const topTextLines = getLines(context, topText, canvas.width);
    for (let i = 0; i < topTextLines.length; i++) {
        const line = topTextLines[i];
        context.strokeText(
            line,
            canvas.width / 2,
            topTextHeight + i * lineHeight
        );
        context.fillText(
            line,
            canvas.width / 2,
            topTextHeight + i * lineHeight
        );
    }
    const bottomTextLines = getLines(context, bottomText, canvas.width);
    for (let i = 0; i < bottomTextLines.length; i++) {
        const line = bottomTextLines[i];
        context.strokeText(
            line,
            canvas.width / 2,
            bottomTextHeight + i * lineHeight
        );
        context.fillText(
            line,
            canvas.width / 2,
            bottomTextHeight + i * lineHeight
        );
    }

    const attachment = new MessageAttachment(
        canvas.toBuffer(),
        'card-image.png'
    );

    return attachment;
};

const getLines = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
) => {
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
