import { resetDatabase } from './database';

resetDatabase().then(() => {
    console.log('Database setup complete');
    process.exit();
});
