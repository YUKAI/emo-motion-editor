import React, { Component, cloneElement } from 'react';
import { css } from '@emotion/css';
import {
    FaFileAlt,
    FaRegPlusSquare,
    FaSave,
    FaRegSave,
    FaFileExport,
    FaUndo,
    FaRedo,
    FaPlay,
    FaSignInAlt,
    FaSignOutAlt
} from 'react-icons/fa';
import { L_BLACK, LL_BLACK, BASE_WHITE, BASE_BLACK } from '../shared/styles';
import fs from 'fs-extra';
import { toast } from 'react-toastify';
import { connect } from 'react-redux';
import actions from '../actions';
import convertToEmoMotion from '../shared/converter';
import libpath from 'path';
import { settings, undoRedoHistory } from '../shared/funcs';
import Select from 'react-select'
import * as emoApi from '../shared/api';
import Color from 'color';
import { ipcRenderer } from 'electron';
import { TIME_SEGMENT } from '../shared/constants'


var login_details = {
    account_info: null,
}


const Button = ({ icon, text, onClick, disabled=false, textStyle={}, ...props }) => {
    var _style = {
        userSelect: 'none',
        height: '100%',
        padding: '0 16px',
        display: 'inline-flex',
        alignItems: 'center',
    };
    if (disabled) {
        Object.assign(_style, {
            backgroundColor: BASE_BLACK,
            color: Color(BASE_WHITE).darken(0.5).toString(),
        });
    }
    else {
        Object.assign(_style, {
            backgroundColor: L_BLACK,
            cursor: 'pointer',
        });
    }
    return (
        <span
            onClick={disabled ? () => {} : onClick}
            className={css(_style)}
            {...props}
        >
            {cloneElement(icon, {
                className: css({ display: 'block', marginRight: 4 })
            })}
            <div className={css(textStyle)}>{text}</div>
        </span>
    );
};


@connect(({ timelinesSelection }) => {
    return {
        timelines: timelinesSelection.get('timelines')
    };
})
export default class TopPanel extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loggedIn: false,
            username: "",
            selectedRoom: -1,
            roomList: [],
            canLogin: true,
            undoRedo: undoRedoHistory,
            saveFilePath: null,
        };
        this._windowTitle = "Emo Motion Editor";
    }

    componentDidMount() {
        ipcRenderer.addListener('app-close', this.beforeWindowClose);
        ipcRenderer.addListener('menu:save', this.saveFromMenu);
        ipcRenderer.addListener('menu:saveas', this.saveasFromMenu);
        undoRedoHistory.addListener('undo-redo-history-change', this.onHistoryUpdate);
        this.setState({canLogin: false});
        try {
            settings.load();
        }
        catch(err) {
            toast.error(`Could not load application settings: ${err.message}`);
        }
        if (!settings.isDefault("api.refresh_token")) {
            this._getAccountInfo().finally(() => {
                this.setState({canLogin: true});
            });
        }
        else {
            this.setState({canLogin: true});
        }
    }

    componentDidUpdate() {
        var title = this._windowTitle;
        if (this.state.undoRedo.needSave) {
            title = "* "+this._windowTitle;
        }
        ipcRenderer.send('app-change-main-window-title', title);
    }

    beforeWindowClose = () => {
        this._checkForSave().then(() => { ipcRenderer.send('app-close-finished'); });
    }

    saveFromMenu = () => {
        this.saveMotionToFile().then(() => {});
    };

    saveasFromMenu = () => {
        this.saveMotion().then(() => {});
    };

    onHistoryUpdate = () => {
        this.setState({undoRedo: undoRedoHistory});
    }

    _convertToEditorMotion = (motionFilePath = '') => {
        const {
            props: { timelines }
        } = this;

        var kf = [];

        for (let i=0 ; i<timelines.get('timelines').size ; i++) {
            var tl = {};
            var keyframes = {};
            timelines.getIn(['timelines', i, "keyframes"]).forEach((keyframe, frame) => {
                keyframes[(frame*1000/TIME_SEGMENT)] = keyframe.toJS();
            });
            tl["keyframes"] = keyframes;
            if (timelines.getIn(['timelines', i, "primary"])) {
                tl['link'] = timelines.getIn(['timelines', i, "link"]);
            }
            kf.push(tl)
        }

        return {
            metadata: {
                appVersion: APP_VERSION
            },
            keyframesList: kf,
            sound: {
                name: timelines.getIn(['audio', 'src'])
                    ? libpath.relative(
                        libpath.dirname(motionFilePath),
                        timelines.getIn(['audio', 'src'])
                    )
                    : ""
                ,
                delay: timelines.getIn(['audio', 'delay'])
            }
        };
    };

    _getAccountInfo = async () => {
        try {
            var info = await emoApi.get_account_info();
            login_details.account_info = info;
            var res = await emoApi.get_rooms_list();
            var l = [];
            for (const room of res.rooms) {
                if (room.uuid === settings.get("room_id")) {
                    this.setState({selectedRoom: l.length});
                }
                l.push({value: room.uuid, label: room.name});
            }
            this.setState({username: info.name, roomList: l, loggedIn: true});
        }
        catch (error) {
            toast.error("Could not get account information");

        }
    };

    _checkForSave = async () => {
        if (undoRedoHistory.needSave) {
            var resp = await ipcRenderer.invoke('app-dialog-show-message-box', {
                type: 'question',
                buttons: ['Yes', 'No'],
                defaultId: 0,
                message: `Unsaved work will be lost.`,
                detail: `Would you like to save your current work ?`
            });

            if (resp == 0) {
                await this.saveMotionToFile();
            }
        }
    }

    openMotion = async () => {
        const {
            props: { timelines, dispatch }
        } = this;
        var paths = await ipcRenderer.invoke('app-dialog-show-open', {
            properties: ['openFile'],
            title: 'Select a motion file',
            filters: [{ name: 'Emo Motion Editor Files', extensions: ['exme'] }, { name: 'All Files', extensions: ['*'] }]
        });

        if (paths !== undefined) {
            var path = paths[0];

            await this._checkForSave();

            const {
                keyframesList,
                sound: { delay, name }
            } = JSON.parse(await fs.readFile(path, { encoding: 'utf-8' }));
            const audioPath = libpath.resolve(libpath.dirname(path), name);
            let sound = null;

            this.setState({saveFilePath: path});
            this._windowTitle = "Emo Motion Editor - "+this.state.saveFilePath;
            undoRedoHistory.reset();
            this.setState({undoRedo: undoRedoHistory});

            if (name) {
                if (await fs.pathExists(audioPath)) {
                    sound = {
                        delay,
                        ...(await timelines.get('audio').load(audioPath))
                    };
                } else {
                    toast.error(`Not found: "${audioPath}".`);
                }
            }

            dispatch(actions.importMotion({ keyframesList, sound }));
        }
    };

    newMotion = async () => {
        const {
            props: { dispatch }
        } = this;

        await this._checkForSave();

        this.setState({saveFilePath: null});
        this._windowTitle = "Emo Motion Editor";
        undoRedoHistory.reset();
        this.setState({undoRedo: undoRedoHistory});

        dispatch(actions.resetMotion());
    };

    saveMotionToFile = async () => {
        if (this.state.saveFilePath === null) {
            await this.saveMotion();
            return;
        }

        await fs.writeFile(
            this.state.saveFilePath,
            JSON.stringify(this._convertToEditorMotion(this.state.saveFilePath))
        );

        undoRedoHistory.setSavePoint();
        this.setState({undoRedo: undoRedoHistory});
        toast.success(`Saved to "${this.state.saveFilePath}".`);
    };

    saveMotion = async () => {
        var filePath = await ipcRenderer.invoke('app-dialog-show-save', {
            defaultPath: 'motion.exme'
        });

        if (filePath !== undefined) {
            this.setState({saveFilePath: filePath});
            this._windowTitle = "Emo Motion Editor - "+this.state.saveFilePath;
            await this.saveMotionToFile();
        }
    };

    exportMotion = async () => {
        var filePath = await ipcRenderer.invoke('app-dialog-show-save', {
            defaultPath: 'emo-motion.json'
        });

        if (filePath !== undefined) {
            await fs.writeFile(
                filePath,
                JSON.stringify(
                    convertToEmoMotion(this._convertToEditorMotion())
                )
            );
            toast.success(`Exported to "${filePath}".`);
        }
    };

    playMotion = async () => {
        try {
            if (settings.isDefault("room_id")) {
                toast.error("Could not play: no room is selected.");
                return;
            }
            await emoApi.send_motion(settings.get("room_id"), convertToEmoMotion(this._convertToEditorMotion()));
            toast.success("Motion was sent successfully, it will be played soon.");
        }
        catch (e) {
            var err_list_str = "";
            for (let [key, value] of Object.entries(e)) {
                err_list_str += '\n';
                err_list_str += key.toString();
                err_list_str += ': ';
                err_list_str += value.toString();
            }
            toast.error(`Error sending motion data.${err_list_str}`);
        }
    };

    onRoomSelect = async (opt) => {
        settings.set("room_id", opt.value);
        this.setState({selectedRoom: this.state.roomList.findIndex((e) => e.value == opt.value)});
    };

    onLogin = async () => {
        try {
            this.setState({canLogin: false});
            await emoApi.login();
            await this._getAccountInfo();
            toast.success(`Successfully logged in as ${this.state.username}.`);
        }
        catch (error) {
            toast.error(`Login failed: ${error.toString()}`);
        }
        finally {
            this.setState({canLogin: true});
        }
    };

    onLogout = async () => {
        try {
            this.setState({canLogin: false});
            settings.clear();
            this.setState({loggedIn: false, username: "", selectedRoom: -1});
        }
        finally {
            this.setState({canLogin: true});
        }
    };

    render() {
        return (
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                    '> :not(:last-child)': {
                        marginRight: '2px'
                    },
                    borderBottom: `1px solid ${LL_BLACK}`,
                    height: '36px',
                })}
            >
                <Button
                    icon={<FaFileAlt />}
                    text='Open'
                    onClick={this.openMotion}
                />
                <Button
                    icon={<FaRegPlusSquare />}
                    text='New'
                    onClick={this.newMotion}
                />
                <Button
                    data-not-unselect
                    icon={<FaSave />}
                    text={this.state.undoRedo.needSave ? '*Save' : 'Save'}
                    onClick={this.saveMotionToFile}
                    textStyle={{
                        fontWeight: this.state.undoRedo.needSave ? 'bold' : 'normal',
                        minWidth: 45
                    }}
                />
                <Button
                    icon={<FaRegSave />}
                    text='Save As'
                    onClick={this.saveMotion}
                />
                <Button
                    data-not-unselect
                    icon={<FaFileExport />}
                    text='Export'
                    onClick={this.exportMotion}
                />
                <div
                    className={css({
                        width: '4px',
                        height: '100%',
                        backgroundColor: L_BLACK,
                    })}
                />
                <Button
                    data-not-unselect
                    icon={<FaUndo />}
                    onClick={() => { ipcRenderer.send('app-menu-event-forward', "menu:undo") }}
                    disabled={!this.state.undoRedo.canUndo}
                />
                <Button
                    data-not-unselect
                    icon={<FaRedo />}
                    onClick={() => { ipcRenderer.send('app-menu-event-forward', "menu:redo") }}
                    disabled={!this.state.undoRedo.canRedo}
                />
                {this.state.loggedIn &&
                    <div
                        className={css({
                            width: '4px',
                            height: '100%',
                            backgroundColor: L_BLACK,
                        })}
                    />
                }
                {this.state.loggedIn &&
                    <Button
                        data-not-unselect
                        icon={<FaPlay />}
                        text='Play'
                        onClick={this.playMotion}
                    />
                }
                {this.state.loggedIn &&
                    <Select
                        data-not-unselect
                        styles={{
                            container: (provided, state) => ({
                                ...provided,
                                maxWidth: 300,
                                minWidth: 150,
                                height: '100%',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                            }),
                            control: (provided, state) => ({
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: L_BLACK,
                                border: 0,
                                height: '100%',
                                width: '100%'
                            }),
                            singleValue: (provided, state) => ({
                                ...provided,
                                color: BASE_WHITE,
                            }),
                            placeholder: (provided, state) => ({
                                ...provided,
                                color: 'rgba(255, 255, 255, 0.3)',
                            }),
                            indicatorSeparator: (provided, state) => ({
                                width: 0,
                            }),
                            dropdownIndicator: (provided, state) => ({
                                color: BASE_WHITE,
                                display: 'inline-flex',
                                alignItems: 'center',
                            }),
                            menu: (provided, state) => ({
                                ...provided,
                                borderRadius: 0,
                                zIndex: 10000,
                            }),
                            menuList: (provided, state) => ({
                                ...provided,
                                backgroundColor: BASE_BLACK,
                                padding: 0,
                                padding: '2px',
                                '> :not(:first-of-type)': {
                                    marginTop: '2px'
                                },
                            }),
                            option: (provided, state) => ({
                                ...provided,
                                backgroundColor: state.isFocused || state.isSelected ? LL_BLACK : L_BLACK,
                                margin: 0,
                                cursor: 'pointer',
                            }),
                        }}
                        value={this.state.selectedRoom > -1 ? this.state.roomList[this.state.selectedRoom] : null}
                        options={this.state.roomList}
                        onChange={this.onRoomSelect}
                        isSearchable={false}
                    />
                }
                <div
                    className={css({
                        flexGrow: 1
                    })}
                />
                <div
                    className={css({
                        userSelect: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0 4px',
                        height: '100%',
                    })}
                >
                    <div className={css({alignItems: 'center'})}>{this.state.loggedIn ? this.state.username : ''}</div>
                </div>
                {this.state.loggedIn
                ?
                <Button
                    data-not-unselect
                    icon={<FaSignOutAlt />}
                    text='Logout'
                    onClick={this.onLogout}
                    disabled={!this.state.canLogin}
                />
                :
                <Button
                    data-not-unselect
                    icon={<FaSignInAlt />}
                    text='Login'
                    onClick={this.onLogin}
                    disabled={!this.state.canLogin}
                />
                }
            </div>
        );
    }
}
