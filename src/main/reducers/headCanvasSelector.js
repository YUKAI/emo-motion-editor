import { handleActions } from 'redux-actions';
import actions from '../actions';
import { List, Map } from 'immutable';

export default handleActions(
    {
        [actions.selectKeyframeInHeadCanvas]: (
            state,
            { payload: { index } }
        ) => {
            return state.set('keyframe', index);
        },
        [actions.unselectKeyframeInHeadCanvas]: (state) => {
            return state.set('keyframe', null);
        },
        [actions.selectControlPointInHeadCanvas]: (
            state,
            { payload: { path } }
        ) => {
            return state.set('controlPoint', List(path));
        },
        [actions.unselectControlPointInHeadCanvas]: (state) => {
            return state.set('controlPoint', null);
        }
    },
    Map({
        keyframe: null,
        controlPoint: null
    })
);
