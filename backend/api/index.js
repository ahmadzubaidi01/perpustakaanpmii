"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ override: true });
const app_1 = __importDefault(require("../src/app"));
require("../src/models/index");
exports.default = app_1.default;
//# sourceMappingURL=index.js.map