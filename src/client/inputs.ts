const keys: {[index: string]: boolean|undefined} = {};

window.addEventListener("keydown", (e)=>{
    if (!e.repeat) {
        const key = e.key.toLowerCase();
        keys[key] = true;
    }
});
window.addEventListener("keyup", (e)=>{
    delete keys[e.key.toLowerCase()];
});

export function getKeyDown(key: string): boolean {
    return keys[key.toLowerCase()] !== undefined;
}

export function getKeyPressed(key: string): boolean {
    return keys[key.toLowerCase()] === true;
}

export function reset() {
    for (const key in keys) {
        keys[key] = false;
    }
}