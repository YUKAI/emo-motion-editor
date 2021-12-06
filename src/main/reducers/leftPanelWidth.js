import { handleActions } from 'redux-actions';
import actions from '../actions';

const minWidth = 495;

export default handleActions(
    {
        [actions.resizeLeftPanel]: (state, { payload: { width } }) => {
            return Math.max(minWidth, width);
        }
    },
    minWidth
);
