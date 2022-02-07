import { ColorResolvable } from 'discord.js';

export const ALLOWED_CHANNEL_IDS = ['770488167719501867', '936394221940772864'];

export const ASSETS_PATH = 'assets';
export const COMMANDS_PATH = './commands';
export const EVENTS_PATH = './events';
export const DICE_TYPE_EMOJI_MAP: Record<string, string> = {
    DefEvade: '🔄',
    DefGuard: '🛡️',
    AtkSlash: '🔪',
    AtkPierce: '📌',
    AtkBlunt: '💥',
    StandbyEvade: '🔄',
    StandbyGuard: '🛡️',
    StandbySlash: '🔪',
    StandbyPierce: '📌',
    StandbyBlunt: '💥',
};
export const DICE_TYPE_CUSTOM_EMOJI_MAP: Record<string, string> = {
    DefEvade: '<:defensiveevade:940003206648438824>',
    DefGuard: '<:defensiveguard:940003206094782514>',
    AtkSlash: '<:offensiveslash:940003206031872021>',
    AtkPierce: '<:offensivepierce:940003206270976010>',
    AtkBlunt: '<:offensiveblunt:940003205826367519>',
    StandbyEvade: '<:counterevade:940003205654401067>',
    StandbyGuard: '<:counterguard:940003205750870059>',
    StandbySlash: '<:counterslash:939986712833196112>',
    StandbyPierce: '<:counterpierce:940003206241599518>',
    StandbyBlunt: '<:counterslash:940003205910249594>',
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
export const DICE_GROUP_COLOR_MAP: Record<string, ColorResolvable> = {
    Def: 'BLUE',
    Atk: 'ORANGE',
    Standby: 'YELLOW',
};
