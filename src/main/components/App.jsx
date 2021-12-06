import React, { Component } from 'react';
import { css } from '@emotion/css';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import TopPanel from './TopPanel';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import state from '../reducers';
import { batchDispatchMiddleware } from 'redux-batched-actions';
import { ToastContainer } from 'react-toastify';
import VerticalBar from './VerticalBar';
import { BASE_BLACK, BASE_WHITE, LL_BLACK } from '../shared/styles';
import 'react-toastify/dist/ReactToastify.min.css';
import { ipcRenderer } from 'electron';

const store = createStore(state, applyMiddleware(batchDispatchMiddleware));

class App extends Component {
    render() {
        return (
            <Provider store={store}>
                <div
                    className={css({
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: BASE_BLACK,
                        color: BASE_WHITE
                    })}
                >
                    <TopPanel />
                    <div
                        className={css({
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'row',
                            flexGrow: 1
                        })}
                    >
                        <LeftPanel />
                        <VerticalBar />
                        <RightPanel />
                    </div>
                    <div
                        className={css({
                            display: 'flex',
                            flexDirection: 'row',
                            width: '100%',
                            borderTop: `1px solid ${LL_BLACK}`,
                            'p': {
                                padding: '3px 15px',
                                margin: 0,
                                fontSize: '14px',
                                color: `rgba(255, 255, 255, 0.6)`,
                            },
                            '> :not(:last-child)': {
                                borderRight: `1px solid ${LL_BLACK}`,
                            },
                        })}
                    >
                        <p
                            className={css({
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                userSelect: 'none',
                            })}
                            onClick={() => { ipcRenderer.send('app-window-show-help'); }}
                        >
                            Help
                        </p>
                        <div
                            className={css({
                                flexGrow: 1,
                                userSelect: 'none',
                            })}
                        />
                        <p> Version { APP_VERSION }</p>
                        <p>© Yukai Engineering Inc.</p>
                    </div>
                    <ToastContainer
                        theme='dark'
                        pauseOnFocusLoss={false}
                        limit={4}
                        className={css({
                            overflowWrap: 'anywhere',
                        })}
                    />
                </div>
            </Provider>
        );
    }
}

export default App;
