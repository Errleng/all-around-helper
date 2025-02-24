import { client } from "./index";
import { TextChannel } from "discord.js";
import {
    insertSteamSaleIntoDatabase,
    getSteamSalesFromDatabase,
    deleteSteamSaleFromDatabase,
} from "./database";
import { Client } from "pg";
import { POSTGRES_CONNECTION } from "./constants";

const DISCOUNT_PERCENT_THRESHOLD = 30;
const MINUTES_AGO_THRESHOLD = 60 * 24 * 3;
const BROADCAST_CHANNEL_IDS = ["923943170318925874", "713993861197987840"];

export const getGameData = async (gameId: string) => {
    const url = `https://store.steampowered.com/api/appdetails?appids=${gameId}`;
    const response = await fetch(url);
    const responseBody = await response.json();
    if (!responseBody[gameId].success) {
        console.error(`Failed to get Steam game data for ${gameId}`);
        return null;
    }
    return responseBody;
};

export const addSteamGame = async (gameId: string, creatorId: string) => {
    const gameData = await getGameData(gameId);
    if (gameData === null) {
        return false;
    }
    const data = gameData[gameId].data;
    const discountPercentage: number = parseInt(data.price_overview.discount_percent);

    const dbClient = new Client(POSTGRES_CONNECTION);
    await dbClient.connect();
    await insertSteamSaleIntoDatabase(dbClient, {
        id: 0,
        gameId,
        creatorId,
        discountPercentage,
        lastChecked: new Date().toISOString(),
    });
    await dbClient.end();
    return true;
};

export const removeSteamGame = async (gameId: string) => {
    const dbClient = new Client(POSTGRES_CONNECTION);
    await dbClient.connect();
    await deleteSteamSaleFromDatabase(dbClient, gameId);
    await dbClient.end();
    return true;
};

export const checkSteamSales = async () => {
    const steamSales = await getSteamSalesFromDatabase();
    for (const sale of steamSales) {
        const gameData = await getGameData(sale.gameId);
        if (gameData === null) {
            continue;
        }

        const data = gameData[sale.gameId].data;
        const discountPercentage: number = parseInt(data.price_overview.discount_percent);
        const lastChecked = new Date(sale.lastChecked);
        const msAgo = new Date().getTime() - lastChecked.getTime();
        const minutesAgo = msAgo / (1000 * 60);
        console.log(
            `Steam game ${sale.gameId} has discount ${discountPercentage}% and previous discount ${sale.discountPercentage}%, last checked ${minutesAgo} minutes ago at ${sale.lastChecked}`,
        );
        if (minutesAgo < MINUTES_AGO_THRESHOLD) {
            continue;
        }
        if (discountPercentage === sale.discountPercentage) {
            // The sale is the same as before
            continue;
        }
        // Update game information
        await addSteamGame(sale.gameId, sale.creatorId);

        if (discountPercentage >= DISCOUNT_PERCENT_THRESHOLD) {
            // The sale is big enough to post about
            for (const channelId of BROADCAST_CHANNEL_IDS) {
                const channel = (await client.channels.fetch(channelId)) as TextChannel;
                channel?.send(
                    `**${discountPercentage}% OFF** - ${data.name} - https://store.steampowered.com/app/${sale.gameId}`,
                );
            }
        }
    }
};
