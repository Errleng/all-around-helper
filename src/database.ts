import fs from 'fs';
import { Client } from 'pg';
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
} from './types';
import {
    getCardsFromXml,
    getDialoguesFromCombatXml,
    getDialoguesFromStoryXml,
    getBooksFromXml,
} from './utils';

export const resetDatabase = async () => {
    const dbClient = new Client(POSTGRES_CONNECTION);

    // delete everything
    await dbClient.connect();
    await dbClient.query('DROP TABLE IF EXISTS dice');
    await dbClient.query('DROP TABLE IF EXISTS cards');
    await dbClient.query('DROP TABLE IF EXISTS dialogues');
    await dbClient.query('DROP TABLE IF EXISTS books');
    await dbClient.query('DROP TYPE IF EXISTS card_rarity');
    await dbClient.query('DROP TYPE IF EXISTS card_range');
    await dbClient.query('DROP TYPE IF EXISTS dice_type');
    await dbClient.query('DROP TYPE IF EXISTS dice_category');
    await dbClient.query('DROP TYPE IF EXISTS dialogue_category');

    // create everything
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
    await dbClient.query(`CREATE TABLE cards (
        id              int primary key,
        name            text,
        description     text,
        cost            int,
        rarity          card_rarity,
        range           card_range,
        image           text
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
    await dbClient.query(`CREATE TABLE dialogues (
        id              int generated always as identity,
        category        dialogue_category,
        speaker         text,
        text            text
    )`);
    await dbClient.query(`CREATE TABLE books (
        id              int primary key,
        name            text,
        description     text
    )`);
    await dbClient.end();
    await populateDatabase();
};

const populateDatabase = async () => {
    // read everything from Library of Ruina XML
    const basePath = env.EXTRACTED_ASSETS_DIR;
    const textFilesPath = `${basePath}/text`;
    const englishFilesPath = `${textFilesPath}/EN`;

    const dbClient = new Client(POSTGRES_CONNECTION);
    await dbClient.connect();

    // insert books
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

    // insert dialogues
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

    // insert cards
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

    await dbClient.end();
    console.log(JSON.stringify(Object.fromEntries(unicodes)));
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
            'SELECT * FROM cards WHERE LOWER(name) LIKE LOWER($1)',
            [`%${bookName}%`]
        );
    } else {
        books = await dbClient.query('SELECT * FROM books');
    }

    const result: Book[] = [];
    for (const bookRow of books.rows) {
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
        'INSERT INTO dialogues(category, speaker, text) VALUES($1, $2, $3)',
        [DialogueCategory[dialogue.category], dialogue.speaker, dialogue.text]
    );
};

const insertBookIntoDatabase = async (dbClient: Client, book: Book) => {
    await dbClient.query('INSERT INTO books VALUES($1, $2, $3)', [
        book.id,
        book.name,
        JSON.stringify(book.descs),
    ]);
};
