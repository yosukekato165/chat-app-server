"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const rooms_1 = __importDefault(require("./rooms"));
const Events = __importStar(require("./events"));
const utils_1 = require("./utils");
const server = http_1.default.createServer();
const io = new socket_io_1.Server(server);
// チャットルームID⽤のカウンター
let currentRoomIdCounter = 1;
// チャットルームIDの接頭辞
const ROOM_NAME_PREFIX = "ROOM_";
// クライアントとサーバーがコネクションを確⽴するとこの「connection」イベントが発⽣する
io.sockets.on(Events.CONNECTION, (socket) => {
    // 現在のルームID
    let currentRoomId;
    /**
     * チャットルームの作成
     */
    socket.on(Events.CREATE_ROOM, (data) => {
        // ルームIDの⽣成
        const roomId = ROOM_NAME_PREFIX + currentRoomIdCounter++;
        // ルーム情報作成
        const room = {
            id: roomId,
            name: data.roomName,
            users: [],
            logs: [],
        };
        // ルーム情報保存
        rooms_1.default.push(room);
        // 返却データの作成
        const result = {
            type: Events.CREATE_ROOM,
            rooms: rooms_1.default,
        };
        io.emit(Events.CREATE_ROOM, result);
    });
    /**
     * チャットルーム⼊室
     */
    socket.on(Events.JOIN_ROOM, (data) => {
        // ルームID
        const roomId = data.roomId;
        // 現在のチャットルームIDを保存
        currentRoomId = roomId;
        for (const room of rooms_1.default) {
            // 既存のチャットルームに存在するルームIDの場合
            if (room.id === roomId) {
                // ルームメンバーを追加
                room.users.push({
                    socketId: socket.id,
                    name: data.userName,
                });
                // 該当のチャットルームに参加
                socket.join(room.id);
                // 返却データ
                const result = {
                    type: Events.JOIN_ROOM,
                    roomId: roomId,
                    userName: data.userName,
                    users: room.users,
                };
                io.emit(Events.JOIN_ROOM, result);
                break;
            }
        }
    });
    /**
     * 会話
     */
    socket.on(Events.CONVERSATION, (data) => {
        // ルームID
        const roomId = data.roomId;
        // メッセージ
        const message = data.message;
        // 現在⽇時
        const currentDate = (0, utils_1.formatDate)("yyyy/MM/dd HH:mm:ss");
        for (let room of rooms_1.default) {
            if (room.id === roomId) {
                room.logs.push({
                    logId: room.logs.length + 1,
                    userName: data.userName,
                    time: currentDate,
                    message: message,
                });
                break;
            }
        }
        // 返却データ
        const result = {
            type: Events.CONVERSATION,
            roomId: roomId,
            userName: data.userName,
            time: currentDate,
            message: message,
        };
        io.emit(Events.CONVERSATION, result);
    });
    /**
     * チャットルーム⼀覧取得
     */
    socket.on(Events.GET_ROOMS_LIST, () => {
        const result = {
            type: Events.GET_ROOMS_LIST,
            rooms: rooms_1.default,
        };
        io.emit(Events.GET_ROOMS_LIST, result);
    });
    /**
     * 現在のチャットルームの情報取得
     */
    socket.on(Events.GET_CURRENT_ROOM, (data) => {
        const currentRoom = rooms_1.default.filter((d) => d.id === data.roomId);
        if (currentRoom.length === 1) {
            const result = {
                type: Events.GET_CURRENT_ROOM,
                roomId: currentRoom[0].id,
                roomName: currentRoom[0].name,
                users: currentRoom[0].users,
                logs: currentRoom[0].logs,
            };
            io.emit(Events.GET_CURRENT_ROOM, result);
        }
    });
    /**
     * チャットルーム退室
     */
    socket.on(Events.LEAVE_ROOM, () => {
        if (currentRoomId) {
            // 接続が切れる際に該当チャットルームからユーザーを削除する
            outer: for (const room of rooms_1.default) {
                if (room.id === currentRoomId) {
                    for (let i = 0; i < room.users.length; i++) {
                        if (room.users[i].socketId === socket.id) {
                            room.users.splice(i, 1);
                            socket.leave(currentRoomId);
                            break outer;
                        }
                    }
                }
            }
            const result = {
                type: Events.LEAVE_ROOM,
                roomId: currentRoomId,
                socketId: socket.id,
            };
            io.emit(Events.LEAVE_ROOM, result);
        }
    });
    /**
     * 接続切断
     */
    socket.on(Events.DISCONNECT, () => {
        if (currentRoomId) {
            // 接続が切れる際に該当チャットルームからユーザーを削除する
            outer: for (const room of rooms_1.default) {
                if (room.id === currentRoomId) {
                    for (let i = 0; i < room.users.length; i++) {
                        if (room.users[i].socketId === socket.id) {
                            room.users.splice(i, 1);
                            socket.leave(currentRoomId);
                            break outer;
                        }
                    }
                }
            }
            const result = {
                type: Events.DISCONNECT,
                roomId: currentRoomId,
                socketId: socket.id,
            };
            io.emit(Events.DISCONNECT, result);
        }
    });
});
// ポート番号3333でHTTPサーバーが待ち受けるように設定する
server.listen(3333, () => console.log("listening on *:3333"));
