import { handleActions } from 'redux-actions';
import { List, Map } from 'immutable';
import { Timeline, Audio, SelectionRange } from '../models';
import actions from '../actions';
import _ from 'lodash';
import {
    LEDKeyframe,
    AntennaKeyframe,
    HeadKeyframe,
    Point,
    PointWithThetaAndRadius
} from '../models';
import { undoRedoHistory } from '../shared/funcs';
import { TIME_SEGMENT } from '../shared/constants'

const sortKeyframes = (state, index) => {
    return state.updateIn(['timelines', 'timelines', index, 'keyframes'], (keyframes) =>
        keyframes.sortBy((a, i) => i)
    );
};

const sortAndSyncKeyframes = (state, index) => {
    state = sortKeyframes(state, index);

    if (state.getIn(['timelines', 'timelines', index, 'link']) && state.getIn(['timelines', 'timelines', index, 'primary'])) {
        for (let i=0 ; i<state.getIn(['timelines', 'timelines']).size ; i++) {
            if (state.getIn(['timelines', 'timelines', i, 'link']) && state.getIn(['timelines', 'timelines', i, 'linkTo']) === index) {
                const toIndex = state.getIn(['timelines', 'timelines', i, 'linkTo']);
                if (toIndex !== null) {
                    state = state.updateIn(['timelines', 'timelines', i], (timeline) =>
                        timeline.set('keyframes', state.getIn(['timelines', 'timelines', toIndex, 'keyframes']))
                    );
                }
            }
        }
    }

    return state;
};

const initialState = Map({
    'timelines': Map({
        'timelines': List(
            _.map(
                [
                    {
                        name: 'Head',
                        KeyframeModel: HeadKeyframe
                    },
                    { name: 'Antenna', KeyframeModel: AntennaKeyframe },
                    {
                        name: 'Left Cheek',
                        KeyframeModel: LEDKeyframe,
                        primary: true,
                        primaryName: 'Cheeks'
                    },
                    {
                        name: 'Right Cheek',
                        KeyframeModel: LEDKeyframe,
                        linkTo: 2
                    },
                    { name: 'Record LED', KeyframeModel: LEDKeyframe },
                    { name: 'Play LED', KeyframeModel: LEDKeyframe },
                    { name: 'Function LED', KeyframeModel: LEDKeyframe }
                ],
                (args) => new Timeline(args)
            )
        ),
        'audio': new Audio()
    }),
    'selectionRange': new SelectionRange()
});

undoRedoHistory.add(initialState);

export default handleActions(
    {
        [actions.addKeyframe]: (state, { payload }) => {
            const { index, frame, keyframe, notStackUndoRedoHistory } = payload;

            state = sortAndSyncKeyframes(
                state.setIn(['timelines', 'timelines', index, 'keyframes', frame], keyframe),
                index
            );

            state = state.set('selectionRange', state.get('selectionRange').addSelected(payload));

            if (!notStackUndoRedoHistory) {
                undoRedoHistory.add(state);
            }

            return state;
        },
        [actions.moveKeyframe]: (state, { payload }) => {
            const { index, fromFrame, toFrame, notStackUndoRedoHistory } = payload;

            state = sortAndSyncKeyframes(
                state.updateIn(['timelines', 'timelines', index, 'keyframes'], (keyframes) => {
                    const keyframe = keyframes.get(fromFrame);

                    return keyframes.delete(fromFrame).set(toFrame, keyframe);
                }),
                index
            );

            state = state.set('selectionRange', state.get('selectionRange').moveSelected(payload));

            if (!notStackUndoRedoHistory) {
                undoRedoHistory.add(state);
            }

            return state;
        },
        [actions.updateBezierPoint]: (
            state,
            {
                payload: {
                    keyframePath,
                    x,
                    y,
                    bezierIndex,
                    notStackUndoRedoHistory
                }
            }
        ) => {
            const index = keyframePath.get(0);

            state = sortAndSyncKeyframes(
                state.updateIn(
                    [
                        'timelines',
                        'timelines',
                        index,
                        'keyframes',
                        keyframePath.get(1),
                        'bezierPoints',
                        bezierIndex
                    ],
                    (keyframe) => keyframe.merge({ x, y })
                ),
                index
            );

            if (!notStackUndoRedoHistory) {
                undoRedoHistory.add(state);
            }

            return state;
        },
        [actions.changeKeyframeColor]: (
            state,
            { payload: { keyframePath, color, notStackUndoRedoHistory } }
        ) => {
            const index = keyframePath.get(0);

            state = sortAndSyncKeyframes(
                state.updateIn(
                    ['timelines', 'timelines', index, 'keyframes', keyframePath.get(1)],
                    (keyframe) => keyframe.merge({ ...color })
                ),
                index
            );

            if (!notStackUndoRedoHistory) {
                undoRedoHistory.add(state);
            }

            return state;
        },
        [actions.toggleKeyframeKeep]: (
            state,
            { payload: { keyframePath, notStackUndoRedoHistory } }
        ) => {
            const index = keyframePath.get(0);

            state = sortAndSyncKeyframes(
                state.updateIn(
                    ['timelines', 'timelines', index, 'keyframes', keyframePath.get(1), 'keep'],
                    (keep) => !keep
                ),
                index
            );

            if (!notStackUndoRedoHistory) {
                undoRedoHistory.add(state);
            }

            return state;
        },
        [actions.linkTimelines]: (
            state,
            { payload: { index, notStackUndoRedoHistory } }
        ) => {
            state = state.setIn(['timelines', 'timelines', index, 'link'], true);
            for (let i=0 ; i<state.getIn(['timelines', 'timelines']).size ; i++) {
                if (state.getIn(['timelines', 'timelines', i, 'linkTo']) === index) {
                    state = state.setIn(['timelines', 'timelines', i, 'link'], true);
                }
            }
            state = sortAndSyncKeyframes(state, index);

            if (!notStackUndoRedoHistory) {
                undoRedoHistory.add(state);
            }

            return state;
        },
        [actions.unlinkTimelines]: (
            state,
            { payload: { index, notStackUndoRedoHistory } }
        ) => {
            state = state.setIn(['timelines', 'timelines', index, 'link'], false);
            for (let i=0 ; i<state.getIn(['timelines', 'timelines']).size ; i++) {
                if (state.getIn(['timelines', 'timelines', i, 'linkTo']) === index) {
                    state = state.setIn(['timelines', 'timelines', i, 'link'], false);
                }
            }

            if (!notStackUndoRedoHistory) {
                undoRedoHistory.add(state);
            }

            return state;
        },
        [actions.toggleKeyframeUsePosition]: (
            state,
            { payload: { keyframePath, notStackUndoRedoHistory } }
        ) => {
            state = state.updateIn(
                [
                    'timelines',
                    'timelines',
                    keyframePath.get(0),
                    'keyframes',
                    keyframePath.get(1),
                    'usePosition'
                ],
                (a) => !a
            );

            if (!notStackUndoRedoHistory) {
                undoRedoHistory.add(state);
            }

            return state;
        },
        [actions.toggleKeyframeUseStartPoint]: (
            state,
            { payload: { keyframePath, notStackUndoRedoHistory } }
        ) => {
            state = sortAndSyncKeyframes(
                state.updateIn(
                    ['timelines', 'timelines', keyframePath.get(0), 'keyframes', keyframePath.get(1)],
                    (a) => a.toggleStartPoint()
                ),
                keyframePath.get(0)
            );

            if (!notStackUndoRedoHistory) {
                undoRedoHistory.add(state);
            }

            return state;
        },
        [actions.updateKeyframeStartPoint]: (
            state,
            { payload: { keyframePath, value, notStackUndoRedoHistory } }
        ) => {
            state = sortAndSyncKeyframes(
                state.mergeIn(
                    [
                        'timelines',
                        'timelines',
                        keyframePath.get(0),
                        'keyframes',
                        keyframePath.get(1),
                        'startPoint'
                    ],
                    value
                ),
                keyframePath.get(0)
            );

            if (!notStackUndoRedoHistory) {
                undoRedoHistory.add(state);
            }

            return state;
        },
        [actions.updateKeyframePosition]: (
            state,
            { payload: { keyframePath, value, notStackUndoRedoHistory } }
        ) => {
            state = state.setIn(
                [
                    'timelines',
                    'timelines',
                    keyframePath.get(0),
                    'keyframes',
                    keyframePath.get(1),
                    'position'
                ],
                value
            );

            if (!notStackUndoRedoHistory) {
                undoRedoHistory.add(state);
            }

            return state;
        },
        [actions.updateKeyframeFrequency]: (
            state,
            { payload: { keyframePath, value, notStackUndoRedoHistory } }
        ) => {
            state = state.setIn(
                [
                    'timelines',
                    'timelines',
                    keyframePath.get(0),
                    'keyframes',
                    keyframePath.get(1),
                    'frequency'
                ],
                value
            );

            if (!notStackUndoRedoHistory) {
                undoRedoHistory.add(state);
            }

            return state;
        },
        [actions.updateKeyframeAmplitude]: (
            state,
            { payload: { keyframePath, value, notStackUndoRedoHistory } }
        ) => {
            state = state.setIn(
                [
                    'timelines',
                    'timelines',
                    keyframePath.get(0),
                    'keyframes',
                    keyframePath.get(1),
                    'amplitude'
                ],
                value
            );

            if (!notStackUndoRedoHistory) {
                undoRedoHistory.add(state);
            }

            return state;
        },
        [actions.updateKeyframeInHeadCanvas]: (
            state,
            { payload: { index, x, y, notStackUndoRedoHistory } }
        ) => {
            state = state.updateIn(['timelines', 'timelines', 0, 'keyframes', index], (a) =>
                a.merge({ x, y })
            );

            if (!notStackUndoRedoHistory) {
                undoRedoHistory.add(state);
            }

            return state;
        },
        [actions.updateControlPointInHeadCanvas]: (
            state,
            { payload: { path, radius, theta, notStackUndoRedoHistory } }
        ) => {
            state = state.updateIn(
                ['timelines', 'timelines', 0, 'keyframes', path.get(0), 'controlPoints', path.get(1)],
                (a) => a.merge({ radius, theta })
            );

            if (!notStackUndoRedoHistory) {
                undoRedoHistory.add(state);
            }

            return state;
        },
        [actions.importMotion]: (state, { payload: { keyframesList, sound } }) => {
            _.forEach(keyframesList, ({ keyframes, link }, i) => {
                const KeyframeModel = state.getIn(['timelines', 'timelines', i, 'KeyframeModel']);
                let ret = Map();

                _.forEach(keyframes, (keyframe, frame) => {
                    const { bezierPoints, controlPoints, startPoint, ...rest } = keyframe;

                    if (bezierPoints) {
                        rest.bezierPoints = List(
                            _.map(bezierPoints, (a) => new Point(a))
                        );
                    }

                    if (controlPoints) {
                        rest.controlPoints = List(
                            _.map(
                                controlPoints,
                                (a) => new PointWithThetaAndRadius(a)
                            )
                        );
                    }

                    if (startPoint) {
                        rest.startPoint = Map(startPoint);
                    }

                    ret = ret.set(parseInt(frame)*TIME_SEGMENT/1000, new KeyframeModel(rest));
                });

                if (link !== undefined && state.getIn(['timelines', 'timelines', i, 'primary'])) {
                    state = state.setIn(['timelines', 'timelines', i, 'link'], link);
                }

                var linkTo = state.getIn(['timelines', 'timelines', i, 'linkTo']);
                if (linkTo !== null) {
                    state = state.setIn(['timelines', 'timelines', i, 'link'], state.getIn(['timelines', 'timelines', linkTo, 'link']));
                }

                state = state.setIn(['timelines', 'timelines', i, 'keyframes'], ret);
            });

            if (sound) {
                state = state.mergeIn(['timelines', 'audio'], sound);
            }

            undoRedoHistory.add(state);
            undoRedoHistory.setSavePoint();

            return state;
        },
        [actions.resetMotion]: (state) => {
            state = initialState;

            undoRedoHistory.add(state);

            return state;
        },
        [actions.replaceTimelines]: (state, { payload }) => {
            return payload;
        },
        [actions.deleteTimelines]: (
            state,
            { payload: { selected, sx, sy } }
        ) => {
            selected.forEach((a, i) => {
                const index = sy + i;

                a.forEach((b, j) => {
                    const frame = sx + j;

                    state = state.updateIn(
                        ['timelines', 'timelines', index, 'keyframes'],
                        (keyframes) => {
                            if (keyframes.has(frame)) {
                                keyframes = keyframes.delete(frame);
                            }

                            return keyframes;
                        }
                    );
                });

                state = sortAndSyncKeyframes(state, index);
            });

            state = state.set('selectionRange', state.get('selectionRange').clear());

            undoRedoHistory.add(state);

            return state;
        },
        [actions.pasteTimelines]: (
            state,
            { payload: { sx, sy, selected } }
        ) => {
            if (!selected) {
                return state;
            }

            selected.forEach((a, i) => {
                const index = sy + i;

                state = sortAndSyncKeyframes(
                    state.updateIn(['timelines', 'timelines', index], (timeline) => {
                        return timeline.update('keyframes', (keyframes) => {
                            a.forEach((b, j) => {
                                const index = sx + j;

                                if (keyframes.has(index) && b === null) {
                                    keyframes = keyframes.delete(index);
                                } else if (
                                    b !== null &&
                                    b.constructor ===
                                        timeline.get('KeyframeModel')
                                ) {
                                    keyframes = keyframes.set(index, b);
                                }
                            });

                            return keyframes;
                        });
                    }),
                    index
                );
            });

            state = state.set('selectionRange', state.get('selectionRange').clear());

            undoRedoHistory.add(state);

            return state;
        },
        [actions.loadAudio]: (state, { payload }) => {
            state = state.mergeIn(['timelines', 'audio'], payload);

            undoRedoHistory.add(state);

            return state;
        },
        [actions.updateAudioDelay]: (state, { payload: { delay, notStackUndoRedoHistory } }) => {
            state = state.mergeIn(['timelines', 'audio'], { delay });

            if (!notStackUndoRedoHistory) {
                undoRedoHistory.add(state);
            }

            return state;
        },
        [actions.deleteAudio]: (state) => {
            state = state.setIn(['timelines', 'audio'], new Audio());

            undoRedoHistory.add(state);

            return state;
        },






        [actions.startSelectionRange]: (state, { payload }) => {
            state = state.set('selectionRange', state.get('selectionRange').start(payload));
            return state;
        },
        [actions.endSelectionRange]: (state, { payload }) => {
            state = state.set('selectionRange', state.get('selectionRange').end(payload));
            return state;
        },
        [actions.copyTimelines]: (state, { payload: { selected } }) => {
            state = state.setIn(['selectionRange', 'copyContent'], selected);
            return state;
        },
        [actions.moveSelectionRange]: (state, { payload }) => {
            state = state.set('selectionRange', state.get('selectionRange').moveTo(payload));
            return state;
        },
        [actions.moveSelectionRangeGrab]: (state, { payload }) => {
            state = state.set('selectionRange', state.get('selectionRange').grabStart(payload));
            return state;
        },
        [actions.moveSelectionRangeGrabEnd]: (state) => {
            state = state.set('selectionRange', state.get('selectionRange').grabEnd());
            return state;
        },
        [actions.selectionRangeSelected]: (state, { payload }) => {
            state = state.set('selectionRange', state.get('selectionRange').setSelected(payload));
            return state;
        },
        [actions.clearSelectionRange]: (state) => {
            state = state.set('selectionRange', state.get('selectionRange').clear());
            return state;
        },
        [actions.shiftSelection]: (state, { payload }) => {
            state = state.setIn(['selectionRange', 'useShift'], payload);
            return state;
        },
        [actions.replaceSelectionRange]: (state, { payload: { selectionRange } }) => {
            state = state.set('selectionRange', selectionRange);
            return state;
        }
    },
    initialState
);
