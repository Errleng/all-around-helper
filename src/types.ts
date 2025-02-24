import { SlashCommandOptionsOnlyBuilder } from "@discordjs/builders";
import { AudioResource } from "@discordjs/voice";
import {
    CacheType,
    ChatInputCommandInteraction,
    CommandInteractionOptionResolver,
    Interaction,
} from "discord.js";

export type CommandOptions = Omit<
    CommandInteractionOptionResolver<CacheType>,
    "getMessage" | "getFocused"
>;

export interface Command {
    data: Omit<SlashCommandOptionsOnlyBuilder, "addSubcommand" | "addSubcommandGroup">;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface ClientEvent {
    name: string;
    once: boolean;
    execute: (args: Interaction<CacheType>) => void;
}

export interface AbnoPage {
    id: string;
    name: string;
    description: string;
    sephirah: string;
    targetType: AbnoTargetType;
    emotion: Emotion;
    emotionLevel: number;
    emotionRate: number;
    level: number;
    abnormality: string;
    flavorText: string;
    dialogue: string[];
    image: string;
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
    voiceFile: string;
}

export interface Book {
    id: number;
    name: string;
    descs: string[];
}

export interface Sound {
    id: number;
    category: SoundCategory;
    fileName: string;
}

export interface AudioInfo {
    name: string;
    loop: boolean;
    resource: AudioResource;
    createResource: () => AudioResource;
}

export interface SteamSale {
    id: number;
    gameId: string;
    creatorId: string;
    discountPercentage: number;
    lastChecked: string;
}

export enum AbnoTargetType {
    SelectOne,
    All,
    AllIncludingEnemy,
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

export enum Emotion {
    Positive,
    Negative,
}

export enum CardRange {
    Near,
    Far,
    FarArea,
    FarAreaEach,
    Instance,
    Special,
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

export enum SoundCategory {
    SoundEffect,
    Music,
    Dialogue,
}
