import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ApplicationCommandPermissionData,
    CacheType,
    CommandInteraction,
    Interaction,
} from 'discord.js';

export interface Command {
    permissions: ApplicationCommandPermissionData[];
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
