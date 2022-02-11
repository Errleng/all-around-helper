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
    cost: number;
    description: string;
    range: string;
    imageUrl: string;
    rarityColor: string;
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
    Offensive,
    Defensive,
    Counter,
}
export enum DiceType {
    Slash,
    Pierce,
    Blunt,
    Guard,
    Evade,
}
