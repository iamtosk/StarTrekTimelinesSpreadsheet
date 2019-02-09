import React from 'react';
import { render } from 'react-dom';
import App from './components/App';

window.onerror = (message, filename, lineno) => {
    console.warn(`ERROR in ${filename} (${lineno}): ${message}`);
}

// Now we can render our application into it
render(<App />, document.getElementById('app'));
