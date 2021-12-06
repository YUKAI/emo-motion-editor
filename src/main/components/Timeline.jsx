import React, { createRef } from 'react';
import { css } from '@emotion/css';
import { BASE_WHITE, LL_BLACK, A_BLUE, A_WHITE } from '../shared/styles';
import {
    immutableMapToArray,
    undoRedoHistory,
    convertToFrame,
    slashedBgImage
} from '../shared/funcs';
import { connect } from 'react-redux';
import autobind from 'autobind-decorator';
import actions from '../actions';
import {
    TIME_SEGMENT,
    KEYFRAME_INTERVAL,
    MAX_KEYFRAME_INDEX
} from '../shared/constants';
import Keyframe from './Keyframe';
import { HeadKeyframe, AntennaKeyframe, LEDKeyframe } from '../models';
import Component from './Component';
import _ from 'lodash';
import SynchronizedScroll from './SynchronizedScroll';
import {
    FaLink,
    FaUnlink
} from 'react-icons/fa';
import Color from 'color';
import { ipcRenderer } from 'electron';
import { batchActions } from 'redux-batched-actions';

@connect(({ timelinesSelection }) => {
    const selectionRange = timelinesSelection.get('selectionRange');

    return {
        timelinesSelection,
        timelines: timelinesSelection.get('timelines'),
        selectionRange,
        keyframePath: selectionRange.keyframePath
    };
})
export default class Timeline extends Component {
    static MARGIN_LEFT = 15;
    static MARGIN_RIGHT = 30;
    static MARGIN_ALL = Timeline.MARGIN_LEFT + Timeline.MARGIN_RIGHT;
    static NAME_WIDTH = 160;
    static RIGHT_WIDTH = MAX_KEYFRAME_INDEX * KEYFRAME_INTERVAL;
    static HEIGHT = 32;
    static elementPathToIndex = (path) => {
        let y = null;

        path = _.isArray(path) ? path : [path];

        for (const $e of path) {
            const index = _.get($e, 'dataset.index');

            if (index !== undefined) {
                y = parseInt(index);
            }
        }

        return y;
    };

    _checkedPropsForRender = ['timeline', 'selectionRange', 'keyframePath'];
    _$div = createRef();

    get $div() {
        const {
            _$div: { current }
        } = this;

        return current;
    }

    currentFrame(clientX) {
        const { $div } = this;
        const { left } = $div.getBoundingClientRect();

        return convertToFrame(clientX - left - Timeline.MARGIN_LEFT);
    }

    transparentCanvasBackground() {
        const $canvas = document.createElement('canvas');
        const context = $canvas.getContext('2d');
        const size = 16;

        $canvas.width = size;
        $canvas.height = size;
        context.fillStyle = 'rgb(100, 100, 100)';
        context.fillRect(0, 0, size/2, size/2);
        context.fillRect(size/2, size/2, size/2, size/2);
        context.fillStyle = 'rgb(50, 50, 50)';
        context.fillRect(0, size/2, size/2, size/2);
        context.fillRect(size/2, 0, size/2, size/2);

        return $canvas.toDataURL();
    }

    secondsTimeBarBackground() {
        const $canvas = document.createElement('canvas');
        const context = $canvas.getContext('2d');

        $canvas.width = TIME_SEGMENT * KEYFRAME_INTERVAL;
        $canvas.height = 1;
        context.fillStyle = 'rgba(150, 150, 150, 1)';
        context.fillRect(0, 0, 1, 1);

        return $canvas.toDataURL();
    }

    @autobind
    addKeyframe({ clientX }) {
        const {
            props: { dispatch, index, timeline }
        } = this;
        const frame = this.currentFrame(clientX);

        if (!timeline.hasIn(['keyframes', frame])) {
            const KeyframeModel = timeline.get('KeyframeModel');
            let args = null;

            if (KeyframeModel === HeadKeyframe) {
                let prev = null;

                timeline
                    .get('keyframes')
                    .keySeq()
                    .forEach((a) => {
                        if (a < frame) {
                            prev = a;
                        }
                    });

                if (prev) {
                    args = {
                        x: timeline.getIn(['keyframes', prev, 'x']),
                        y: timeline.getIn(['keyframes', prev, 'y'])
                    };
                }
            }

            dispatch(
                actions.addKeyframe({
                    index,
                    frame,
                    keyframe: new KeyframeModel(args)
                })
            );
        }
    }

    onMouseMove = ({ clientX }) => {
        const {
            props: { dispatch, timelines }
        } = this;
        const frame = this.currentFrame(clientX);

        dispatch(actions.moveSelectionRange({x: frame, timelines}));
    };

    onMouseUp = () => {
        const {
            props: { selectionRange, timelinesSelection, dispatch }
        } = this;

        const mv_kf_actions = [
            actions.moveSelectionRangeGrabEnd()
        ];

        if (selectionRange.get('selected')) {
            const diff = selectionRange.get('grabMoveDiff');
            if (diff !== 0) {
                const selected = selectionRange.get('selected');
                if (selected) {
                    selected.forEach((timeline, index) => {
                        timeline.forEach((dframe, i) => {
                            mv_kf_actions.push(
                                actions.moveKeyframe({
                                    index,
                                    fromFrame: i,
                                    toFrame: dframe,
                                    notStackUndoRedoHistory: true
                                })
                            );
                        });
                    });
                }
            }
        }

        dispatch(batchActions(mv_kf_actions));

        if (mv_kf_actions.length > 1) {
            undoRedoHistory.add(timelinesSelection);
        }

        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
    };

    @autobind
    async toggleLink(link) {
        const {
            props: { index, dispatch, timeline }
        } = this;
        const primary = timeline.get('primary');

        if (!primary) {
            return;
        }

        if (link) {
            var resp = await ipcRenderer.invoke('app-dialog-show-message-box', {
                type: 'question',
                buttons: ['OK', 'Cancel'],
                defaultId: 0,
                message: `${timeline.get('primaryName')} timelines will be linked.`,
                detail: `If OK, only keyframes in the ${timeline.get('name')} timeline will be kept.`
            });

            if (resp == 0) {
                dispatch(
                    actions.linkTimelines({
                        index,
                    })
                );
            }
        } else {
            dispatch(
                actions.unlinkTimelines({
                    index
                })
            );
        }
    }

    dragstartSelectionRange = ({ clientX }) => {
        const {
            props: { dispatch, index, timelines, selectionRange, keyframePath }
        } = this;
        const frame = this.currentFrame(clientX);

        if (selectionRange.get('useShift')) {
            dispatch(
                batchActions([
                    actions.endSelectionRange({
                        x: frame
                    }),
                    actions.selectionRangeSelected({
                        timelines
                    })
                ])
            );
        }
        else {
            if (selectionRange.get('grabx') > -1) {
                this.onMouseUp();
            }
            else {
                if (selectionRange.inY(index) && selectionRange.inX(frame)) {
                    dispatch(actions.moveSelectionRangeGrab({grabx: frame}));
                    document.addEventListener('mousemove', this.onMouseMove);
                    document.addEventListener('mouseup', this.onMouseUp);
                }
                else {
                    dispatch(
                        batchActions([
                            actions.startSelectionRange({
                                sx: frame,
                                sy: index
                            }),
                            actions.selectionRangeSelected({
                                timelines
                            })
                        ])
                    );
                    document.addEventListener(
                        'mousemove',
                        this.draggingSelectionRange
                    );
                    document.addEventListener(
                        'mouseup',
                        this.dragendSelectionRange
                    );
                }
            }
        }
    };

    draggingSelectionRange = ({ clientX }) => {
        const {
            props: { dispatch, timelines }
        } = this;

        dispatch(
            batchActions([
                actions.endSelectionRange({
                    x: this.currentFrame(clientX)
                }),
                actions.selectionRangeSelected({
                    timelines
                })
            ])
        );
    };

    dragendSelectionRange = () => {
        document.removeEventListener('mousemove', this.draggingSelectionRange);
        document.removeEventListener('mouseup', this.dragendSelectionRange);
    };

    dragstartRows = ({ currentTarget }) => {
        const {
            props: { index, dispatch, selectionRange, timelines }
        } = this;

        if (selectionRange.get('useShift')) {
            dispatch(
                actions.endSelectionRange({
                    y: Timeline.elementPathToIndex(currentTarget)
                })
            );
        } else {
            dispatch(
                actions.startSelectionRange({
                    sx: 0,
                    ex: MAX_KEYFRAME_INDEX,
                    sy: index
                })
            );

            document.addEventListener('mousemove', this.draggingRows);
            document.addEventListener('mouseup', this.dragendRows);
        }
        dispatch(
            actions.selectionRangeSelected({
                timelines
            })
        );
    };

    draggingRows = ({ path }) => {
        const {
            props: { dispatch, timelines }
        } = this;
        const y = Timeline.elementPathToIndex(path);

        if (y !== null) {
            dispatch(
                batchActions([
                    actions.endSelectionRange({
                        y
                    }),
                    actions.selectionRangeSelected({
                        timelines
                    })
                ])
            );
        }
    };

    dragendRows = () => {
        document.removeEventListener('mousemove', this.draggingRows);
        document.removeEventListener('mouseup', this.dragendRows);
    };

    renderIcon(type) {
        switch (type) {
            case HeadKeyframe:
                return null;
            case AntennaKeyframe:
                return null;
            case LEDKeyframe:
                return null;
        }
    }

    render() {
        const {
            props: { timeline, index, selectionRange, keyframePath }
        } = this;

        return (
            <div
                data-not-unselect
                className={css({
                    width: '100%',
                    height: Timeline.HEIGHT,
                    display: timeline.get('link') && !timeline.get('primary') ? 'none' : 'flex',
                    borderBottom: `2px solid ${LL_BLACK}`,
                    position: 'relative'
                })}
            >
                <div
                    data-index={index}
                    onMouseDown={this.dragstartRows}
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        width: Timeline.NAME_WIDTH,
                        padding: '3px 6px',
                        boxSizing: 'border-box',
                        borderRight: `2px solid ${LL_BLACK}`,
                        userSelect: 'none'
                    })}
                >
                    {this.renderIcon(timeline.get('KeyframeModel'))}
                    <div
                        className={css({
                            flexGrow: 1,
                            paddingLeft: 3
                        })}
                    >
                        {timeline.get('primary') && timeline.get('link') ?
                            timeline.get('primaryName')
                            :
                            timeline.get('name')
                        }
                    </div>
                    {timeline.get('primary') ? (
                        <div
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 3,
                                height: 16,
                                width: 16,
                                borderRadius: '5px',
                                ':hover': {
                                    backgroundColor: Color(BASE_WHITE).darken(0.6).toString(),
                                },
                                cursor: 'pointer',
                            })}
                            onClick={() => this.toggleLink(!timeline.get('link'))}
                            onMouseDown={(e) => { e.stopPropagation(); }}
                        >
                            {timeline.get('link') ?
                                <FaUnlink />
                                :
                                <FaLink />}
                        </div>
                    )
                    : timeline.get('linkTo') !== null ? (
                        <div
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 3,
                                height: 16,
                                width: 16,
                            })}
                        >
                            <span>&#9499;</span>
                        </div>
                    )        
                    : null}
                </div>
                <SynchronizedScroll
                    index={index}
                    className={css({
                        overflowX: 'scroll',
                        width: `calc(100% - ${Timeline.NAME_WIDTH}px)`,
                        '::-webkit-scrollbar': {
                            display: 'none'
                        }
                    })}
                >
                    <div
                        ref={this._$div}
                        onDoubleClick={this.addKeyframe}
                        onMouseDown={this.dragstartSelectionRange}
                        className={css({
                            width:
                                Timeline.MARGIN_ALL + Timeline.RIGHT_WIDTH + 1,
                            paddingLeft: Timeline.MARGIN_LEFT,
                            paddingRight: Timeline.MARGIN_RIGHT,
                            paddingTop: 0,
                            paddingBottom: 0,
                            height: '100%',
                            boxSizing: 'border-box',
                            position: 'relative'
                        })}
                    >
                        <div
                            className={css({
                                width: `calc(100% - ${Timeline.MARGIN_ALL}px)`,
                                height: '100%',
                                position: 'absolute',
                                backgroundImage: `url(${this.transparentCanvasBackground()})`,
                                zIndex: 10,
                            })}
                        />
                        <div
                            className={css({
                                width: `calc(100% - ${Timeline.MARGIN_ALL}px)`,
                                height: '100%',
                                position: 'absolute',
                                backgroundImage: `url(${this.secondsTimeBarBackground()})`,
                                zIndex: 35,
                            })}
                        />
                        {immutableMapToArray(
                            timeline.get('keyframes'),
                            (a, i) => (
                                <Keyframe
                                    timeline={timeline}
                                    index={index}
                                    keyframe={a}
                                    frame={i}
                                    key={i}
                                    selected={selectionRange.hasIn(['selected', index, i])}
                                />
                            )
                        )}
                        {selectionRange.inY(index) ? (
                            <div
                                className={css({
                                    position: 'absolute',
                                    left:
                                        Timeline.MARGIN_LEFT +
                                        selectionRange.x * KEYFRAME_INTERVAL -
                                        KEYFRAME_INTERVAL / 2,
                                    top: 0,
                                    width:
                                        selectionRange.width *
                                        KEYFRAME_INTERVAL,
                                    height: '100%',
                                    backgroundImage: `url(${slashedBgImage(Timeline.HEIGHT, 4, 2, A_WHITE, A_BLUE)})`,
                                    zIndex: 40,
                                })}
                            />
                        ) : null}
                    </div>
                </SynchronizedScroll>
            </div>
        );
    }
}
