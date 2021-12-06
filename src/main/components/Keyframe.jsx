import React, { Component } from 'react';
import { css } from '@emotion/css';
import { LEDKeyframe, AntennaKeyframe, HeadKeyframe } from '../models';
import Timeline from './Timeline';
import { BASE_WHITE, BASE_BLUE } from '../shared/styles';
import { KEYFRAME_INTERVAL } from '../shared/constants';
import { slashedBgImage, lerp, bzcube } from '../shared/funcs';
import { connect } from 'react-redux';

@connect(({ timelinesSelection }) => {
    return {
        rangeSelected: timelinesSelection.getIn(['selectionRange', 'selected'])
    };
})
export default class Keyframe extends Component {
    static WIDTH = KEYFRAME_INTERVAL;

    constructor(props) {
        super(props);
        const {
            props: { index, frame, selected, rangeSelected }
        } = this;
        this.state = {
            displayFrame: selected ? rangeSelected.getIn([index, frame]) : frame
        }
    }

    componentDidUpdate(prevProps) {
        const {
            props: { index, selected, frame, rangeSelected }
        } = this;

        let displayFrame = selected ? rangeSelected.getIn([index, frame]) : frame;
        if (displayFrame !== this.state.displayFrame) {
            this.setState({displayFrame})
        }
    }

    getPreviousFrame = () => {
        const {
            props: { timeline, index, frame, rangeSelected },
            state: { displayFrame }
        } = this;

        const prev_nselected_frame =
            timeline
            .get('keyframes')
            .filter((kf,f) => {
                return f !== frame
                    && f < displayFrame
                    && (rangeSelected ? !rangeSelected.hasIn([index, f]) : true);
            })
            .keySeq()
            .toList()
            .max();
        const prev_selected_dframe = rangeSelected && rangeSelected.has(index) ?
            rangeSelected
            .get(index)
            .filter((df,f) => {
                return f !== frame && df < displayFrame;
            })
            .valueSeq()
            .toList()
            .max()
            : undefined;

        let hasPrev = false;
        let prevDisplayFrame = 0;
        let prevKeyframe = undefined;
        if (prev_nselected_frame !== undefined && prev_selected_dframe !== undefined) {
            hasPrev = true;
            if (prev_nselected_frame > prev_selected_dframe) {
                prevDisplayFrame = prev_nselected_frame;
                prevKeyframe = timeline.getIn(['keyframes', prev_nselected_frame]);
            }
            else {
                prevDisplayFrame = prev_selected_dframe;
                prevKeyframe = timeline.getIn(['keyframes', rangeSelected.get(index).keyOf(prev_selected_dframe)]);
            }
        }
        else if (prev_nselected_frame !== undefined && prev_selected_dframe === undefined) {
            hasPrev = true;
            prevDisplayFrame = prev_nselected_frame;
            prevKeyframe = timeline.getIn(['keyframes', prev_nselected_frame]);
        }
        else if (prev_nselected_frame === undefined && prev_selected_dframe !== undefined) {
            hasPrev = true;
            prevDisplayFrame = prev_selected_dframe;
            prevKeyframe = timeline.getIn(['keyframes', rangeSelected.get(index).keyOf(prev_selected_dframe)]);
        }

        let hasPrevNotKeep = false;
        let prevNotKeepKeyframe = undefined;
        if (hasPrev && timeline.KeyframeModel === LEDKeyframe) {
            const prev_nkeep_nselected_frame =
                timeline
                .get('keyframes')
                .filter((kf,f) => {
                    return f !== frame
                        && f < displayFrame
                        && (rangeSelected ? !rangeSelected.hasIn([index, f]) : true)
                        && (!kf.keep || kf.startPoint);
                })
                .keySeq()
                .toList()
                .max();
            const prev_nkeep_selected_dframe = rangeSelected && rangeSelected.has(index) ?
                rangeSelected
                .get(index)
                .filter((df,f) => {
                    return f !== frame
                        && df < displayFrame
                        && (!timeline.getIn(['keyframes', f, 'keep']) || timeline.getIn(['keyframes', f, 'startPoint']));
                })
                .valueSeq()
                .toList()
                .max()
                : undefined;
            if (prev_nkeep_nselected_frame !== undefined && prev_nkeep_selected_dframe !== undefined) {
                hasPrevNotKeep = true;
                if (prev_nkeep_nselected_frame > prev_nkeep_selected_dframe) {
                    prevNotKeepKeyframe = timeline.getIn(['keyframes', prev_nkeep_nselected_frame]);
                }
                else {
                    prevNotKeepKeyframe = timeline.getIn(['keyframes', rangeSelected.get(index).keyOf(prev_nkeep_selected_dframe)]);
                }
            }
            else if (prev_nkeep_nselected_frame !== undefined && prev_nkeep_selected_dframe === undefined) {
                hasPrevNotKeep = true;
                prevNotKeepKeyframe = timeline.getIn(['keyframes', prev_nkeep_nselected_frame]);
            }
            else if (prev_nkeep_nselected_frame === undefined && prev_nkeep_selected_dframe !== undefined) {
                hasPrevNotKeep = true;
                prevNotKeepKeyframe = timeline.getIn(['keyframes', rangeSelected.get(index).keyOf(prev_nkeep_selected_dframe)]);
            }
        }

        return { hasPrev, prevKeyframe, prevDisplayFrame, hasPrevNotKeep, prevNotKeepKeyframe };
    };

    timelineDisplayRGBLed = () => {
        const {
            props: { keyframe },
            state: { displayFrame }
        } = this;

        const {
            prevDisplayFrame,
            prevNotKeepKeyframe
        } = this.getPreviousFrame();

        const width = (displayFrame - prevDisplayFrame) * KEYFRAME_INTERVAL - Math.floor(Keyframe.WIDTH/(prevDisplayFrame?1:2));
        const height = Timeline.HEIGHT;
        const left = prevDisplayFrame * KEYFRAME_INTERVAL + Timeline.MARGIN_LEFT + (prevDisplayFrame?Math.ceil(Keyframe.WIDTH/2):0);

        const start_color = keyframe.startPoint ?
                keyframe.startPointToColorObject()
            : prevNotKeepKeyframe ?
                prevNotKeepKeyframe.get('keep') ?
                    prevNotKeepKeyframe.startPointToColorObject()
                : prevNotKeepKeyframe.toColorObject()
            : {r:0,g:0,b:0,a:0};
        const end_color = keyframe.keep ? start_color : keyframe.toColorObject();

        const bg = () => {
            const $canvas = document.createElement('canvas');
            const context = $canvas.getContext('2d');

            const sc = [start_color.r,start_color.g,start_color.b,start_color.a];
            const ec = [end_color.r,end_color.g,end_color.b,end_color.a];

            const easeInOut = (p) => {
                const xh1 = keyframe.bezierPoints.get(2).x;
                const yh1 = 1.0-keyframe.bezierPoints.get(2).y;
                const xh2 = keyframe.bezierPoints.get(3).x;
                const yh2 = 1.0-keyframe.bezierPoints.get(3).y;
                let lower = 0.0;
                let upper = 1.0;
                let r = (upper + lower) / 2.0;
                let x = bzcube(r, 0, xh1, xh2, 1);
                let it = 0
                while (Math.abs(p-x) > 0.0001  &&  it < 1000) {
                    it++;
                    if (p > x) {
                        lower = r;
                    }
                    else {
                        upper = r;
                    }
                    r = (upper + lower) / 2;
                    x = bzcube(r, 0, xh1, xh2, 1);
                }
                return bzcube(r, 0, yh1, yh2, 1);
            }

            $canvas.width = width;
            $canvas.height = height;
            for (let i=0 ; i<width ; i++) {
                var cc = [0,0,0,0];
                for (let c=0 ; c<4 ; c++) {
                    let ai = easeInOut(i/width);
                    cc[c] = lerp(ai, 0, 1, sc[c], ec[c]);
                }
                context.fillStyle = `rgba(${cc[0]},${cc[1]},${cc[2]},${cc[3]})`;
                context.fillRect(i, 0, 1, height);
            }

            return $canvas.toDataURL();
        }

        return <div
            className={css({
                position: 'absolute',
                height: '100%',
                width,
                left,
                backgroundImage: `url(${bg()})`,
                zIndex: 30,
            })}
        />
    };
    timelineDisplayAntenna = () => {
        const {
            props: { keyframe },
            state: { displayFrame }
        } = this;

        const {
            prevKeyframe,
            prevDisplayFrame
        } = this.getPreviousFrame();

        const width = (displayFrame - prevDisplayFrame) * KEYFRAME_INTERVAL - Math.floor(Keyframe.WIDTH/(prevKeyframe?1:2));
        const height = Timeline.HEIGHT;
        const left = prevDisplayFrame * KEYFRAME_INTERVAL + Timeline.MARGIN_LEFT + (prevKeyframe?Math.ceil(Keyframe.WIDTH/2):0);

        const sp = keyframe.get('startPoint') ?
                keyframe.getIn(['startPoint', 'position'])
            : prevKeyframe && prevKeyframe.get('usePosition') && keyframe.get('usePosition') ?
                prevKeyframe.get('position')
            : 0;
        const sf = keyframe.get('startPoint') ?
                keyframe.getIn(['startPoint', 'frequency'])
            : prevKeyframe && !prevKeyframe.get('usePosition') && !keyframe.get('usePosition') ?
                prevKeyframe.get('frequency')
            : 0;
        const sa = keyframe.get('startPoint') ?
                keyframe.getIn(['startPoint', 'amplitude'])
            : prevKeyframe && !prevKeyframe.get('usePosition') && !keyframe.get('usePosition') ?
                prevKeyframe.get('amplitude')
            : 0;

        const bg = () => {
            const $canvas = document.createElement('canvas');
            const context = $canvas.getContext('2d');
        
            $canvas.width = width;
            $canvas.height = height;
            context.fillStyle = 'rgba(0,0,0,.8)';
            context.fillRect(0, 0, width, height);
            context.strokeStyle = BASE_WHITE;
            context.lineWidth = 1;
            if (keyframe.get('usePosition')) {
                context.beginPath();
                context.moveTo(0, (height/2)-sp*(height/2));
                context.lineTo(width, (height/2)-keyframe.get('position')*(height/2));
                context.closePath();
                context.stroke();
            }
            else {
                var x=0, y=height/2;
                context.beginPath();
                const w = sf>keyframe.get('frequency')?width*2:width;
                for (let i=0 ; i<w ; i++) {
                    const ca = lerp(i, 0, w, sa, keyframe.get('amplitude'));
                    const cf = lerp(i, 0, w, sf, keyframe.get('frequency'));
                    context.moveTo(x,y);
                    x = i;
                    y = (height/2) - ca*Math.sin(2*Math.PI*cf*(i/400)) * (height/2);
                    context.lineTo(x,y);
                }
                context.closePath();
                context.stroke();
            }

            return $canvas.toDataURL();
        }

        return <div
            className={css({
                position: 'absolute',
                height: '100%',
                width,
                left,
                backgroundImage: `url(${bg()})`,
                zIndex: 30,
            })}
        />
    };
    timelineDisplayHead = () => {
        const {
            state: { displayFrame }
        } = this;

        const {
            prevKeyframe,
            prevDisplayFrame
        } = this.getPreviousFrame();

        const width = (displayFrame - prevDisplayFrame) * KEYFRAME_INTERVAL - Math.floor(Keyframe.WIDTH/(prevKeyframe?1:2));
        const left = prevDisplayFrame * KEYFRAME_INTERVAL + Timeline.MARGIN_LEFT + (prevKeyframe?Math.ceil(Keyframe.WIDTH/2):0);

        return <div
            className={css({
                position: 'absolute',
                height: '100%',
                width,
                left,
                backgroundColor: 'rgba(0,0,0,.8)',
                zIndex: 30,
            })}
        />
    };
    getTimelineDisplay = () => {
        const {
            props: { timeline }
        } = this;

        if (timeline.KeyframeModel === LEDKeyframe) {
            return this.timelineDisplayRGBLed();
        }
        else if (timeline.KeyframeModel === AntennaKeyframe) {
            return this.timelineDisplayAntenna();
        }
        else if (timeline.KeyframeModel === HeadKeyframe) {
            return this.timelineDisplayHead();
        }
        return null;
    };

    getKeyframeDisplay = () => {
        const {
            props: { timeline, keyframe, selected },
            state: { displayFrame }
        } = this;

        let keep = false;
        if (timeline.KeyframeModel === LEDKeyframe  ||  timeline.KeyframeModel === HeadKeyframe) {
            keep = keyframe.get('keep');
        }

        let start = false;
        if (timeline.KeyframeModel === LEDKeyframe  ||  timeline.KeyframeModel === AntennaKeyframe) {
            start = keyframe.get('startPoint');
        }

        const bgc = selected?BASE_BLUE:'rgb(200, 200, 200)';
        const stc = selected?BASE_WHITE:'rgb(150, 150, 150)';
        const textStyleCommon = {
            color: 'black',
            backgroundColor: bgc,
            fontSize: 10,
            margin: 0,
        };

        return <div
            className={css({
                cursor: 'pointer',
                position: 'absolute',
                height: '100%',
                width: Keyframe.WIDTH,
                left: displayFrame * KEYFRAME_INTERVAL - Math.floor(Keyframe.WIDTH / 2) + Timeline.MARGIN_LEFT,
                backgroundImage: `url(${slashedBgImage(Timeline.HEIGHT, 4, 2, bgc, stc)})`,
                border: `1px solid ${bgc}`,
                boxSizing: 'border-box',
                zIndex: 50,
            })}
        >
            {keep || start ?
                <div
                    className={css({
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignContent: 'center',
                        userSelect: 'none',
                    })}
                >
                    {start ? <span className={css(textStyleCommon)}>S</span> : null}
                    <span className={css({ flexGrow: 1 })}></span>
                    {keep ? <span className={css(textStyleCommon)}>K</span> : null}
                </div>
            : null}
        </div>
    };

    render() {
        const {
            props: { keyframe },
        } = this;

        if (!keyframe) {
            return null;
        }

        return (
            <>
                {this.getTimelineDisplay()}
                {this.getKeyframeDisplay()}
            </>
        );
    }
}
