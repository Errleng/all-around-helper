import { ClientEvent } from '../types';
// When the client is ready, run this code (only once)
const event: ClientEvent = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Logged in as ${client.user.tag}`);
    },
};

export default event;
