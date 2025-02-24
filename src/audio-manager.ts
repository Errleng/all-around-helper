import {
    AudioPlayer,
    AudioPlayerStatus,
    AudioResource,
    createAudioPlayer,
    NoSubscriberBehavior,
    VoiceConnection,
    VoiceConnectionStatus,
} from "@discordjs/voice";
import { AudioInfo } from "./types";

let connection: VoiceConnection | null = null;
let disconnectTimer: NodeJS.Timer | null = null;
const playQueue: AudioInfo[] = [];

const player: AudioPlayer = createAudioPlayer({
    behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
    },
});

player.on("error", (e: any) => {
    console.error("Audio player encountered error:", e);
});

player.on(AudioPlayerStatus.Buffering, () => {
    console.debug("audio player is buffering");
});

player.on(AudioPlayerStatus.Paused, () => {
    console.debug("audio player is paused");
});

player.on(AudioPlayerStatus.AutoPaused, () => {
    console.debug("audio player is autopaused");
});

player.on(AudioPlayerStatus.Idle, () => {
    if (playQueue.length === 0) {
        console.debug("Found empty queue on idle");
        startDisconnectTimer();
        return;
    }
    const currentAudio = playQueue[0];
    if (!currentAudio.loop) {
        playQueue.shift();
        startDisconnectTimer();
    } else {
        currentAudio.resource = currentAudio.createResource();
    }
    player.stop();

    const newAudio = playQueue[0];
    if (playQueue.length > 0) {
        console.debug(`playing ${newAudio.name} in the queue of ${playQueue.length} audios`);
        player.play(newAudio.resource);
    } else {
        console.debug("audio player has nothing to play");
    }
});

export const startDisconnectTimer = () => {
    if (disconnectTimer !== null) {
        disconnectTimer.refresh();
        return;
    }
    disconnectTimer = setTimeout(
        () => {
            connection?.destroy();
            connection = null;
            console.debug("disconnecting after long period of idling");
        },
        1000 * 60 * 60,
    );
};

export const startConnection = (newConnection: VoiceConnection) => {
    if (connection !== null && connection !== newConnection) {
        console.debug("destroying existing connection", connection);
        connection.destroy();
    }

    connection = newConnection;
    connection.on(VoiceConnectionStatus.Ready, () => {
        connection!.subscribe(player);
    });
    connection.on(VoiceConnectionStatus.Disconnected, () => {
        player.stop();
    });
};

export const startPlaying = (name: string, createResource: () => AudioResource) => {
    playQueue.length = 0;
    const resource = createResource();
    playQueue.push({
        name,
        resource,
        loop: false,
        createResource,
    });
    player.play(resource);
};

export const enqueueAudio = (name: string, createResource: () => AudioResource) => {
    const resource = createResource();
    playQueue.push({
        name,
        resource,
        loop: false,
        createResource,
    });
};

export const stopPlaying = () => {
    playQueue.length = 0;
    player.stop();
};

export const getQueue = () => {
    return playQueue;
};

export const playQueued = () => {
    player.stop();
    if (playQueue.length == 0) {
        console.warn("Queue is empty");
        return;
    }
    player.play(playQueue[0].resource);
};
