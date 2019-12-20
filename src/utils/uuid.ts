export function uuid(): string {
    const s4 = (): string => {
        return Math.floor(Math.random() * 0x10000).toString(16);
    };
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
