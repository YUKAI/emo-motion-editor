import React, { Component } from 'react';
import { css } from '@emotion/css';
import SettingsBase from './SettingsBase';
import RCSlider, { createSliderWithTooltip } from 'rc-slider';
import 'rc-slider/assets/index.css';

const SliderWithTooltip = createSliderWithTooltip(RCSlider);

const Slider = ({
    min,
    max,
    value,
    step = 0.1,
    onChange,
    disabled=false,
    stateKey = 'value'
}) => {
    const wrapOnChange = (value) => {
        onChange({ [stateKey]: value });
    };

    const wrapOnAfterChange = (value) => {
        onChange({ [stateKey]: value }, true);
    };

    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                width: 200
            })}
        >
            <div
                className={css({
                    padding: '3px 6px',
                    color: disabled ? 'grey' : 'white',
                })}
            >
                {min.toFixed(1)}
            </div>
            <div
                className={css({
                    flex: 1,
                    padding: 3
                })}
            >
                <SliderWithTooltip
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={wrapOnChange}
                    onAfterChange={wrapOnAfterChange}
                    disabled={disabled}
                />
            </div>
            <div
                className={css({
                    padding: '3px 6px',
                    color: disabled ? 'grey' : 'white',
                })}
            >
                {max.toFixed(1)}
            </div>
        </div>
    );
};

export default class AntennaSettings extends Component {
    updatePosition = ({ value }, final=false) => {
        const {
            props: { updatePosition }
        } = this;

        updatePosition({ value }, final);
    };

    updateFrequency = ({ value }, final=false) => {
        const {
            props: { updateFrequency }
        } = this;

        updateFrequency({ value }, final);
    };

    updateAmplitude = ({ value }, final=false) => {
        const {
            props: { updateAmplitude }
        } = this;

        updateAmplitude({ value }, final);
    };

    render = () => {
        const {
            props: {
                keyframe,
                previousKeyframe,
                toggleUsePosition,
                toggleUseStartPoint,
                updateStartPoint
            }
        } = this;
        const usePosition = keyframe.get('usePosition');
        const startPoint = keyframe.get('startPoint');

        return (
            <SettingsBase>
                <div
                    className={css({
                        display: 'flex',
                        flexDirection: 'column',
                    })}
                >
                    <fieldset
                        className={css({
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                        })}
                    >
                        <legend>Control type</legend>
                        <div
                            className={css({
                                display: 'flex',
                                flexDirection: 'column',
                            })}
                        >
                            <label>
                                <input
                                    type='radio'
                                    checked={usePosition}
                                    onChange={toggleUsePosition}
                                />
                                Position
                            </label>
                            <label>
                                <input
                                    type='radio'
                                    checked={!usePosition}
                                    onChange={toggleUsePosition}
                                />
                                Waveform
                            </label>
                        </div>
                    </fieldset>
                </div>
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
                                display: usePosition ? 'initial' : 'none'
                            })}
                        >
                            <div
                                className={css({
                                    padding: '3px 6px',
                                    color: !startPoint ? 'grey' : 'white',
                                })}
                            >
                                Position
                            </div>
                            <Slider
                                min={-1.0}
                                max={1.0}
                                step={0.1}
                                value={startPoint ? startPoint.get('position') : previousKeyframe && previousKeyframe.get('usePosition') ? previousKeyframe.get('position') : 0.0}
                                onChange={updateStartPoint}
                                stateKey={'position'}
                                disabled={!startPoint}
                            />
                        </div>
                        <div
                            className={css({
                                display: !usePosition ? 'initial' : 'none'
                            })}
                        >
                            <div
                                className={css({
                                    padding: '3px 6px',
                                    color: !startPoint ? 'grey' : 'white',
                                })}
                            >
                                Frequency
                            </div>
                            <Slider
                                min={0.0}
                                max={20.0}
                                value={startPoint ? startPoint.get('frequency') : previousKeyframe && !previousKeyframe.get('usePosition') ? previousKeyframe.get('frequency') : 0.0}
                                onChange={updateStartPoint}
                                stateKey={'frequency'}
                                disabled={!startPoint}
                            />
                        </div>
                        <div
                            className={css({
                                display: !usePosition ? 'initial' : 'none'
                            })}
                        >
                            <div
                                className={css({
                                    padding: '3px 6px',
                                    color: !startPoint ? 'grey' : 'white',
                                })}
                            >
                                Amplitude
                            </div>
                            <Slider
                                min={-1.0}
                                max={1.0}
                                value={startPoint ? startPoint.get('amplitude') : previousKeyframe && !previousKeyframe.get('usePosition') ? previousKeyframe.get('amplitude') : 0.0}
                                onChange={updateStartPoint}
                                stateKey={'amplitude'}
                                disabled={!startPoint}
                            />
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>
                            <span>End</span>
                        </legend>
                        <div
                            className={css({
                                display: usePosition ? 'initial' : 'none'
                            })}
                        >
                            <div
                                className={css({
                                    padding: '3px 6px'
                                })}
                            >
                                Position
                            </div>
                            <Slider
                                min={-1.0}
                                max={1.0}
                                step={0.1}
                                value={keyframe.get('position')}
                                onChange={this.updatePosition}
                            />
                        </div>
                        <div
                            className={css({
                                display: !usePosition ? 'initial' : 'none'
                            })}
                        >
                            <div
                                className={css({
                                    padding: '3px 6px'
                                })}
                            >
                                Frequency
                            </div>
                            <Slider
                                min={0.0}
                                max={20.0}
                                value={keyframe.get('frequency')}
                                onChange={this.updateFrequency}
                            />
                        </div>
                        <div
                            className={css({
                                display: !usePosition ? 'initial' : 'none'
                            })}
                        >
                            <div
                                className={css({
                                    padding: '3px 6px'
                                })}
                            >
                                Amplitude
                            </div>
                            <Slider
                                min={-1.0}
                                max={1.0}
                                value={keyframe.get('amplitude')}
                                onChange={this.updateAmplitude}
                            />
                        </div>
                    </fieldset>
                </div>
            </SettingsBase>
        );
    };
}
