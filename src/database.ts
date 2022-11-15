import fs from 'fs';
import { Client } from 'pg';
import glob from 'glob';
import { env, POSTGRES_CONNECTION, UNICODE_ASCII_MAP } from './constants';
import {
    Book,
    Card,
    CardRange,
    CardRarity,
    Dice,
    DiceCategory,
    DiceType,
    Dialogue,
    DialogueCategory,
    Sound,
    SoundCategory,
    AbnoPage,
    AbnoTargetType,
    Emotion,
} from './types';
import {
    getCardsFromXml,
    getDialoguesFromCombatXml,
    getDialoguesFromStoryXml,
    getBooksFromXml,
    getAbnoPagesFromXml,
} from './utils';

export const resetDatabase = async () => {
    const dbClient = new Client(POSTGRES_CONNECTION);

    // delete everything
    await dbClient.connect();
    await dbClient.query('DROP TABLE IF EXISTS abno_pages');
    await dbClient.query('DROP TABLE IF EXISTS dice');
    await dbClient.query('DROP TABLE IF EXISTS cards');
    await dbClient.query('DROP TABLE IF EXISTS dialogues');
    await dbClient.query('DROP TABLE IF EXISTS books');
    await dbClient.query('DROP TABLE IF EXISTS sounds');
    await dbClient.query('DROP TYPE IF EXISTS abno_target_type');
    await dbClient.query('DROP TYPE IF EXISTS card_rarity');
    await dbClient.query('DROP TYPE IF EXISTS card_range');
    await dbClient.query('DROP TYPE IF EXISTS dice_type');
    await dbClient.query('DROP TYPE IF EXISTS dice_category');
    await dbClient.query('DROP TYPE IF EXISTS dialogue_category');
    await dbClient.query('DROP TYPE IF EXISTS emotion');
    await dbClient.query('DROP TYPE IF EXISTS sound_category');

    // create everything
    await dbClient.query(
        "CREATE TYPE abno_target_type AS ENUM ('SelectOne', 'All', 'AllIncludingEnemy')"
    );
    await dbClient.query(
        "CREATE TYPE card_rarity AS ENUM ('Common', 'Uncommon', 'Rare', 'Unique')"
    );
    await dbClient.query(
        "CREATE TYPE card_range AS ENUM ('Near', 'Far', 'FarArea', 'FarAreaEach', 'Instance')"
    );
    await dbClient.query(
        "CREATE TYPE dice_type AS ENUM ('Slash', 'Penetrate', 'Hit', 'Guard', 'Evasion')"
    );
    await dbClient.query(
        "CREATE TYPE dice_category AS ENUM ('Atk', 'Def', 'Standby')"
    );
    await dbClient.query(
        "CREATE TYPE dialogue_category AS ENUM ('Combat', 'Story')"
    );
    await dbClient.query(
        "CREATE TYPE emotion AS ENUM ('Positive', 'Negative')"
    );
    await dbClient.query(
        "CREATE TYPE sound_category AS ENUM ('SoundEffect', 'Music', 'Dialogue')"
    );
    await dbClient.query(`CREATE TABLE IF NOT EXISTS abno_pages (
        id              text primary key,
        name            text,
        description     text,
        sephirah        text,
        target_type     abno_target_type,
        emotion         emotion,
        emotion_level   int,
        emotion_rate    int,
        level           int,
        abnormality     text,
        flavorText      text,
        dialogue        text,
        image           text
    )`);
    await dbClient.query(`CREATE TABLE IF NOT EXISTS cards (
        id              int primary key,
        name            text,
        description     text,
        cost            int,
        rarity          card_rarity,
        range           card_range,
        image           text
    )`);
    await dbClient.query(`CREATE TABLE IF NOT EXISTS dice (
        card_id         int references cards(id),
        category        dice_category,
        type            dice_type,
        min_roll        int,
        max_roll        int,
        description     text,
        index           int
    )`);
    await dbClient.query(`CREATE TABLE IF NOT EXISTS dialogues (
        id              int generated always as identity,
        category        dialogue_category,
        speaker         text,
        text            text,
        voice_file      text
    )`);
    await dbClient.query(`CREATE TABLE IF NOT EXISTS books (
        id              int primary key,
        name            text,
        description     text
    )`);
    await dbClient.query(`CREATE TABLE IF NOT EXISTS sounds (
        id              int generated always as identity,
        category        sound_category,
        file_name        text
    )`);
    await dbClient.end();
    await populateDatabase();
};

const insertBooks = async (dbClient: Client, englishFilesPath: string) => {
    const bookFiles = fs
        .readdirSync(englishFilesPath)
        .filter((name) => /Books.*/.test(name));
    console.log('book files:', bookFiles);
    for (const fileName of bookFiles) {
        const xml = fs.readFileSync(`${englishFilesPath}/${fileName}`, 'utf-8');
        const xmlBooks = getBooksFromXml(xml);
        console.log(`inserting ${xmlBooks.length} books from ${fileName}`);
        for (const book of xmlBooks) {
            await insertBookIntoDatabase(dbClient, book);
        }
    }
};

const insertDialogues = async (dbClient: Client, englishFilesPath: string) => {
    const combatDialogueFiles = fs
        .readdirSync(englishFilesPath)
        .filter((name) => /CombatDialog_.*/.test(name));
    console.log('combat dialogue files:', combatDialogueFiles);
    for (const fileName of combatDialogueFiles) {
        const xml = fs.readFileSync(`${englishFilesPath}/${fileName}`, 'utf-8');
        const xmlDialogues = getDialoguesFromCombatXml(xml);
        console.log(
            `inserting ${xmlDialogues.length} combat dialogues from ${fileName}`
        );
        for (const dialogue of xmlDialogues) {
            await insertDialogueIntoDatabase(dbClient, dialogue);
        }
    }
    const storyDialogueFiles = fs
        .readdirSync(englishFilesPath)
        .filter((name) => /Chapter.*/.test(name));
    console.log('story dialogue files:', storyDialogueFiles);
    for (const fileName of storyDialogueFiles) {
        const xml = fs.readFileSync(`${englishFilesPath}/${fileName}`, 'utf-8');
        const xmlDialogues = getDialoguesFromStoryXml(xml);
        console.log(
            `inserting ${xmlDialogues.length} story dialogues from ${fileName}`
        );
        for (const dialogue of xmlDialogues) {
            await insertDialogueIntoDatabase(dbClient, dialogue);
        }
    }
};

const insertSounds = async (dbClient: Client) => {
    const basePath = env.EXTRACTED_ASSETS_DIR;
    const musicFiles = glob.sync(`${basePath}/Audio/OST/**/*`, { nodir: true });
    for (const fileName of musicFiles) {
        await insertSoundIntoDatabase(dbClient, { id: -1, category: SoundCategory.Music, fileName });
    }
    const soundEffectFiles = glob.sync(`${basePath}/Audio/SFX/**/*`, { nodir: true });
    for (const fileName of soundEffectFiles) {
        await insertSoundIntoDatabase(dbClient, { id: -1, category: SoundCategory.SoundEffect, fileName });
    }
    const dialogueFiles = glob.sync(`${basePath}/Audio/Dialogue/**/*`, { nodir: true });
    for (const fileName of dialogueFiles) {
        await insertSoundIntoDatabase(dbClient, { id: -1, category: SoundCategory.Dialogue, fileName });
    }
};

const insertAbnoPages = async (dbClient: Client, textFilesPath: string) => {
    const abnoInfoFiles = fs
        .readdirSync(textFilesPath)
        .filter((name) => /EmotionCard_.*/.test(name))
        .filter((name) => !name.includes('EmotionCard_enemy'));
    console.log('abno page info files:', abnoInfoFiles);

    const abnoPages: AbnoPage[] = [];
    for (const fileName of abnoInfoFiles) {
        const xml = fs.readFileSync(`${textFilesPath}/${fileName}`, 'utf-8');
        const xmlPages = getAbnoPagesFromXml(xml);
        xmlPages.forEach((page) => abnoPages.push(page));
    }

    const uniqueAbnoPages: AbnoPage[] = [];
    for (const page of abnoPages) {
        if (uniqueAbnoPages.some((existing) => existing.id === page.id)) {
            console.warn(
                `found page that already exists: ${page.name} (${page.id})`
            );
            continue;
        }
        uniqueAbnoPages.push(page);
    }

    for (const page of uniqueAbnoPages) {
        // replace Unicode characters with closest equivalents
        let filteredName = '';
        for (let i = 0; i < page.name.length; i++) {
            const charCode = page.name.charCodeAt(i);
            if (charCode in UNICODE_ASCII_MAP) {
                filteredName += UNICODE_ASCII_MAP[charCode];
            } else {
                filteredName += page.name.charAt(i);
            }
        }
        page.name = filteredName;

        await insertAbnoPageIntoDatabase(dbClient, page);
    }
};

const insertCards = async (dbClient: Client, textFilesPath: string) => {
    const cardInfoFiles = fs
        .readdirSync(textFilesPath)
        .filter((name) => /CardInfo_.*/.test(name));
    console.log('card info files:', cardInfoFiles);

    const cards: Card[] = [];
    for (const fileName of cardInfoFiles) {
        const xml = fs.readFileSync(`${textFilesPath}/${fileName}`, 'utf-8');
        const xmlCards = getCardsFromXml(xml);
        xmlCards.forEach((card) => cards.push(card));
    }

    const uniqueCards: Card[] = [];
    for (const card of cards) {
        if (uniqueCards.some((existing) => existing.id === card.id)) {
            console.warn(
                `found card that already exists: ${card.name} (${card.id})`
            );
            continue;
        }
        uniqueCards.push(card);
    }

    const unicodes = new Map();
    for (const card of uniqueCards) {
        // replace Unicode characters with closest equivalents
        let filteredName = '';
        for (let i = 0; i < card.name.length; i++) {
            const charCode = card.name.charCodeAt(i);
            if (charCode in UNICODE_ASCII_MAP) {
                filteredName += UNICODE_ASCII_MAP[charCode];
            } else {
                filteredName += card.name.charAt(i);
            }
        }
        card.name = filteredName;

        await insertCardIntoDatabase(dbClient, card);
    }
    console.log(JSON.stringify(Object.fromEntries(unicodes)));
};

const populateDatabase = async () => {
    // read everything from Library of Ruina XML
    const basePath = env.EXTRACTED_ASSETS_DIR;
    const textFilesPath = `${basePath}/text`;
    const englishFilesPath = `${textFilesPath}/EN`;

    const dbClient = new Client(POSTGRES_CONNECTION);
    await dbClient.connect();

    await insertAbnoPages(dbClient, textFilesPath);
    await insertCards(dbClient, textFilesPath);
    await insertBooks(dbClient, englishFilesPath);
    await insertDialogues(dbClient, englishFilesPath);
    await insertSounds(dbClient);

    await dbClient.end();
};

export const getAbnoPagesFromDatabase = async (name: string) => {
    const dbClient = new Client(POSTGRES_CONNECTION);
    await dbClient.connect();
    const pages = await dbClient.query(
        'SELECT * FROM abno_pages WHERE LOWER(name) LIKE LOWER($1)',
        [`%${name}%`]
    );

    const matches: AbnoPage[] = [];
    for (const row of pages.rows) {
        const page: AbnoPage = {
            id: row.id,
            name: row.name,
            description: row.description,
            sephirah: row.sephirah,
            targetType: row.targetType,
            emotion: row.emotion,
            emotionLevel: row.emotionLevel,
            emotionRate: row.emotionRate,
            level: row.level,
            abnormality: row.abnormality,
            flavorText: row.flavorText,
            dialogue: JSON.parse(row.dialogue),
            image: row.image
        };
        matches.push(page);
    }
    return matches;
};

export const getCardsFromDatabase = async (cardName: string) => {
    const dbClient = new Client(POSTGRES_CONNECTION);
    await dbClient.connect();
    const cards = await dbClient.query(
        'SELECT * FROM cards WHERE LOWER(name) LIKE LOWER($1)',
        [`%${cardName}%`]
    );
    const matches: Card[] = [];

    for (const cardRow of cards.rows) {
        // console.log('card row:', cardRow);
        const card: Card = {
            id: cardRow.id,
            name: cardRow.name,
            description: cardRow.description,
            cost: cardRow.cost,
            rarity: CardRarity[cardRow.rarity as keyof typeof CardRarity],
            range: CardRange[cardRow.range as keyof typeof CardRange],
            image: cardRow.image,
            dice: [],
        };
        const dice = await dbClient.query(
            'SELECT * FROM dice WHERE card_id = $1 ORDER BY index',
            [card.id]
        );
        for (const diceRow of dice.rows) {
            // console.log('dice row:', diceRow);
            const die: Dice = {
                category:
                    DiceCategory[diceRow.category as keyof typeof DiceCategory],
                type: DiceType[diceRow.type as keyof typeof DiceType],
                minRoll: diceRow.min_roll,
                maxRoll: diceRow.max_roll,
                description: diceRow.description,
            };
            card.dice.push(die);
        }
        // console.log('final card:', card);
        matches.push(card);
    }
    await dbClient.end();
    return matches;
};

export const getDialoguesFromDatabase = async () => {
    const dbClient = new Client(POSTGRES_CONNECTION);
    await dbClient.connect();
    const dialogues = await dbClient.query('SELECT * FROM dialogues');

    const result: Dialogue[] = [];
    for (const dialogueRow of dialogues.rows) {
        const dialogue: Dialogue = {
            category:
                DialogueCategory[
                dialogueRow.category as keyof typeof DialogueCategory
                ],
            speaker: dialogueRow.speaker,
            text: dialogueRow.text,
            voiceFile: dialogueRow.voice_file
        };
        result.push(dialogue);
    }

    await dbClient.end();
    return result;
};

export const getBooksFromDatabase = async (bookName?: string) => {
    const dbClient = new Client(POSTGRES_CONNECTION);
    await dbClient.connect();

    let books;

    if (bookName !== undefined) {
        books = await dbClient.query(
            'SELECT * FROM books WHERE LOWER(name) LIKE LOWER($1)',
            [`%${bookName}%`]
        );
    } else {
        books = await dbClient.query('SELECT * FROM books');
    }

    const result: Book[] = [];
    for (const bookRow of books.rows) {
        console.log('book row:', bookRow);
        const book: Book = {
            id: bookRow.id,
            name: bookRow.name,
            descs: JSON.parse(bookRow.description),
        };
        result.push(book);
    }
    await dbClient.end();
    return result;
};

export const getSoundsFromDatabase = async () => {
    const dbClient = new Client(POSTGRES_CONNECTION);
    await dbClient.connect();
    const sounds = await dbClient.query('SELECT * FROM sounds');

    const result: Sound[] = [];
    for (const row of sounds.rows) {
        const sound: Sound = {
            id: row.id,
            category:
                SoundCategory[
                row.category as keyof typeof SoundCategory
                ],
            fileName: row.file_name
        };
        result.push(sound);
    }

    await dbClient.end();
    return result;
};

const insertAbnoPageIntoDatabase = async (dbClient: Client, page: AbnoPage) => {
    await dbClient.query(
        'INSERT INTO abno_pages VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
        [
            page.id,
            page.name,
            page.description,
            page.sephirah,
            AbnoTargetType[page.targetType],
            Emotion[page.emotion],
            page.emotionLevel,
            page.emotionRate,
            page.level,
            page.abnormality,
            page.flavorText,
            JSON.stringify(page.dialogue),
            page.image,
        ]
    );
};

const insertCardIntoDatabase = async (dbClient: Client, card: Card) => {
    await dbClient.query(
        'INSERT INTO cards VALUES($1, $2, $3, $4, $5, $6, $7)',
        [
            card.id,
            card.name,
            card.description,
            card.cost,
            CardRarity[card.rarity],
            CardRange[card.range],
            card.image,
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
};

const insertDialogueIntoDatabase = async (
    dbClient: Client,
    dialogue: Dialogue
) => {
    await dbClient.query(
        'INSERT INTO dialogues(category, speaker, text, voice_file) VALUES($1, $2, $3, $4)',
        [DialogueCategory[dialogue.category], dialogue.speaker, dialogue.text, dialogue.voiceFile]
    );
};

const insertBookIntoDatabase = async (dbClient: Client, book: Book) => {
    await dbClient.query('INSERT INTO books VALUES($1, $2, $3)', [
        book.id,
        book.name,
        JSON.stringify(book.descs),
    ]);
};

const insertSoundIntoDatabase = async (dbClient: Client, sound: Sound) => {
    await dbClient.query(
        'INSERT INTO sounds(category, file_name) VALUES($1, $2)',
        [SoundCategory[sound.category], sound.fileName]
    );
};
