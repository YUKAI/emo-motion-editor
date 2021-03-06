import { createActions } from 'redux-actions';

export default createActions(
    {},
    'LINK_TIMELINES',
    'UNLINK_TIMELINES',
    'ADD_KEYFRAME',
    'REMOVE_KEYFRAME',
    'UNSELECT_KEYFRAME',
    'MOVE_KEYFRAME',
    'CHANGE_KEYFRAME_COLOR',
    'TOGGLE_KEYFRAME_KEEP',
    'TOGGLE_KEYFRAME_USE_POSITION',
    'UPDATE_KEYFRAME_POSITION',
    'UPDATE_KEYFRAME_FREQUENCY',
    'UPDATE_KEYFRAME_AMPLITUDE',
    'TOGGLE_KEYFRAME_USE_START_POINT',
    'UPDATE_KEYFRAME_START_POINT',
    'UPDATE_BEZIER_POINT',
    'REPLACE_TIMELINES',
    'LOAD_AUDIO',
    'DELETE_AUDIO',
    'UPDATE_AUDIO_DELAY',
    'SELECT_KEYFRAME_IN_HEAD_CANVAS',
    'UNSELECT_KEYFRAME_IN_HEAD_CANVAS',
    'SELECT_CONTROL_POINT_IN_HEAD_CANVAS',
    'UNSELECT_CONTROL_POINT_IN_HEAD_CANVAS',
    'UPDATE_KEYFRAME_IN_HEAD_CANVAS',
    'UPDATE_CONTROL_POINT_IN_HEAD_CANVAS',
    'UPDATE_KEY',
    'IMPORT_MOTION',
    'START_SELECTION_RANGE',
    'END_SELECTION_RANGE',
    'CLEAR_SELECTION_RANGE',
    'SHIFT_SELECTION',
    'DELETE_TIMELINES',
    'COPY_TIMELINES',
    'PASTE_TIMELINES',
    'RESIZE_LEFT_PANEL',
    'RESET_MOTION',
    'MOVE_SELECTION_RANGE',
    'MOVE_SELECTION_RANGE_GRAB',
    'MOVE_SELECTION_RANGE_GRAB_END',
    'SELECTION_RANGE_SELECTED',
    'REPLACE_SELECTION_RANGE',
);
