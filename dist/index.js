"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const http = __importStar(require("http"));
const https = __importStar(require("http"));
const PORT = process.env.PORT || 3000;
// create server
const server = new (process.env.NODE_ENV ? https.Server : http.Server)(app_1.default);
server.listen(PORT, () => {
    console.log(`Environement : ${process.env.NODE_ENV || 'local'}`);
    console.log('Express server listening on port ' + PORT);
});
//# sourceMappingURL=index.js.map