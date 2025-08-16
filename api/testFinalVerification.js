"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var node_fetch_1 = require("node-fetch");
var BASE_URL = 'https://london-day-planner-enftssmnd-basedlsgs-projects.vercel.app';
function testApi() {
    return __awaiter(this, void 0, void 0, function () {
        var response, data, error_1, response, data, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('--- Test 1: Checking Server Availability (/api/cities) ---');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, (0, node_fetch_1.default)("".concat(BASE_URL, "/api/cities"))];
                case 2:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("HTTP error! status: ".concat(response.status));
                    }
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = (_a.sent());
                    console.log('✅ Success! Server is running. Received data:');
                    console.log(data[0]); // Log first city to keep it brief
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error('❌ Failure! Could not connect to the server.', error_1);
                    return [3 /*break*/, 5];
                case 5:
                    console.log('\n--- Test 2: Checking Google Places API Integration (/api/plan) ---');
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 9, , 10]);
                    return [4 /*yield*/, (0, node_fetch_1.default)("".concat(BASE_URL, "/api/plan"), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                prompt: "a fun afternoon in London with a museum and a park",
                                city: "London",
                                preferences: ["museum", "park"]
                            }),
                        })];
                case 7:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("HTTP error! status: ".concat(response.status));
                    }
                    return [4 /*yield*/, response.json()];
                case 8:
                    data = (_a.sent());
                    if (data.plan && data.plan.events && data.plan.events.length > 0) {
                        console.log('✅ Success! Google Places API key is working. Received itinerary:');
                        console.log(JSON.stringify(data, null, 2));
                    }
                    else {
                        console.error('❌ Failure! The API returned an empty or invalid plan. This likely means the Google API key is still being rejected.');
                        console.log('Received data:', JSON.stringify(data, null, 2));
                    }
                    return [3 /*break*/, 10];
                case 9:
                    error_2 = _a.sent();
                    console.error('❌ Failure! There was an error calling the /api/plan endpoint.', error_2);
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
testApi();
