'use strict';

const Electron = require('electron');

const fs = require('fs');
const io = require('socket.io')();
const Storage = require('electron-json-storage');

const BrowserWindow = Electron.BrowserWindow;
const Dialog = Electron.dialog;
const App = Electron.app;
const Menu = Electron.Menu;
const Tray = Electron.Tray;

let STEAM_NICK_NAME = "";
let CONNECTED = false;

let labels = [];
labels['do_login'] = "Faça login";
labels['update'] = "Atualizar";
labels['configs'] = "Configurações";
labels['close'] = "Sair";

let CONFIGS = {
	show_window: false,
	update_time: 10,
	__dev: false
};

let RAFFLELIST = [];

let updateInterval = null;
let mainWindow = null;
let configWindow = null;
let tray = null;

Storage.get('configs', (error, data) => {
	if (error) throw error;

	if (data.show_window) {
		CONFIGS.show_window = data.show_window;
	}

	if (data.update_time) {
		CONFIGS.update_time = data.update_time;
	}
});

let shouldQuit = App.makeSingleInstance((commandLine, workingDirectory) => {
    console.log("CSGORage - TryBot already running");
});

if (shouldQuit) {
    App.quit();
    return;
}


io.on('connection', (socket) => {

	socket.on('csgorage-trybot cloudflare alwaysonline', (payload) => {
		let cloudFlareTimeOut = setTimeout(() => {
			if (mainWindow) {
				mainWindow.loadURL('http://csgorage.com/free-raffles/current');
			}
		}, 5 * 60 * 1000);
		cloudFlareTimeOut.unref();
	});

	socket.on('csgorage-trybot cloudflare captcha', (payload) => {
		if (mainWindow) {
			mainWindow.show();
		}
	});

	socket.on('csgorage-trybot page error', (payload) => {
		if (mainWindow) {
			mainWindow.show();
		}
		dialog.showErrorBox("Ops, ocorreu um erro", "Ocrreu um erro ao tentar verificar a página do CSGORage");
	});

	socket.on('csgorage-trybot not connected', (payload) => {
		CONNECTED = false;
		if (mainWindow) {
			mainWindow.show();
		}
		updateTryInfo();
	});

	socket.on('csgorage-trybot connected', (payload) => {
		CONNECTED = true;

		if (mainWindow && (!CONFIGS.show_window && !CONFIGS.__dev)) {
			mainWindow.hide();
		}

		STEAM_NICK_NAME = payload.steam_nick_name;
		updateTryInfo();
	});

	socket.on('csgorage-trybot done checking', (payload) => {
		updateTryInfo();
	});

	socket.on('csgorage-trybot sucess enter raffle', (payload) => {
		RAFFLELIST.push(payload.name);
		updateTryInfo();
	});

	socket.on('csgorage-trybot disconnect steam', (payload) => {
		CONNECTED = false;
		if (mainWindow) {
			mainWindow.loadURL('http://csgorage.com/free-raffles/current');
		}
		updateTryInfo();
	});

	socket.on('csgorage-trybot update configs', (payload) => {
		CONFIGS.show_window = payload.show_window;
		CONFIGS.update_time = payload.update_time || CONFIGS.update_time;
		Storage.set('configs', CONFIGS);
	});

});

App.on('ready', () => {
	console.log("CSGORage - TryBot ready");

	tray = new Tray(__dirname + '/favicon_64x64.png');
	tray.setToolTip('CSGORage - TryBot');

	mainWindow = new BrowserWindow({
		width: 1400,
		height: 800,
		show: (CONFIGS.__dev || CONFIGS.show_window),
		nodeIntegration: false
	});

	configWindow = new BrowserWindow({
		width: 400,
		height: 300,
		show: false,
		center: true,
		resizable: false,
		nodeIntegration: false
	});

	configWindow.loadURL(__dirname + "/config.html");

	configWindow.webContents.on('dom-ready', () => {
		let socket_src_code = fs.readFile(__dirname + '/socket.io.min.js', 'utf8', (err, data) => {
    		configWindow.webContents.executeJavaScript(data);

    		let code_global = 'window.show_window = ' + CONFIGS.show_window + ';window.update_time = ' + CONFIGS.update_time + ';';
    		configWindow.webContents.executeJavaScript(code_global);

    		let socket_code = 'var socket = io.connect("http://localhost:3331");';
        	configWindow.webContents.executeJavaScript(socket_code);
    	});
	});

	configWindow.on('close', (evt) => {
		evt.preventDefault();
	    configWindow.hide();
	    return false;
	});

	mainWindow.loadURL('http://csgorage.com/free-raffles/current');

	mainWindow.on('close', (evt) => {
		evt.preventDefault();
	    mainWindow.hide();
	    return false;
	});

	mainWindow.webContents.on('dom-ready', () => {

		let socket_src_code = fs.readFile(__dirname + '/socket.io.min.js', 'utf8', (err, data) => {
			mainWindow.webContents.executeJavaScript(data);

			let raffle_src_code = fs.readFile(__dirname + '/raffle.js', 'utf8', (err, data) => {
		   		mainWindow.webContents.executeJavaScript(data);
			});
		});

	});

	updateInterval = setInterval(() => {
		if (mainWindow) {
  			mainWindow.loadURL('http://csgorage.com/free-raffles/current');
  		}
	}, CONFIGS.update_time * 60 * 1000); // minutes to milliseconds
	updateInterval.unref();


	updateTryInfo();
	io.listen(3331);
});

function updateTryInfo() {
	let firstLabelText = (CONNECTED) ? STEAM_NICK_NAME : labels['do_login'];

	let template =  [
		{ label: firstLabelText, icon: __dirname + '/steam.png' },
		{ label: labels['update'], icon: __dirname + '/update.png', enabled: CONNECTED, click: () => {
			if (mainWindow) {
				mainWindow.loadURL('http://csgorage.com/free-raffles/current');
			}
		}},
		{ type: 'separator' }
	];

	for(let raffleName of RAFFLELIST) {
		template.push({ icon: __dirname + '/check-yes.png', label: raffleName});
	}

	if (RAFFLELIST.length > 0) {
		template.push({ type: 'separator' });
	}

	template.push({
		icon: __dirname + '/config.png',
		label: labels['configs'],
		click: () => {
			if (configWindow) {
				configWindow.show();
			}
		}
	});

	template.push({
		icon: __dirname + '/exit.png',
		label: labels['close'],
		click: () => {
			mainWindow.close();
			configWindow.close();
			App.quit();
			
			setTimeout(() => {
				App.exit(0);
			}, 400);
		}
	});

	let contextMenu = Menu.buildFromTemplate(template);
	tray.setContextMenu(contextMenu);
}