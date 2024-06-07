import util from 'util';

export function deepLog(obj: any) {
    console.log(util.inspect(obj, { depth: null, colors: true, sorted: true, compact: false }));
}
