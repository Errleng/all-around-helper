import * as dotenv from 'dotenv';
import dotenvParseVariables from 'dotenv-parse-variables';
import { CardRange, CardRarity, DiceCategory, Emotion } from './types';

const rawEnv = dotenv.config();
if (rawEnv.error || rawEnv.parsed === undefined) {
    throw new Error(`Environment variable parsing error: ${rawEnv.error}`);
}

export const env = dotenvParseVariables(rawEnv.parsed) as NodeJS.ProcessEnv;
export const POSTGRES_CONNECTION = {
    database: env.PGDATABASE,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    host: env.PGHOST,
    port: env.PGPORT,
};

export const ALLOWED_CHANNEL_IDS = ['770488167719501867', '936394221940772864', '713993861197987840'];

export const ASSETS_PATH = 'assets';
export const COMMANDS_PATH = './commands';
export const EVENTS_PATH = './events';
export const DOWNLOADED_AUDIO_PATH = 'downloads/audio';

export const DICE_TYPE_EMOJI_MAP: Record<string, string> = {
    DefEvasion: '🔄',
    DefGuard: '🛡️',
    AtkSlash: '🔪',
    AtkPenetrate: '📌',
    AtkHit: '💥',
    StandbyEvasion: '🔄',
    StandbyGuard: '🛡️',
    StandbySlash: '🔪',
    StandbyPenetrate: '📌',
    StandbyHit: '💥',
};
export const DICE_TYPE_CUSTOM_EMOJI_MAP: Record<string, string> = {
    DefEvasion: '<:defensiveevade:940003206648438824>',
    DefGuard: '<:defensiveguard:940003206094782514>',
    AtkSlash: '<:offensiveslash:940003206031872021>',
    AtkPenetrate: '<:offensivepierce:940003206270976010>',
    AtkHit: '<:offensiveblunt:940003205826367519>',
    StandbyEvasion: '<:counterevade:940003205654401067>',
    StandbyGuard: '<:counterguard:940003205750870059>',
    StandbySlash: '<:counterslash:939986712833196112>',
    StandbyPenetrate: '<:counterpierce:940003206241599518>',
    StandbyHit: '<:counterslash:940003205910249594>',
};
export const UNICODE_ASCII_MAP: Record<number, string> = {
    192: 'A',
    201: 'E',
    224: 'a',
    225: 'a',
    232: 'e',
    235: 'e',
    236: 'i',
    237: 'i',
    242: 'o',
    244: 'o',
    250: 'u',
    257: 'a',
    283: 'e',
    299: 'i',
    363: 'u',
    65039: '',
    7929: 'y',
    8217: "'",
    8230: '...',
    8544: 'I',
    8545: 'II',
    8546: 'III',
    8547: 'IV',
};

// MAPPINGS
// General
export const CARD_RARITY_COLOR_MAP: Record<CardRarity, string> = {
    [CardRarity.Common]: '#A8F29F',
    [CardRarity.Uncommon]: '#9AC6FA',
    [CardRarity.Rare]: '#BA97FF',
    [CardRarity.Unique]: '#FFC075',
};
export const DICE_CATEGORY_COLOR_MAP: Record<DiceCategory, string> = {
    [DiceCategory.Def]: '#11b6f7',
    [DiceCategory.Atk]: '#f5481c',
    [DiceCategory.Standby]: '#f9ba12',
};
export const EMOTION_COLOR_MAP: Record<Emotion, string> = {
    [Emotion.Positive]: '#50FF82',
    [Emotion.Negative]: '#FF4141',
};

// Tiphereth
export const TIPHERETH_CARD_RANGE_RAW_DATA_MAP: Record<string, CardRange> = {
    Melee: CardRange.Near,
    Ranged: CardRange.Far,
    'Mass (individual)': CardRange.FarAreaEach,
    'Mass (summation)': CardRange.FarArea,
    Immediate: CardRange.Instance,
};
export const TIPHERETH_CARD_RANGE_CUSTOM_EMOJI_MAP: Record<string, string> = {
    Melee: '<:rangemelee:940003205922824245>',
    Ranged: '<:rangeranged:940003206384209960>',
    'Mass (individual)': '<:rangemass:940003206371618836>',
    'Mass (summation)': '<:rangemass:940003206371618836>',
    Immediate: '<:rangeinstant:940003206166093855>',
};
export const TIPHERETH_CARD_RANGE_IMAGE_MAP: Record<string, string> = {
    Melee: 'range-melee.png',
    Ranged: 'range-ranged.png',
    'Mass (individual)': 'range-mass.png',
    'Mass (summation)': 'range-mass.png',
    Immediate: 'range-instant.png',
};

// Raw data / XML
export const CARD_RANGE_IMAGE_MAP: Record<CardRange, string> = {
    [CardRange.Near]: 'range-melee.png',
    [CardRange.Far]: 'range-ranged.png',
    [CardRange.FarArea]: 'range-mass.png',
    [CardRange.FarAreaEach]: 'range-mass.png',
    [CardRange.Instance]: 'range-instant.png',
};

export const DICE_IMAGE_MAP: Record<string, string> = {
    DefEvasion: 'defensive-evade.png',
    DefGuard: 'defensive-guard.png',
    AtkSlash: 'offensive-slash.png',
    AtkPenetrate: 'offensive-pierce.png',
    AtkHit: 'offensive-blunt.png',
    StandbyEvasion: 'counter-evade.png',
    StandbyGuard: 'counter-guard.png',
    StandbySlash: 'counter-slash.png',
    StandbyPenetrate: 'counter-pierce.png',
    StandbyHit: 'counter-blunt.png',
};

// Discord
export const MAX_ACTION_ROWS = 5;
export const MAX_BUTTONS_PER_ROW = 5;
