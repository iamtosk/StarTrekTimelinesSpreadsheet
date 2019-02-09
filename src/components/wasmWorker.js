const wasm = require('stt-native-wasm');

self.addEventListener('message', (message) => {
    wasm().then((mod) => {
        let result = mod.calculate(JSON.stringify(message.data), progressResult => {
            self.postMessage({progressResult});
        });

        self.postMessage({result});

        // close this worker
        self.close();
    });
});
