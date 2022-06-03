import { SlashCommandBuilder } from '@discordjs/builders';
import {
    CacheType,
    CommandInteraction,
    Interaction,
} from 'discord.js';

export interface Command {
    data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
    execute: (interaction: CommandInteraction) => Promise<void>;
}

export interface ClientEvent {
    name: string;
    once: boolean;
    execute: (args: Interaction<CacheType>) => void;
}

export interface Card {
    id: number;
    name: string;
    description: string;
    cost: number;
    rarity: CardRarity;
    range: CardRange;
    image: string;
    dice: Dice[];
}

export interface Dice {
    category: DiceCategory;
    type: DiceType;
    minRoll: number;
    maxRoll: number;
    description: string;
}

export interface Dialogue {
    category: DialogueCategory;
    speaker: string;
    text: string;
}

export interface Book {
    id: number;
    name: string;
    descs: string[];
}

export enum DiceCategory {
    Atk,
    Def,
    Standby,
}

export enum DiceType {
    Slash,
    Penetrate,
    Hit,
    Guard,
    Evasion,
}

export enum CardRange {
    Near,
    Far,
    FarArea,
    FarAreaEach,
    Instance,
}

export enum CardRarity {
    Common,
    Uncommon,
    Rare,
    Unique,
}

export enum DialogueCategory {
    Story,
    Combat,
}
