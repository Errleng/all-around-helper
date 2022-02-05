import fs from 'fs';
import path from 'path';

export const getFileNamesNoExt: (dirPath: string) => string[] = (dirPath) => {
    return fs
        .readdirSync(dirPath)
        .filter((fileName) => fileName.endsWith('.ts'))
        .map((fileName) => path.parse(fileName).name);
};

export const importDefaults: <Type>(
    dirPath: string
) => Promise<Type[]> = async (dirPath) => {
    const fileNames = getFileNamesNoExt(`./src/${dirPath}`);
    const imports = [];
    for (const fileName of fileNames) {
        imports.push((await import(`${dirPath}/${fileName}`)).default);
    }
    return imports;
};
