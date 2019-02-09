# Node Native Extension

Native code is more powerful; for some calculations we need to harness the full power of the CPU. For example, we can't have multi-threaded code in JavaScript except through very convuluted WebWorkers which don't share a context.

## Building

If you're building on a Windows machine: before running "npm install", I recommend installing Microsoft's windows-build-tools by running `npm install -g windows-build-tools` from an elevated command prompt. If you already have Visual Studio installed, it's possible to manually configure the native build tools in Node. See instructions [here](https://github.com/Microsoft/nodejs-guidelines/blob/master/windows-environment.md#compiling-native-addon-modules).
