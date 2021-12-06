import React, { Component, createRef } from 'react';
import { css } from '@emotion/css';
import { L_BLACK, LL_BLACK } from '../shared/styles';
import { connect } from 'react-redux';
import _ from 'lodash';
import Timeline from './Timeline';
import {
    DURATION,
    TIME_SEGMENT,
    KEYFRAME_INTERVAL,
    VERTICAL_BAR_WIDTH
} from '../shared/constants';
import autobind from 'autobind-decorator';
import actions from '../actions';
import AudioTimeline from './AudioTimeline';
import { batchActions } from 'redux-batched-actions';
import { ctrlKey, delKey, undoRedoHistory, convertToFrame } from '../shared/funcs';
import { ipcRenderer } from 'electron';
import { List } from 'immutable';
import { LEDKeyframe, AntennaKeyframe, HeadKeyframe } from '../models';
import AntennaSettings from './AntennaSettings';
import HeadSettings from './HeadSettings';
import LEDSettings from './LEDSettings';
import os from 'os';
import keymaster from 'keymaster';
import SynchronizedScroll from './SynchronizedScroll';
import { Scrollbars } from 'react-custom-scrollbars-2';

@connect(({ timelinesSelection, leftPanelWidth }) => {
    const selectionRange = timelinesSelection.get('selectionRange');

    return {
        timelinesSelection,
        timelines: timelinesSelection.get('timelines'),
        keyframePath: selectionRange.keyframePath,
        selectionRange,
        leftPanelWidth
    };
})
export default class RightPanel extends Component {
    _$header = createRef();

    get $header() {
        const {
            _$header: { current }
        } = this;

        return current;
    }

    componentDidMount() {
        document.addEventListener('mousedown', this.unselectKeyframe);
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
        ipcRenderer.addListener('menu:undo', this.undoFromMenu);
        ipcRenderer.addListener('menu:redo', this.redoFromMenu);
        ipcRenderer.addListener('menu:cut', this.cutFromMenu);
        ipcRenderer.addListener('menu:copy', this.copyFromMenu);
        ipcRenderer.addListener('menu:paste', this.pasteFromMenu);

        if (os.platform() !== 'darwin') {
            keymaster('ctrl+x', this.cutFromMenu);
            keymaster('ctrl+c', this.copyFromMenu);
            keymaster('ctrl+v', this.pasteFromMenu);
        }
    }

    undoFromMenu = () => {
        const {
            props: { dispatch }
        } = this;
        const history = undoRedoHistory.undo();

        if (history) {
            dispatch(actions.replaceTimelines(history));
        }
    };

    redoFromMenu = () => {
        const {
            props: { dispatch }
        } = this;
        const history = undoRedoHistory.redo();

        if (history) {
            dispatch(actions.replaceTimelines(history));
        }
    };

    selectedTimelines = () => {
        const {
            props: { timelines, selectionRange }
        } = this;
        const sx = selectionRange.get('sx');
        const ex = selectionRange.get('ex');
        const sy = selectionRange.get('sy');
        const ey = selectionRange.get('ey');
        let ret = List();

        for (let i = sy; i < ey; i += 1) {
            const timeline = timelines.getIn(['timelines', i]);
            let a = List();

            for (let j = sx; j < ex; j += 1) {
                a = a.push(
                    timeline.hasIn(['keyframes', j])
                        ? timeline.getIn(['keyframes', j])
                        : null
                );
            }

            ret = ret.push(a);
        }

        return ret;
    };

    cutFromMenu = () => {
        const {
            props: { selectionRange, dispatch }
        } = this;
        const selected = this.selectedTimelines();

        dispatch(
            batchActions([
                actions.deleteTimelines({
                    sx: selectionRange.get('sx'),
                    sy: selectionRange.get('sy'),
                    selected
                }),
                actions.copyTimelines({
                    selected
                })
            ])
        );
    };

    copyFromMenu = () => {
        const {
            props: { dispatch }
        } = this;

        dispatch(
            actions.copyTimelines({
                selected: this.selectedTimelines()
            })
        );
    };

    pasteFromMenu = () => {
        const {
            props: { selectionRange, dispatch }
        } = this;

        dispatch(
            actions.pasteTimelines({
                sx: selectionRange.get('sx'),
                sy: selectionRange.get('sy'),
                selected: selectionRange.get('copyContent')
            })
        );
    };

    /**
     * @param {KeyboardEvent} e
     */
    onKeyDown = (e) => {
        const { keyCode, shiftKey, altKey } = e;
        const {
            props: { dispatch, selectionRange }
        } = this;
        const ret = [
            actions.updateKey({
                ctrl: ctrlKey(e),
                alt: altKey,
                shift: shiftKey
            }),
            actions.shiftSelection(shiftKey)
        ];

        if (delKey(e)) {
            ret.push(
                actions.deleteTimelines({
                    sx: selectionRange.get('sx'),
                    sy: selectionRange.get('sy'),
                    selected: this.selectedTimelines()
                })
            );
        }

        dispatch(batchActions(ret));
    };

    /**
     * @param {KeyboardEvent} e
     */
    onKeyUp = (e) => {
        const {
            props: { dispatch }
        } = this;
        const { shiftKey, altKey } = e;

        dispatch(
            batchActions([
                actions.updateKey({
                    ctrl: ctrlKey(e),
                    alt: altKey,
                    shift: shiftKey
                }),
                actions.shiftSelection(shiftKey)
            ])
        );
    };

    @autobind
    unselectKeyframe({ path }) {
        const {
            props: { dispatch }
        } = this;

        if (!_.some(path, ($e) => _.hasIn($e, 'dataset.notUnselect'))) {
            dispatch(actions.clearSelectionRange());
        }
    }

    dragstartColumns = ({ clientX }) => {
        const {
            props: {
                dispatch,
                timelines,
                selectionRange
            },
            $header
        } = this;
        const { left } = $header.getBoundingClientRect();
        const frame = convertToFrame(clientX - left - Timeline.MARGIN_LEFT);
        const size = timelines.get('timelines').size;

        if (selectionRange.get('useShift')) {
            dispatch(
                actions.endSelectionRange({
                    x: frame
                })
            );
        } else {
            dispatch(
                actions.startSelectionRange({
                    sx: frame,
                    sy: 0,
                    ey: size-1
                })
            );
            document.addEventListener('mousemove', this.draggingColumns);
            document.addEventListener('mouseup', this.dragendColumns);
        }
        dispatch(
            actions.selectionRangeSelected({
                timelines
            })
        );
    };

    draggingColumns = ({ clientX }) => {
        const {
            props: { dispatch, timelines },
            $header
        } = this;
        const { left } = $header.getBoundingClientRect();

        dispatch(
            batchActions([
                actions.endSelectionRange({
                    x: convertToFrame(clientX - left - Timeline.MARGIN_LEFT)
                }),
                actions.selectionRangeSelected({
                    timelines
                })
            ])
        );
    };

    dragendColumns = () => {
        document.removeEventListener('mousemove', this.draggingColumns);
        document.removeEventListener('mouseup', this.dragendColumns);
    };

    toggleKeyframeUsePosition = () => {
        const {
            props: { dispatch, keyframePath }
        } = this;

        dispatch(actions.toggleKeyframeUsePosition({ keyframePath }));
    };

    toggleKeyframeUseStartPoint = () => {
        const {
            props: { dispatch, keyframePath }
        } = this;

        dispatch(actions.toggleKeyframeUseStartPoint({ keyframePath }));
    };

    updateKeyframeStartPoint = (value, final=false) => {
        const {
            props: { dispatch, keyframePath }
        } = this;

        dispatch(
            actions.updateKeyframeStartPoint({
                keyframePath,
                value,
                notStackUndoRedoHistory: !final
            })
        );
    };

    updateKeyframePosition = ({ value }, final=false) => {
        const {
            props: { dispatch, keyframePath }
        } = this;

        dispatch(actions.updateKeyframePosition({ keyframePath, value, notStackUndoRedoHistory: !final }));
    };

    onChangeColor = ({ color }, final=false) => {
        const {
            props: { dispatch, keyframePath }
        } = this;

        dispatch(actions.changeKeyframeColor({ keyframePath, color, notStackUndoRedoHistory: !final }));
    };

    updateKeyframeFrequency = ({ value }, final=false) => {
        const {
            props: { dispatch, keyframePath }
        } = this;

        dispatch(actions.updateKeyframeFrequency({ keyframePath, value, notStackUndoRedoHistory: !final }));
    };

    updateKeyframeAmplitude = ({ value }, final=false) => {
        const {
            props: { dispatch, keyframePath }
        } = this;

        dispatch(actions.updateKeyframeAmplitude({ keyframePath, value, notStackUndoRedoHistory: !final }));
    };

    updateBezierPoint = ({ x, y, index }) => {
        const {
            props: { keyframePath, dispatch }
        } = this;

        dispatch(
            actions.updateBezierPoint({
                keyframePath,
                x,
                y,
                bezierIndex: index,
                notStackUndoRedoHistory: true
            })
        );
    };

    finishUpdatingBezierPoint = () => {
        const {
            props: { timelinesSelection }
        } = this;

        undoRedoHistory.add(timelinesSelection);
    };

    toggleKeyframeKeep = () => {
        const {
            props: { keyframePath, dispatch }
        } = this;

        dispatch(actions.toggleKeyframeKeep({ keyframePath }));
    };

    renderKeyframeSettings = () => {
        const {
            props: { keyframePath, timelines, selectionRange }
        } = this;
        let selectedKeyframe =
            keyframePath &&
            timelines.getIn([
                'timelines',
                keyframePath.get(0),
                'keyframes',
                keyframePath.get(1)
            ]);
        const ctor = _.get(selectedKeyframe, 'constructor');

        if (!ctor || selectionRange.get('grabx') > -1) {
            return null;
        }

        const previousKeyframe =
            timelines
            .getIn([
                'timelines',
                keyframePath.get(0),
                'keyframes'
            ])
            .findLast((kf,f) => {
                return f < keyframePath.get(1) && (!kf.keep || kf.startPoint);
            });

        return ctor === AntennaKeyframe ? (
            <AntennaSettings
                keyframe={selectedKeyframe}
                previousKeyframe={previousKeyframe}
                toggleUsePosition={this.toggleKeyframeUsePosition}
                updatePosition={this.updateKeyframePosition}
                updateFrequency={this.updateKeyframeFrequency}
                updateAmplitude={this.updateKeyframeAmplitude}
                toggleUseStartPoint={this.toggleKeyframeUseStartPoint}
                updateStartPoint={this.updateKeyframeStartPoint}
            />
        ) : ctor === LEDKeyframe ? (
            <LEDSettings
                keyframe={selectedKeyframe}
                previousKeyframe={previousKeyframe}
                updatePoint={this.updateBezierPoint}
                finishUpdatingPoint={this.finishUpdatingBezierPoint}
                onChangeColor={this.onChangeColor}
                toggleKeep={this.toggleKeyframeKeep}
                toggleUseStartPoint={this.toggleKeyframeUseStartPoint}
                updateStartPoint={this.updateKeyframeStartPoint}
            />
        ) : ctor === HeadKeyframe ? (
            <HeadSettings
                keyframe={selectedKeyframe}
                previousKeyframe={previousKeyframe}
                toggleKeep={this.toggleKeyframeKeep}
                updatePoint={this.updateBezierPoint}
                finishUpdatingPoint={this.finishUpdatingBezierPoint}
            />
        ) : null;
    };

    scrollbarRenderView({ style, ...props }) {
        return (
            <SynchronizedScroll
                index={-3}
                className={css([
                    {
                        width: '100%',
                        '::-webkit-scrollbar': {
                            display: 'none'
                        },
                        boxSizing: 'border-box'
                    },
                    style
                ])}
                {...props}
            />
        );
    }

    scrollbarRenderThumb({ style, ...props }) {
        return (
            <div
                className={css([
                    {
                        backgroundColor: `${LL_BLACK}`,
                        borderRadius: '4px',
                    },
                    style
                ])}
                {...props}/>
        );
    }

    scrollbarRenderTrack({ style, ...props }) {
        return (
            <div
                className={css([
                    {
                        position: 'absolute',
                        width: '100%',
                        height: '100%'
                    },
                ])}
                {...props}/>
        );
    }

    render() {
        const {
            props: { timelines, leftPanelWidth, selectionRange }
        } = this;
        const times = [];
        const timeWidth = 34;

        for (let i = 0; i <= DURATION; i += 1) {
            times.push(
                <div
                    key={`t-${i}`}
                    className={css({
                        position: 'absolute',
                        left:
                            Timeline.MARGIN_LEFT + KEYFRAME_INTERVAL * i * TIME_SEGMENT -
                            timeWidth / 2,
                        bottom: 0,
                        width: timeWidth,
                        textAlign: 'center',
                        userSelect: 'none'
                    })}
                >
                    {i.toFixed(1)}
                </div>
            );
        }

        return (
            <div
                className={css({
                    width: `calc(100% - ${leftPanelWidth +
                        VERTICAL_BAR_WIDTH}px)`,
                    position: 'relative'
                })}
            >
                <div
                    className={css({
                        display: 'flex',
                        backgroundColor: L_BLACK,
                        borderBottom: `1px solid ${LL_BLACK}`,
                        boxSizing: 'border-box',
                        height: 22,
                    })}
                >
                    <div
                        data-not-unselect
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            width: Timeline.NAME_WIDTH,
                            height: '100%',
                            padding: '3px 6px',
                            boxSizing: 'border-box',
                            borderRight: `1px solid ${LL_BLACK}`
                        })}
                    >
                        <div
                            className={css({
                                flexGrow: 1,
                                paddingLeft: 3,
                                fontSize: 14,
                                userSelect: 'none',
                            })}
                        >
                            {selectionRange.width>0 ?
                                parseInt(selectionRange.x)*1000/TIME_SEGMENT+"ms"
                                + (selectionRange.width>1 ? 
                                "~"+parseInt(selectionRange.x+selectionRange.width-1)*1000/TIME_SEGMENT+"ms"
                                : "")
                            : null}
                        </div>
                    </div>
                    <SynchronizedScroll
                        index={-1}
                        className={css({
                            overflowX: 'scroll',
                            width: `calc(100% - ${Timeline.NAME_WIDTH}px)`,
                            '::-webkit-scrollbar': {
                                display: 'none'
                            }
                        })}
                    >
                        <div
                            data-not-unselect
                            ref={this._$header}
                            onMouseDown={this.dragstartColumns}
                            className={css({
                                width: Timeline.MARGIN_ALL + Timeline.RIGHT_WIDTH + 1,
                                height: '100%',
                                position: 'relative',
                                paddingLeft: Timeline.MARGIN_LEFT,
                                paddingRight: Timeline.MARGIN_RIGHT,
                                paddingTop: 0,
                                paddingBottom: 0,
                                boxSizing: 'border-box'
                            })}
                        >
                            {times}
                        </div>
                    </SynchronizedScroll>
                </div>
                {timelines.get('timelines').map((props, i) => (
                    <Timeline
                        timeline={timelines.getIn(['timelines', i])}
                        index={i}
                        key={`tl-${i}`}
                    />
                ))}
                <AudioTimeline />
                <div
                    data-not-unselect
                    className={css({
                        display: 'flex',
                        height: '18px'
                    })}
                >
                    <div
                        className={css({
                            width: Timeline.NAME_WIDTH,
                            height: '100%',
                            boxSizing: 'border-box',
                            borderBottom: `1px solid ${L_BLACK}`,
                        })}
                    >
                    </div>
                    <div
                        className={css({
                            width: `calc(100% - ${Timeline.NAME_WIDTH}px)`,
                            height: '100%',
                            padding: `2px`,
                            boxSizing: 'border-box',
                            borderBottom: `1px solid ${L_BLACK}`,
                        })}
                    >
                        <Scrollbars
                            onScroll={this.handleScrollbar}
                            renderView={this.scrollbarRenderView}
                            renderThumbHorizontal={this.scrollbarRenderThumb}
                            renderTrackHorizontal={this.scrollbarRenderTrack}
                        >
                            <div
                                className={css({
                                    width: Timeline.MARGIN_ALL + Timeline.RIGHT_WIDTH + 1,
                                    height: '100%',
                                    position: 'relative',
                                })}
                            >
                            </div>
                        </Scrollbars>
                    </div>
                </div>
                {this.renderKeyframeSettings()}
            </div>
        );
    }
}
