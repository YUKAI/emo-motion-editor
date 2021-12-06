import React, { Component, createRef, cloneElement } from 'react';
import { css } from '@emotion/css';
import { L_BLACK, BASE_WHITE, D_WHITE, BASE_BLUE } from '../shared/styles';
import { connect } from 'react-redux';
import {
    immutableMapToArray,
    bezierCurvePoints,
    undoRedoHistory,
    dist
} from '../shared/funcs';
import autobind from 'autobind-decorator';
import actions from '../actions';
import { Point } from '../models';
import { List } from 'immutable';
import {
    HEAD_KEYFRAME_MAX_X_POSITION,
    HEAD_KEYFRAME_MAX_Y_POSITION,
    HEAD_CONTROL_POINT_MAX_X_POSITION,
    HEAD_CONTROL_POINT_MAX_Y_POSITION,
    HEAD_CANVAS_KEYFRAME_RADIUS
} from '../shared/constants';
import _ from 'lodash';
import Keyframe from './HeadCanvasKeyframe';
import { batchActions } from 'redux-batched-actions';

const MARGIN = 7;

@connect(
    ({
        timelinesSelection,
        headCanvasSelector,
        leftPanelWidth,
        keymaster
    }) => {
        const keyframePath = timelinesSelection.get('selectionRange').keyframePath;

        return {
            timelinesSelection,
            timelines: timelinesSelection.get('timelines'),
            selectedKeyframeInTimeline:
                keyframePath && keyframePath.get(0) === 0 && !(timelinesSelection.getIn(['selectionRange','grabx']) > -1)
                    ? keyframePath.get(1)
                    : null,
            selectedKeyframe: headCanvasSelector.get('keyframe'),
            selectedControlPoint: headCanvasSelector.get('controlPoint'),
            leftPanelWidth,
            keymaster
        };
    }
)
export default class HeadCanvas extends Component {
    static getDerivedStateFromProps = ({ leftPanelWidth }) => {
        const headCanvasRate =
            (leftPanelWidth - MARGIN * 2 - 1) /
            2 /
            HEAD_CONTROL_POINT_MAX_X_POSITION;
        const keyframeCanvasWidth =
            HEAD_KEYFRAME_MAX_X_POSITION * headCanvasRate * 2 + 1;
        const keyframeCanvasHeight =
            HEAD_KEYFRAME_MAX_Y_POSITION * headCanvasRate * 2 + 1;
        const canvasWidth =
            HEAD_CONTROL_POINT_MAX_X_POSITION * headCanvasRate * 2 + 1;
        const canvasHeight =
            HEAD_CONTROL_POINT_MAX_Y_POSITION * headCanvasRate * 2 + 1;
        const deltaX = canvasWidth / 2 + MARGIN - 1 / 2;
        const deltaY = canvasHeight / 2 + MARGIN + 1 / 2;

        return {
            headCanvasRate,
            keyframeCanvasWidth,
            keyframeCanvasHeight,
            canvasWidth,
            canvasHeight,
            deltaX,
            deltaY
        };
    };

    _$svg = createRef();
    state = {
        headCanvasRate: 0,
        keyframeCanvasWidth: 0,
        keyframeCanvasHeight: 0,
        canvasWidth: 0,
        canvasHeight: 0,
        deltaX: 0,
        deltaY: 0
    };

    get headKeyframes() {
        const {
            props: { timelines }
        } = this;

        return timelines.getIn(['timelines', 0, 'keyframes']);
    }

    get $svg() {
        const {
            _$svg: { current }
        } = this;

        return current;
    }

    normalizeX = (x, max = HEAD_KEYFRAME_MAX_X_POSITION) => {
        const {
            state: { headCanvasRate, deltaX }
        } = this;

        return Math.min(max, Math.max(-max, (x - deltaX) / headCanvasRate));
    };

    normalizeY = (y, max = HEAD_KEYFRAME_MAX_Y_POSITION) => {
        const {
            state: { headCanvasRate, deltaY }
        } = this;

        return -Math.min(max, Math.max(-max, (y - deltaY) / headCanvasRate));
    };

    @autobind
    selectKeyframe({ index }) {
        const {
            props: { dispatch }
        } = this;

        dispatch(actions.selectKeyframeInHeadCanvas({ index }));
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
    }

    @autobind
    selectControlPoint({ path }) {
        const {
            props: { dispatch }
        } = this;

        dispatch(actions.selectControlPointInHeadCanvas({ path }));
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
    }

    @autobind
    onMouseMove({ clientX, clientY }) {
        const {
            props: {
                dispatch,
                selectedKeyframe,
                selectedControlPoint,
                timelines,
                keymaster
            },
            $svg
        } = this;
        const snapUnit = keymaster.get('shift') ? 1 : 5;

        if (selectedKeyframe) {
            const { left, top } = $svg.getBoundingClientRect();
            const x =
                Math.round(this.normalizeX(clientX - left) / snapUnit) *
                snapUnit;
            const y =
                Math.round(this.normalizeY(clientY - top) / snapUnit) *
                snapUnit;

            dispatch(
                actions.updateKeyframeInHeadCanvas({
                    index: selectedKeyframe,
                    x,
                    y,
                    notStackUndoRedoHistory: true
                })
            );
        } else if (selectedControlPoint) {
            const keyframe = timelines.getIn([
                'timelines',
                0,
                'keyframes',
                selectedControlPoint.get(0)
            ]);
            const { left, top } = $svg.getBoundingClientRect();
            const dx =
                Math.round(
                    this.normalizeX(
                        clientX - left,
                        HEAD_CONTROL_POINT_MAX_X_POSITION
                    ) / snapUnit
                ) *
                    snapUnit -
                keyframe.get('x');
            const dy =
                Math.round(
                    this.normalizeY(
                        clientY - top,
                        HEAD_CONTROL_POINT_MAX_Y_POSITION
                    ) / snapUnit
                ) *
                    snapUnit -
                keyframe.get('y');

            dispatch(
                actions.updateControlPointInHeadCanvas({
                    path: selectedControlPoint,
                    radius: Math.sqrt(dx ** 2 + dy ** 2),
                    theta: Math.atan2(dy, dx),
                    notStackUndoRedoHistory: true
                })
            );
        }
    }

    @autobind
    onMouseUp() {
        const {
            props: {
                dispatch,
                selectedKeyframe,
                selectedControlPoint,
                timelinesSelection
            }
        } = this;

        if (selectedKeyframe) {
            dispatch(actions.unselectKeyframeInHeadCanvas());
        } else if (selectedControlPoint) {
            dispatch(actions.unselectControlPointInHeadCanvas());
        }

        undoRedoHistory.add(timelinesSelection);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
    }

    selectKeyframeInTimeline = ({ clientX, clientY }) => {
        const {
            $svg,
            headKeyframes,
            state: { headCanvasRate },
            props: { dispatch, timelines }
        } = this;
        const { left, top } = $svg.getBoundingClientRect();
        const clickX = this.normalizeX(
            clientX - left,
            HEAD_CONTROL_POINT_MAX_X_POSITION
        );
        const clickY = this.normalizeY(
            clientY - top,
            HEAD_CONTROL_POINT_MAX_Y_POSITION
        );
        const keyframeIndex = headKeyframes.findKey((a) => {
            const x = a.get('x');
            const y = a.get('y');

            if (
                dist(x, y, clickX, clickY) * headCanvasRate <=
                HEAD_CANVAS_KEYFRAME_RADIUS
            ) {
                return true;
            }

            return a
                .get('controlPoints')
                .some(
                    ({ x: dx, y: dy }) =>
                        dist(x + dx, y + dy, clickX, clickY) * headCanvasRate <=
                        HEAD_CANVAS_KEYFRAME_RADIUS
                );
        });

        if (_.isNumber(keyframeIndex)) {
            dispatch(
                batchActions([
                    actions.startSelectionRange({
                        sx: keyframeIndex,
                        sy: 0
                    }),
                    actions.selectionRangeSelected({
                        timelines
                    })
                ])
            );
        }
    };

    selectedIndexes() {
        const {
            props: { timelines, selectedKeyframeInTimeline }
        } = this;

        if (selectedKeyframeInTimeline === null) {
            return [];
        }

        const keys = timelines
            .getIn(['timelines', 0, 'keyframes'])
            .filter((keyframe) => {
                return !keyframe.get('keep');
            })
            .keySeq()
            .toArray();

        const index = _.indexOf(keys, selectedKeyframeInTimeline);

        if (index === 0) {
            return [null, keys[0]];
        }

        return _.slice(keys, index - 1, index + 1);
    }

    renderGrid() {
        const {
            state: {
                canvasWidth,
                canvasHeight,
                keyframeCanvasWidth,
                keyframeCanvasHeight,
                headCanvasRate
            }
        } = this;
        const grid = [];
        const dx = MARGIN + (canvasWidth - keyframeCanvasWidth) / 2;
        const dy = MARGIN + (canvasHeight - keyframeCanvasHeight) / 2;
        const halfWidth = Math.floor(keyframeCanvasWidth / 2);
        const halfHeight = Math.floor(keyframeCanvasHeight / 2);

        for (let i = 1; i < 9; i += 1) {
            const x = 5 * headCanvasRate * i + dx;

            grid.push(
                <rect
                    x={x}
                    y={dy}
                    width={1}
                    height={keyframeCanvasHeight}
                    fill={D_WHITE}
                    key={`grid-l-x-${i}`}
                />,
                <rect
                    x={x + halfWidth}
                    y={dy}
                    width={1}
                    height={keyframeCanvasHeight}
                    fill={D_WHITE}
                    key={`grid-r-x-${i}`}
                />
            );
        }

        for (let i = 1; i < 4; i += 1) {
            const y = 5 * headCanvasRate * i + dy;

            grid.push(
                <rect
                    x={dx}
                    y={y}
                    width={keyframeCanvasWidth}
                    height={1}
                    fill={D_WHITE}
                    key={`grid-u-y-${i}`}
                />,
                <rect
                    x={dx}
                    y={y + halfHeight}
                    width={keyframeCanvasWidth}
                    height={1}
                    fill={D_WHITE}
                    key={`grid-b-y-${i}`}
                />
            );
        }

        return (
            <>
                <rect
                    x={dx}
                    y={dy}
                    width={keyframeCanvasWidth}
                    height={1}
                    fill={BASE_WHITE}
                />
                <rect
                    x={dx}
                    y={dy}
                    width={1}
                    height={keyframeCanvasHeight}
                    fill={BASE_WHITE}
                />
                {grid}
                <rect
                    x={dx + halfWidth}
                    y={dy}
                    width={1}
                    height={keyframeCanvasHeight}
                    fill={BASE_WHITE}
                />
                <rect
                    x={dx}
                    y={dy + halfHeight}
                    width={keyframeCanvasWidth}
                    height={1}
                    fill={BASE_WHITE}
                />
                <rect
                    x={dx + keyframeCanvasWidth - 1}
                    y={dy}
                    width={1}
                    height={keyframeCanvasHeight}
                    fill={BASE_WHITE}
                />
                <rect
                    x={dx}
                    y={dy + keyframeCanvasHeight - 1}
                    width={keyframeCanvasWidth}
                    height={1}
                    fill={BASE_WHITE}
                />
            </>
        );
    }

    renderPosition() {
        const {
            props: { selectedKeyframeInTimeline, selectedControlPoint },
            headKeyframes
        } = this;
        let position = null;

        if (selectedControlPoint) {
            const keyframe = headKeyframes.get(selectedControlPoint.get(0));

            const { x, y } = keyframe.getIn([
                'controlPoints',
                selectedControlPoint.get(1)
            ]);

            position = [keyframe.get('x') + x, keyframe.get('y') + y];
        } else if (
            selectedKeyframeInTimeline &&
            headKeyframes.has(selectedKeyframeInTimeline)
        ) {
            const selected = headKeyframes.get(selectedKeyframeInTimeline);

            position = [selected.get('x'), selected.get('y')];
        }

        return (
            <div
                className={css({
                    userSelect: 'none'
                })}
            >
                {position
                    ? `(${_.join(
                          _.map(position, (a) => a.toFixed(2)),
                          ', '
                      )})`
                    : ''}
            </div>
        );
    }

    renderKeyframes() {
        const {
            props: { selectedKeyframeInTimeline },
            state: { headCanvasRate, deltaX, deltaY },
            headKeyframes
        } = this;
        const bezierCurves = [];
        const selectedIndexes = this.selectedIndexes();
        let prevIndex = null;

        const keyframes = immutableMapToArray(headKeyframes, (a, i) => {
            if (a.get('keep')) {
                return null;
            }

            if (prevIndex === null) {
                const x = a.get('x') * headCanvasRate + deltaX;
                const y = a.get('y') * headCanvasRate + deltaY;
                const { x: dx, y: dy } = a
                    .getIn(['controlPoints', 0])
                    .position(headCanvasRate);

                bezierCurves.push(
                    <polyline
                        key='origin'
                        fill='none'
                        strokeDasharray='3'
                        stroke={
                            i === selectedKeyframeInTimeline
                                ? BASE_BLUE
                                : BASE_WHITE
                        }
                        strokeWidth={3}
                        points={bezierCurvePoints(
                            List([
                                new Point({
                                    x: deltaX,
                                    y: deltaY
                                }),
                                new Point({
                                    x,
                                    y
                                }),
                                new Point({
                                    x: deltaX,
                                    y: deltaY
                                }),
                                new Point({
                                    x: x + dx,
                                    y: y + dy
                                })
                            ])
                        )}
                    />
                );
            } else {
                const ax =
                    headKeyframes.getIn([prevIndex, 'x']) * headCanvasRate +
                    deltaX;
                const ay =
                    headKeyframes.getIn([prevIndex, 'y']) * headCanvasRate +
                    deltaY;
                const bx = a.get('x') * headCanvasRate + deltaX;
                const by = a.get('y') * headCanvasRate + deltaY;
                const { x: dax, y: day } = headKeyframes
                    .getIn([prevIndex, 'controlPoints', 1])
                    .position(headCanvasRate);
                const { x: dbx, y: dby } = a
                    .getIn(['controlPoints', 0])
                    .position(headCanvasRate);

                bezierCurves.push(
                    <polyline
                        key={`hb-${i}`}
                        fill='none'
                        stroke={
                            i === selectedKeyframeInTimeline
                                ? BASE_BLUE
                                : BASE_WHITE
                        }
                        strokeWidth={3}
                        points={bezierCurvePoints(
                            List([
                                new Point({
                                    x: ax,
                                    y: ay
                                }),
                                new Point({
                                    x: bx,
                                    y: by
                                }),
                                new Point({
                                    x: ax + dax,
                                    y: ay + day
                                }),
                                new Point({
                                    x: bx + dbx,
                                    y: by + dby
                                })
                            ])
                        )}
                    />
                );
            }

            prevIndex = i;

            return (
                <Keyframe
                    keyframe={a}
                    index={i}
                    selectedIndexes={selectedIndexes}
                    key={`hk-${i}`}
                    selectKeyframe={this.selectKeyframe}
                    selectControlPoint={this.selectControlPoint}
                    rate={headCanvasRate}
                    dx={deltaX}
                    dy={deltaY}
                />
            );
        });

        return (
            <>
                {bezierCurves}
                <circle
                    cx={deltaX}
                    cy={deltaY}
                    r={HEAD_CANVAS_KEYFRAME_RADIUS}
                    fill={BASE_WHITE}
                />
                {_.map(keyframes, (a, i) => {
                    return a
                        ? cloneElement(a, {
                              last: i === keyframes.length - 1
                          })
                        : null;
                })}
            </>
        );
    }

    render() {
        const {
            state: { canvasWidth, canvasHeight }
        } = this;

        return (
            <div data-not-unselect>
                <svg
                    onDoubleClick={this.selectKeyframeInTimeline}
                    ref={this._$svg}
                    className={css({
                        display: 'block',
                        width: canvasWidth + MARGIN * 2,
                        height: canvasHeight + MARGIN * 2,
                        backgroundColor: L_BLACK
                    })}
                    transform='scale(1, -1)'
                >
                    {this.renderGrid()}
                    {this.renderKeyframes()}
                </svg>
                {this.renderPosition()}
            </div>
        );
    }
}
