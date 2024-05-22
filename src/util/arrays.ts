export function mapAsync<T, U>(
    array: T[],
    callbackfn: (value: T, index: number, array: T[]) => Promise<U>,
): Promise<U[]> {
    return Promise.all(array.map(callbackfn));
}

export async function filterAsync<T>(
    array: T[],
    callbackfn: (value: T, index: number, array: T[]) => Promise<boolean>,
): Promise<T[]> {
    const filterMap = await mapAsync(array, callbackfn);
    return array.filter((_value, index) => filterMap[index]);
}

export function createArrayChunks<T>(arr: T[], size: number) {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_v, i) => arr.slice(i * size, i * size + size));
}

export function getUnique<T extends {}>(array: Array<T>, K: string) {
    var seen = {};
    return array.filter(function (item) {
        return seen.hasOwnProperty(item[K]()) ? false : (seen[item[K]()] = true);
    });
}
