import { handleActions } from 'redux-actions';
import actions from '../actions';
import { Map } from 'immutable';

export default handleActions(
    {
        [actions.updateKey]: (state, { payload }) => {
            return state.merge(payload);
        }
    },
    Map({
        ctrl: false,
        alt: false,
        shift: false
    })
);
