import _ from 'lodash';
import os from 'os';
import fs from 'fs-extra';
import { KEYFRAME_INTERVAL, MAX_KEYFRAME_INDEX } from './constants';
import { EventEmitter } from 'events';
import ElectronStore from 'electron-store';


/**
 * @param {} bezierPoints
 * @param {number?} seg
 * @returns {}
 */
export const bezierCurvePoints = (ps, seg = 20) => {
    const ret = [];

    for (let i = 0; i <= seg; i += 1) {
        const t = i / seg;

        ret.push([
            (1 - t) ** 3 * ps.getIn([0, 'x']) +
                3 * (1 - t) ** 2 * t * ps.getIn([2, 'x']) +
                3 * (1 - t) * t ** 2 * ps.getIn([3, 'x']) +
                t ** 3 * ps.getIn([1, 'x']),
            (1 - t) ** 3 * ps.getIn([0, 'y']) +
                3 * (1 - t) ** 2 * t * ps.getIn([2, 'y']) +
                3 * (1 - t) * t ** 2 * ps.getIn([3, 'y']) +
                t ** 3 * ps.getIn([1, 'y'])
        ]);
    }

    return ret;
};

export const immutableMapToArray = (immutableMap, func) => {
    const ret = [];

    immutableMap.forEach((...args) => {
        ret.push(func(...args));
    });

    return ret;
};

export const ctrlKey = ({ ctrlKey, metaKey }) => {
    return (os.platform() === 'darwin' && metaKey) || ctrlKey;
};

export const delKey = ({ keyCode }) => {
    return (os.platform() === 'darwin' && keyCode === 8) || keyCode === 46;
};

class UndoRedoHistory extends EventEmitter {
    _index = 0;
    _history = [];
    _savePoint = 0;
    needSave = false;
    canUndo = false;
    canRedo = false;

    undo = () => {
        if (this._index === 1) {
            return null;
        }

        this._index -= 1;

        if (this._index === this._savePoint) {
            this.needSave = false;
        }
        else {
            this.needSave = true;
        }

        this.canRedo = true;
        if (this._index === 1) {
            this.canUndo = false;
        }

        this.emit("undo-redo-history-change");
        return this._history[this._index - 1];
    };

    redo = () => {
        if (this._index === this._history.length) {
            return null;
        }

        this._index += 1;

        if (this._index === this._savePoint) {
            this.needSave = false;
        }
        else {
            this.needSave = true;
        }

        this.canUndo = true;
        if (this._index === this._history.length) {
            this.canRedo = false;
        }

        this.emit("undo-redo-history-change");
        return this._history[this._index - 1];
    };

    add = (arg) => {
        this._history = _.slice(this._history, 0, this._index);
        this._history[this._index] = arg;
        if (this._index > 0) {
            this.needSave = true;
            this.canUndo = true;
            this.canRedo = false;
        }
        else {
            this._savePoint = 1;
        }
        this._index += 1;

        this.emit("undo-redo-history-change");
    };

    setSavePoint = () => {
        this._savePoint = this._index;
        this.needSave = false;
        this.emit("undo-redo-history-change");
    }

    reset = () => {
        this._index = 0;
        this._history = [];
        this._savePoint = 0;
        this.needSave = false;
        this.canUndo = false;
        this.canRedo = false;
        this.emit("undo-redo-history-change");
    }
}

export const undoRedoHistory = new UndoRedoHistory();

export const convertToFrame = (n) => {
    return Math.min(
        MAX_KEYFRAME_INDEX,
        Math.max(0, Math.round(n / KEYFRAME_INTERVAL))
    );
};

export const settings = new (class Settings {
    constructor() {
        this._store = null;
        this._dummy_store = null;
        this._store_defaults = {
            api: {
                refresh_token: "00000000-0000-0000-0000-000000000000",
                access_token: ""
            },
            room_id: "00000000-0000-0000-0000-000000000000"
        }
    }

    load() {
        if (this._store === null) {
            const store_schema = {
                api: {
                    type: 'object',
                    properties: {
                        refresh_token: {
                            type: 'string',
                            format: 'uuid'
                        },
                        access_token: {
                            type: 'string'
                        }
                    }
                },
                room_id: {
                    type: 'string',
                    format: 'uuid'
                }
            };
            try {
                this._store = new ElectronStore({
                    name: 'settings',
                    clearInvalidConfig: true,
                    schema: store_schema,
                    defaults: this._store_defaults
                });
                this._dummy_store = null;
            }
            catch (err) {
                this._store = null;
                this._dummy_store = new Object();
                Object.assign(this._dummy_store, this._store_defaults);
                throw err;
            }
        }
    }

    isDefault(obj) {
        if (this._store !== null) {
            if (this._store.get(obj) !== _.get(this._store_defaults, obj)) {
                return false;
            }
        }
        else if (this._dummy_store !== null) {
            if (_.get(this._dummy_store, obj) !== _.get(this._store_defaults, obj)) {
                return false;
            }
        }
        return true;
    }

    clear() {
        if (this._store !== null) {
            this._store.clear();
        }
        else if (this._dummy_store !== null) {
            Object.assign(this._dummy_store, this._store_defaults);
        }
    }

    get(obj) {
        if (this._store !== null) {
            return this._store.get(obj);
        }
        else if (this._dummy_store !== null) {
            return _.get(this._dummy_store, obj);
        }
        return null;
    }

    set(obj, val) {
        if (this._store !== null) {
            this._store.set(obj, val);
        }
        else if (this._dummy_store !== null) {
            _.set(this._dummy_store, obj, val);
        }
    }
})();

/**
 * @param {Buffer} buffer
 */
export const toArrayBuffer = (buffer) => {
    const { length } = buffer;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new Uint8Array(arrayBuffer);

    for (var i = 0; i < length; i += 1) {
        view[i] = buffer[i];
    }

    return arrayBuffer;
};

export const dist = (ax, ay, bx, by) => {
    return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
};

export const slashedBgImage = (size, space, ln, bgc, stc) => {
    const $canvas = document.createElement('canvas');
    const context = $canvas.getContext('2d');

    $canvas.width = size;
    $canvas.height = size;
    context.fillStyle = bgc?bgc:'rgb(255,255,255)';
    context.strokeStyle = stc?stc:'rgb(0,0,0)';
    context.lineWidth = ln?ln:1;
    context.fillRect(0, 0, size, size);
    context.beginPath();
    for (let i=0 ; i<=size*2 ; i+=space) {
        context.moveTo(0, i);
        context.lineTo(i, 0);
    }
    context.closePath();
    context.stroke();

    return $canvas.toDataURL();
}

export const lerp = (t, t0, t1, p_0, p_1) => {
    return ( (p_0*(t1-t) + p_1*(t-t0)) / (t1-t0) );
}

export const bzcube = (t, p_0, p_1, p_2, p_3) => {
    return ( Math.pow(1-t,3)*p_0 + 3*Math.pow(1-t,2)*t*p_1 + 3*(1-t)*Math.pow(t,2)*p_2 + Math.pow(t,3)*p_3 );
}