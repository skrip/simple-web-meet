import React from 'react';
import ReactDOM from 'react-dom';
import {App} from './App';
import {store} from './lib/store';
import {Provider} from 'react-redux';

const app = document.getElementById('app');
const getApp = () => {
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
};
ReactDOM.render(getApp(), app);
