import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ApplicationCommandPermissionData,
    CommandInteraction,
} from 'discord.js';

export interface Command {
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
    permissions: ApplicationCommandPermissionData[];
    execute: (interaction: CommandInteraction) => Promise<void>;
}

export interface ClientEvent {
    name: string;
    once: boolean;
    execute: (...interaction: Interaction<CacheType>) => void;
}

export interface Card {
    name: string;
    cost: string;
    description: string;
    range: string;
    rangeFileName: string;
    imageUrl: string;
    rarityColor: string;
}
