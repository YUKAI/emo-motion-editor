import { Record, Map, List } from 'immutable';
import fs from 'fs-extra';
import { toArrayBuffer } from '../shared/funcs';
import {
    TIME_SEGMENT,
    AUDIO_TIMELINE_HEIGHT,
    KEYFRAME_INTERVAL,
    MAX_KEYFRAME_INDEX
} from '../shared/constants';
import { BASE_WHITE } from '../shared/styles';
import libpath from 'path';

const audioContext = new AudioContext();

export class Point extends Record({ x: 0, y: 0 }) {}

export class PointWithThetaAndRadius extends Record({ theta: 0, radius: 0 }) {
    position(rate = 1) {
        const { x, y } = this;

        return {
            x: x * rate,
            y: y * rate
        };
    }

    get x() {
        const { theta, radius } = this;

        return radius * Math.cos(theta);
    }

    get y() {
        const { theta, radius } = this;

        return radius * Math.sin(theta);
    }
}

export class BaseKeyframe extends Record({}) {}

export class Timeline extends Record({
    keyframes: Map(),
    link: false,
    primary: false,
    linkTo: null,
    KeyframeModel: BaseKeyframe,
    name: '',
    primaryName: ''
}) {}

export class LEDKeyframe extends Record({
    keep: false,
    r: 0,
    g: 0,
    b: 0,
    a: 1,
    bezierPoints: List([
        new Point({ x: 0, y: 1 }),
        new Point({ x: 1, y: 0 }),
        new Point({ x: 0, y: 1 }),
        new Point({ x: 1, y: 0 })
    ]),
    startPoint: null
}) {
    toColorString() {
        const { r, g, b } = this;

        return `rgb(${r}, ${g}, ${b})`;
    }

    toRGBAString() {
        const { r, g, b, a } = this;

        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    toRGBAStringStartPoint() {
        const { startPoint } = this;

        if (!startPoint) {
            return `rgba(0,0,0,0)`;
        }

        const r = startPoint.get('r');
        const g = startPoint.get('g');
        const b = startPoint.get('b');
        const a = startPoint.get('a');

        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    alphaToColorString() {
        let { a } = this;
        a = Math.round(a * 255);

        return `rgba(${a}, ${a}, ${a})`;
    }

    toColorObject() {
        const { r, g, b, a } = this;

        return { r, g, b, a };
    }

    toggleStartPoint() {
        const { startPoint } = this;

        return this.set(
            'startPoint',
            startPoint === null
                ? Map({
                      r: 0,
                      g: 0,
                      b: 0,
                      a: 1
                  })
                : null
        );
    }

    startPointToColorObject() {
        const { startPoint } = this;

        if (!startPoint) {
            return { r: 0, g: 0, b: 0, a: 0 };
        }

        return {
            r: startPoint.get('r'),
            g: startPoint.get('g'),
            b: startPoint.get('b'),
            a: startPoint.get('a')
        };
    }
}

export class AntennaKeyframe extends Record({
    position: 0,
    frequency: 0,
    amplitude: 0,
    usePosition: true,
    startPoint: null
}) {
    toggleStartPoint() {
        const { startPoint } = this;

        return this.set(
            'startPoint',
            startPoint === null
                ? Map({
                      position: 0,
                      frequency: 0,
                      amplitude: 0
                  })
                : null
        );
    }
}

export class HeadKeyframe extends Record({
    keep: false,
    x: 0,
    y: 0,
    bezierPoints: List([
        new Point({ x: 0, y: 1 }),
        new Point({ x: 1, y: 0 }),
        new Point({ x: 0, y: 1 }),
        new Point({ x: 1, y: 0 })
    ]),
    controlPoints: List([
        new PointWithThetaAndRadius(),
        new PointWithThetaAndRadius()
    ])
}) {}

export class Audio extends Record({
    name: '',
    duration: 0,
    delay: 0,
    src: '',
    background: '',
    timelineLeftWidth: 0
}) {
    async load(src) {
        const buffer = await audioContext.decodeAudioData(
            toArrayBuffer(await fs.readFile(src))
        );
        const { duration, sampleRate, length } = buffer;
        const seg = sampleRate / TIME_SEGMENT / KEYFRAME_INTERVAL;
        const data = buffer.getChannelData(0);
        const $canvas = document.createElement('canvas');
        const context = $canvas.getContext('2d');
        const timelineLeftWidth = duration * KEYFRAME_INTERVAL * TIME_SEGMENT;

        // Created visualizer canvas
        $canvas.width = timelineLeftWidth;
        $canvas.height = AUDIO_TIMELINE_HEIGHT;
        context.fillStyle = BASE_WHITE;
        context.beginPath();
        context.moveTo(0, AUDIO_TIMELINE_HEIGHT);

        for (let i = 0; i < length / seg; i += 1) {
            const s = Math.floor(i * seg);
            const t = Math.min(Math.floor((i + 1) * seg), length);
            let c = -Infinity;

            // Search peak
            for (let j = s; j < t; j += 1) {
                c = Math.max(c, Math.abs(data[j]));
            }

            context.lineTo(
                i,
                AUDIO_TIMELINE_HEIGHT - c * AUDIO_TIMELINE_HEIGHT
            );
        }

        context.lineTo(timelineLeftWidth, AUDIO_TIMELINE_HEIGHT);
        context.closePath();
        context.fill();

        src = decodeURIComponent(src);

        return {
            duration,
            background: `url("${$canvas.toDataURL('image/webp')}")`,
            timelineLeftWidth,
            src,
            name: libpath.basename(src)
        };
    }
}

export class SelectionRange extends Record({
    sx: -1,
    _sx: -1,
    ex: -1,
    _sy: -1,
    sy: -1,
    ey: -1,
    selected: null,
    copyContent: null,
    useShift: false,
    grabx: -1,
    grabMoveDiff: 0,
    grabMoveDir: 0
}) {
    get x() {
        const { sx } = this;

        return sx;
    }

    get width() {
        const { sx, ex } = this;

        return ex - sx;
    }

    get height() {
        const { sy, ey } = this;

        return ey - sy;
    }

    get keyframePath() {
        const { width, height, sx, sy } = this;

        return width === 1 && height === 1 ? List([sy, sx]) : null;
    }

    inY(y) {
        const { sy, ey } = this;

        return sy <= y && y < ey;
    }

    inX(x) {
        const { sx, ex } = this;

        return sx <= x && x < ex;
    }

    clear() {
        return this.merge({
            sx: -1,
            ex: -1,
            sy: -1,
            ey: -1,
            useShift: false,
            grabx: -1,
            selected: null,
            grabMoveDiff: 0,
            grabMoveDir: 0
        });
    }

    start({ sx, ex, sy, ey }) {
        if (ex === undefined) {
            ex = sx;
        }
        ex += 1;

        if (ey === undefined) {
            ey = sy;
        }
        ey += 1;

        return this.merge({
            sx,
            _sx: sx,
            ex,
            sy,
            _sy: sy,
            ey
        });
    }

    end({ x, y }) {
        const ret = {};
        const { _sx, _sy } = this;

        if (x !== undefined) {
            if (_sx < x) {
                ret.sx = _sx;
                ret.ex = x + 1;
            } else {
                ret.sx = x;
                ret.ex = _sx + 1;
            }
        }

        if (y !== undefined) {
            if (_sy < y) {
                ret.sy = _sy;
                ret.ey = y + 1;
            } else {
                ret.sy = y;
                ret.ey = _sy + 1;
            }
        }

        return this.merge(ret);
    }

    moveTo({ x, timelines }) {
        const ret = {};
        const { _sx, sx, ex, grabx, grabMoveDiff, selected } = this;

        if (x === grabx) {
            return this;
        }

        var diff = x - grabx;
        if (diff < 0) {
            ret.grabMoveDir = -1;
        }
        else if (diff > 0) {
            ret.grabMoveDir = 1;
        }
        else {
            ret.grabMoveDir = 0;
        }
        if (sx+diff < 0) {
            diff = 0 - sx;
        }
        if (ex+diff > MAX_KEYFRAME_INDEX+1) {
            diff = MAX_KEYFRAME_INDEX+1 - ex;
        }
        ret.grabx = grabx + diff;
        ret.sx = sx + diff;
        ret.ex = ex + diff;
        ret._sx = _sx + diff;
        ret.grabMoveDiff = grabMoveDiff + diff;

        if (selected && diff != 0 && ret.grabMoveDir != 0) {
            ret.selected = Map();
            selected.forEach((timeline, index) => {
                let currentSelected = ret.grabMoveDir > 0 ? timeline.sort().reverse() : timeline.sort();
                let newSelected = List();
                currentSelected.forEach((dframe, i) => {
                    let newFrame = i + ret.grabMoveDiff;
                    while (
                            newSelected.includes(newFrame) ||
                            (!selected.hasIn([index, newFrame]) && timelines.hasIn(['timelines', index, 'keyframes', newFrame]))
                    ) {
                        newFrame -= ret.grabMoveDir;
                    }
                    if (newFrame < 0 || newFrame > MAX_KEYFRAME_INDEX) {
                        newFrame = dframe;
                    }
                    newSelected = newSelected.push(newFrame);
                    ret.selected = ret.selected.setIn([index, i], newFrame);
                });
            });
        }

        return this.merge(ret);
    }

    grabStart({ grabx }) {
        return this.merge({
            grabx,
            grabMoveDiff: 0,
            grabMoveDir: 0
        });
    }

    grabEnd() {
        return this.merge({
            grabx: -1,
            grabMoveDiff: 0,
            grabMoveDir: 0
        });
    }

    moveSelected({ index, fromFrame, toFrame }) {
        const ret = {};
        let { selected } = this;

        if (selected.hasIn([index, fromFrame])) {
            selected = selected.deleteIn([index, fromFrame]).setIn([index, toFrame], toFrame);
            ret.selected = selected;
        }

        return this.merge(ret);
    }

    setSelected({ timelines }) {
        const ret = {};
        const { sx, ex, sy, ey } = this;

        ret.selected = null;
        let s = Map();
        for (let i = sy; i < ey; i += 1) {
            const timeline = timelines.getIn(['timelines', i]);
            let a = Map();
            for (let j = sx; j < ex; j += 1) {
                if (timeline.hasIn(['keyframes', j])) {
                    a = a.set(j, j);
                }
            }
            if (a.size > 0) {
                s = s.set(i, a);
            }
        }
        if (s.size > 0) {
            ret.selected = s;
        }

        return this.merge(ret);
    }

    addSelected({ index, frame }) {
        let s = Map();
        s = s.setIn([index, frame], frame);
        return this.merge({ selected: s });
    }
}
