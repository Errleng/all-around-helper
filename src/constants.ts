import { ColorResolvable } from 'discord.js';

export const COMMANDS_PATH = './commands';
export const EVENTS_PATH = './events';
export const DICE_TYPE_IMAGE_MAP: Record<string, string> = {
    Evade: '↪️',
    Guard: '🛡️',
    Slash: '🔪',
    Pierce: '📌',
    Blunt: '💥',
};
export const CARD_RARITY_COLOR_MAP: Record<string, string> = {
    Common: '#DAFFCB',
    Uncommon: '#BDFFFF',
    Rare: '#FFB3FF',
    Unique: '#FFFF75',
};
export const DICE_GROUP_COLOR_MAP: Record<string, ColorResolvable> = {
    Def: 'BLUE',
    Atk: 'ORANGE',
    Standby: 'YELLOW',
};
