"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
function handler(req, res) {
    return res.status(200).json({
        success: true,
        source: "vercel"
    });
}
//# sourceMappingURL=health.js.map