import fs from 'fs';
import { Client } from 'pg';
import { env, POSTGRES_CONNECTION } from './constants';
import { Card, CardRange, CardRarity, DiceCategory, DiceType } from './types';
import { getCardsFromXml } from './utils';

export const resetDatabase = async () => {
    const dbClient = new Client(POSTGRES_CONNECTION);

    // delete everything
    await dbClient.connect();
    await dbClient.query('DROP TABLE IF EXISTS dice');
    await dbClient.query('DROP TABLE IF EXISTS cards');
    await dbClient.query('DROP TYPE IF EXISTS card_rarity');
    await dbClient.query('DROP TYPE IF EXISTS card_range');
    await dbClient.query('DROP TYPE IF EXISTS dice_type');
    await dbClient.query('DROP TYPE IF EXISTS dice_category');

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
    await dbClient.end();
    await populateDatabase();
};

const populateDatabase = async () => {
    // read everything from Library of Ruina XML
    const basePath = env.EXTRACTED_ASSETS_DIR;
    const textFilesPath = `${basePath}/Text`;
    const cardInfoFiles = fs
        .readdirSync(textFilesPath)
        .filter((name) => /CardInfo_.*/.test(name));
    console.log('card info files:', cardInfoFiles);
    const cards: Card[] = [];
    for (const fileName of cardInfoFiles) {
        const xml = fs.readFileSync(`${textFilesPath}/${fileName}`, 'utf-8');
        const xmlCards = getCardsFromXml(xml);
        xmlCards.forEach((card) => cards.push(card));
        break;
    }
    for (const card of cards) {
        await insertCardIntoDatabase(card);
    }
};

const insertCardIntoDatabase = async (card: Card) => {
    const dbClient = new Client(POSTGRES_CONNECTION);
    await dbClient.connect();
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
    await dbClient.end();
};
