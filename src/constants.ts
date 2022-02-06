import { ColorResolvable } from 'discord.js';

export const ASSETS_PATH = '../assets';
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
    DefEvade: '<:defensiveevade:939986712732520488>',
    DefGuard: '<:defensiveguard:939986712774443110>',
    AtkSlash: '<:offensiveslash:939986712904482826>',
    AtkPierce: '<:offensivepierce:939986712623448114>',
    AtkBlunt: '<:offensiveblunt:939986712719949845>',
    StandbyEvade: '<:counterevade:939986712803819551>',
    StandbyGuard: '<:counterguard:939986712795443220>',
    StandbySlash: '<:counterslash:939986712833196112>',
    StandbyPierce: '<:counterpierce:939986712766058556>',
    StandbyBlunt: '<:counterblunt:939986712770256896>',
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
