import { ColorResolvable } from 'discord.js';
import * as dotenv from 'dotenv';
import dotenvParseVariables from 'dotenv-parse-variables';
import { DiceCategory } from './types';

const rawEnv = dotenv.config();
if (rawEnv.error || rawEnv.parsed === undefined) {
    throw new Error(`Environment variable parsing error: ${rawEnv.error}`);
}

export const env = dotenvParseVariables(rawEnv.parsed) as NodeJS.ProcessEnv;

export const ALLOWED_CHANNEL_IDS = ['770488167719501867', '936394221940772864'];

export const ASSETS_PATH = 'assets';
export const COMMANDS_PATH = './commands';
export const EVENTS_PATH = './events';
export const DICE_TYPE_EMOJI_MAP: Record<string, string> = {
    DefensiveEvade: '🔄',
    DefensiveGuard: '🛡️',
    OffensiveSlash: '🔪',
    OffensivePierce: '📌',
    OffensiveBlunt: '💥',
    CounterEvade: '🔄',
    CounterGuard: '🛡️',
    CounterSlash: '🔪',
    CounterPierce: '📌',
    CounterBlunt: '💥',
};
export const DICE_TYPE_CUSTOM_EMOJI_MAP: Record<string, string> = {
    DefensiveEvade: '<:defensiveevade:940003206648438824>',
    DefensiveGuard: '<:defensiveguard:940003206094782514>',
    OffensiveSlash: '<:offensiveslash:940003206031872021>',
    OffensivePierce: '<:offensivepierce:940003206270976010>',
    OffensiveBlunt: '<:offensiveblunt:940003205826367519>',
    CounterEvade: '<:counterevade:940003205654401067>',
    CounterGuard: '<:counterguard:940003205750870059>',
    CounterSlash: '<:counterslash:939986712833196112>',
    CounterPierce: '<:counterpierce:940003206241599518>',
    CounterBlunt: '<:counterslash:940003205910249594>',
};
export const CARD_RANGE_CUSTOM_EMOJI_MAP: Record<string, string> = {
    Melee: '<:rangemelee:940003205922824245>',
    Ranged: '<:rangeranged:940003206384209960>',
    'Mass (individual)': '<:rangemass:940003206371618836>',
    'Mass (summation)': '<:rangemass:940003206371618836>',
    Immediate: '<:rangeinstant:940003206166093855>',
};
export const CARD_RANGE_IMAGE_MAP: Record<string, string> = {
    Melee: 'range-melee.png',
    Ranged: 'range-ranged.png',
    'Mass (individual)': 'range-mass.png',
    'Mass (summation)': 'range-mass.png',
    Immediate: 'range-instant.png',
};
export const CARD_RARITY_COLOR_MAP: Record<string, string> = {
    Common: '#A8F29F',
    Uncommon: '#9AC6FA',
    Rare: '#BA97FF',
    Unique: '#FFC075',
};
export const DICE_CATEGORY_COLOR_MAP: Record<string, ColorResolvable> = {
    Defensive: 'BLUE',
    Offensive: 'ORANGE',
    Counter: 'YELLOW',
};
export const DICE_CATEGORY_JS_COLOR_MAP: Record<DiceCategory, string> = {
    [DiceCategory.Defensive]: '#11b6f7',
    [DiceCategory.Offensive]: '#f5481c',
    [DiceCategory.Counter]: '#f9ba12',
};
