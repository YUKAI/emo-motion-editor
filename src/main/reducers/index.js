import { combineReducers } from 'redux';
import timelinesSelection from './timelinesSelection';
import headCanvasSelector from './headCanvasSelector';
import keymaster from './keymaster';
import leftPanelWidth from './leftPanelWidth';

export default combineReducers({
    timelinesSelection,
    headCanvasSelector,
    keymaster,
    leftPanelWidth
});
