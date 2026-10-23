"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devFallbackNotificationsStore = exports.DevFallbackNotificationsStore = void 0;
class DevFallbackNotificationsStore {
    static instance;
    notifications = new Map();
    preferences = new Map(); // key: `${userId}:${type}:${channel}`
    deliveryLogs = [];
    constructor() { }
    static getInstance() {
        if (!DevFallbackNotificationsStore.instance) {
            DevFallbackNotificationsStore.instance = new DevFallbackNotificationsStore();
        }
        return DevFallbackNotificationsStore.instance;
    }
    clearAll() {
        this.notifications.clear();
        this.preferences.clear();
        this.deliveryLogs = [];
    }
}
exports.DevFallbackNotificationsStore = DevFallbackNotificationsStore;
exports.devFallbackNotificationsStore = DevFallbackNotificationsStore.getInstance();
