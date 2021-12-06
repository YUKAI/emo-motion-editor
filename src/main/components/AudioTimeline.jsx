import React, { Component, createRef } from 'react';
import { css } from '@emotion/css';
import { L_BLACK, A_WHITE } from '../shared/styles';
import { connect } from 'react-redux';
import Timeline from './Timeline';
import {
    TIME_SEGMENT,
    KEYFRAME_INTERVAL,
    AUDIO_TIMELINE_HEIGHT
} from '../shared/constants';
import { convertToFrame } from '../shared/funcs';
import autobind from 'autobind-decorator';
import actions from '../actions';
import {
    FaFileAudio,
    FaTimes
} from 'react-icons/fa';
import SynchronizedScroll from './SynchronizedScroll';
import Color from 'color';
import { BASE_WHITE } from '../shared/styles';
import { ipcRenderer } from 'electron';

@connect(({ timelinesSelection }) => {
    return {
        timelines: timelinesSelection.get('timelines')
    };
})
export default class AudioTimeline extends Component {
    constructor() {
        super();

        this.$e = createRef();
        this.initialFrame = 0;
        this.initialDelay = 0;
    }

    @autobind
    async importSound() {
        const {
            props: { timelines, dispatch }
        } = this;
        var paths = await ipcRenderer.invoke('app-dialog-show-open', {
            properties: ['openFile'],
            title: 'Select an audio file'
        });

        if (paths !== undefined) {
            var path = paths[0];
            dispatch(actions.loadAudio(await timelines.get('audio').load(path)));
        }
    }

    deleteSound = () => {
        const {
            props: { dispatch }
        } = this;

        dispatch(actions.deleteAudio());
    };

    _cursorPositionToFrame = ({ clientX }) => {
        const {
            $e: { current: $e }
        } = this;
        const { scrollLeft } = $e;
        const { left } = $e.getBoundingClientRect();

        return convertToFrame(clientX - left - Timeline.MARGIN_LEFT + scrollLeft);
    };

    onMouseDown = (e) => {
        const {
            props: { timelines }
        } = this;

        this.initialFrame = this._cursorPositionToFrame(e);
        this.initialDelay = timelines.getIn(['audio', 'delay']);
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
    };

    onMouseMove = (e) => {
        const {
            props: { dispatch },
            initialFrame,
            initialDelay
        } = this;

        dispatch(
            actions.updateAudioDelay({
                delay: Math.max(
                    0,
                    initialDelay +
                        (this._cursorPositionToFrame(e) - initialFrame) /
                            TIME_SEGMENT
                ),
                notStackUndoRedoHistory: true
            })
        );
    };

    onMouseUp = () => {
        const {
            props: { timelines, dispatch }
        } = this;

        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);

        dispatch(actions.updateAudioDelay({delay: timelines.getIn(['audio', 'delay'])}));
    };

    render() {
        const {
            props: { timelines }
        } = this;
        const width = timelines.getIn(['audio', 'timelineLeftWidth']);

        return (
            <div
                className={css({
                    // display: 'flex',  TODO
                    display: 'none',
                    height: AUDIO_TIMELINE_HEIGHT
                })}
            >
                <div
                    onClick={this.importSound}
                    className={css({
                        width: Timeline.NAME_WIDTH,
                        padding: '3px 6px',
                        borderRight: `1px solid ${L_BLACK}`,
                        borderBottom: `1px solid ${L_BLACK}`,
                        boxSizing: 'border-box',
                        userSelect: 'none',
                        cursor: 'pointer',
                        backgroundColor: L_BLACK,
                        display: 'flex',
                        alignItems: 'center'
                    })}
                >
                    <FaFileAudio
                        className={css({ display: 'block', marginRight: 4 })}
                    />
                    {timelines.getIn(['audio', 'name']).length > 0 &&
                        <div
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                padding: 3,
                                borderRadius: '5px',
                                marginRight: 4,
                                ':hover': {
                                    backgroundColor: Color(BASE_WHITE).darken(0.6).toString(),
                                },
                                cursor: 'pointer',
                            })}
                            onClick={(e) => { e.stopPropagation(); this.deleteSound(); }}
                        >
                            <FaTimes />
                        </div>
                    }
                    <div
                        className={css({
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            flex: 1
                        })}
                    >
                        {timelines.getIn(['audio', 'name']) || 'Audio'}
                    </div>
                </div>
                <SynchronizedScroll
                    ref={this.$e}
                    index={-2}
                    className={css({
                        width: `calc(100% - ${Timeline.NAME_WIDTH}px)`,
                        borderBottom: `1px solid ${L_BLACK}`,
                        position: 'relative',
                        overflowX: 'scroll',
                        '::-webkit-scrollbar': {
                            display: 'none'
                        }
                    })}
                >
                    <div
                        className={css({
                            width: Timeline.RIGHT_WIDTH + 1,
                            height: '100%',
                            paddingLeft: Timeline.MARGIN_LEFT,
                            paddingRight: Timeline.MARGIN_RIGHT,
                            paddingTop: 0,
                            paddingBottom: 0,
                            position: 'relative'
                        })}
                    >
                        <div
                            onMouseDown={this.onMouseDown}
                            className={css({
                                width,
                                height: '100%',
                                position: 'absolute',
                                left:
                                    Timeline.MARGIN_LEFT +
                                    timelines.getIn(['audio', 'delay']) *
                                        KEYFRAME_INTERVAL *
                                        TIME_SEGMENT,
                                top: 0
                            })}
                        >
                            <div
                                className={css({
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    width: '100%',
                                    height: '100%',
                                    background: A_WHITE
                                })}
                            />
                            <div
                                className={css({
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    width: '100%',
                                    height: '100%',
                                    background: timelines.getIn(['audio', 'background'])
                                })}
                            />
                        </div>
                    </div>
                </SynchronizedScroll>
            </div>
        );
    }
}
