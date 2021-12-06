import React, { Component } from 'react';
import { css } from '@emotion/css';
import { connect } from 'react-redux';
import { ChromePicker } from 'react-color';
import BezierCurveCanvas from './BezierCurveCanvas';
import SettingsBase from './SettingsBase';

@connect(({ timelinesSelection }) => {
    return {
        timelines: timelinesSelection.get('timelines')
    };
})
export default class LEDSettings extends Component {
    updatePoint = ({ x, y, index }) => {
        const {
            props: { updatePoint }
        } = this;

        updatePoint({ x, y, index });
    };

    onChange = ({ rgb }) => {
        const {
            props: { onChangeColor }
        } = this;

        onChangeColor({ color: rgb });
    };

    onChangeComplete = ({ rgb }) => {
        const {
            props: { onChangeColor }
        } = this;

        onChangeColor({ color: rgb }, true);
    };

    finishUpdatingPoint = () => {
        const {
            props: { finishUpdatingPoint }
        } = this;

        finishUpdatingPoint();
    };

    onChangeStartPointColor = ({ rgb }) => {
        const {
            props: { updateStartPoint }
        } = this;

        updateStartPoint(rgb);
    };

    onChangeStartPointColorComplete = ({ rgb }) => {
        const {
            props: { updateStartPoint }
        } = this;

        updateStartPoint(rgb, true);
    }

    render() {
        const {
            props: { keyframe, previousKeyframe, toggleKeep, toggleUseStartPoint }
        } = this;
        const startPoint = keyframe.get('startPoint');

        return (
            <SettingsBase>
                <div
                    className={css({
                        display: 'flex',
                        flexDirection: 'column',
                    })}
                >
                    <div
                        className={css({
                            display: 'flex',
                            flexDirection: 'row',
                        })}
                    >
                        <fieldset>
                            <legend>
                                <span>Start </span>
                                <label>
                                    <input
                                        type='checkbox'
                                        checked={!!startPoint}
                                        onChange={toggleUseStartPoint}
                                    />
                                    Override
                                </label>
                            </legend>
                            <div
                                className={css({
                                    position: 'relative',
                                })}
                            >
                                <ChromePicker
                                    onChange={this.onChangeStartPointColor}
                                    onChangeComplete={this.onChangeStartPointColorComplete}
                                    color={startPoint ?
                                            keyframe.startPointToColorObject()
                                        : previousKeyframe ? 
                                            previousKeyframe.startPoint ?
                                                previousKeyframe.startPointToColorObject()
                                            : previousKeyframe.toColorObject()
                                        : { r:0,g:0,b:0,a:0 }}
                                />
                                {!startPoint ?
                                <div
                                    className={css({
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        backgroundColor: 'rgba(128,128,128,0.5)'
                                    })}
                                />
                                : null}
                            </div>
                        </fieldset>
                        <fieldset
                            className={css({
                                position: 'relative',
                            })}
                        >
                            <legend>
                                <span>End </span>
                                <label>
                                    <input
                                        type='checkbox'
                                        checked={keyframe.get('keep')}
                                        onChange={toggleKeep}
                                        className={css({
                                            font: 'inherit'
                                        })}
                                    />
                                    Keep
                                </label>
                            </legend>
                            <div
                                className={css({
                                    position: 'relative',
                                })}
                            >
                                <ChromePicker
                                    onChange={this.onChange}
                                    onChangeComplete={this.onChangeComplete}
                                    color={keyframe.toColorObject()}
                                />
                                {keyframe.get('keep') ?
                                <div
                                    className={css({
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        backgroundColor: 'rgba(128,128,128,0.75)'
                                    })}
                                />
                                : null}
                            </div>
                        </fieldset>
                    </div>
                    <fieldset>
                        <legend>Easing</legend>
                        <div>
                            <BezierCurveCanvas
                                points={keyframe.get('bezierPoints')}
                                updatePoint={this.updatePoint}
                                finishUpdatingPoint={this.finishUpdatingPoint}
                                selectableIndexes={[2, 3]}
                            />
                        </div>
                    </fieldset>
                </div>
            </SettingsBase>
        );
    }
}
