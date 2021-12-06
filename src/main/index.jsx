import React from 'react';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';

const $main = document.querySelector('main');
const render = () => {
    const { default: App } = require('./components/App');

    ReactDOM.render(
        <AppContainer>
            <App />
        </AppContainer>,
        $main
    );
};

render();
if (module.hot) {
    module.hot.accept(render);
}
