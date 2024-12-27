import { Message } from '@llm-tools/embedjs-interfaces';

export function truncateCenterString(fullStr: string, strLen: number, separator?: string) {
    if (fullStr.length <= strLen) return fullStr;

    separator = separator || '...';

    const sepLen = separator.length,
        charsToShow = strLen - sepLen,
        frontChars = Math.ceil(charsToShow / 2),
        backChars = Math.floor(charsToShow / 2);

    return fullStr.substr(0, frontChars) + separator + fullStr.substr(fullStr.length - backChars);
}

export function cleanString(text: string) {
    text = text.replace(/\\/g, '');
    text = text.replace(/#/g, ' ');
    text = text.replace(/\. \./g, '.');
    text = text.replace(/\s\s+/g, ' ');
    text = text.replace(/(\r\n|\n|\r)/gm, ' ');

    return text.trim();
}

export function stringFormat(template: string, ...args: string[]) {
    return template.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number] != 'undefined' ? args[number] : match;
    });
}

export function historyToString(history: Message[]) {
    return history.reduce((p: string, c: Message) => {
        return p.concat(`${c.actor}: ${c.content}`);
    }, '');
}

export function toTitleCase(str: string) {
    return str.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

export function isValidURL(candidateUrl: string) {
    try {
        const url = new URL(candidateUrl);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

export function isValidJson(str: string) {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}
