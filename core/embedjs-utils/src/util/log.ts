import util from 'util';

export function deepLog(obj: unknown) {
    console.log(util.inspect(obj, { depth: null, colors: true, sorted: true, compact: false }));
}
