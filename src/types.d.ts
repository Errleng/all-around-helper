import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';

export interface Command {
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
    execute: (interaction: CommandInteraction) => Promise<void>;
}

export interface ClientEvent {
    name: string;
    once: boolean;
    execute: (...interaction: Interaction<CacheType>) => void;
}
