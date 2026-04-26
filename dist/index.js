"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = __importStar(require("node:fs"));
var node_child_process_1 = require("node:child_process");
var rest_1 = require("@octokit/rest");
var plugin_throttling_1 = require("@octokit/plugin-throttling");
var parse_github_repo_url_1 = __importDefault(require("parse-github-repo-url"));
var ThrottlingOctokit = rest_1.Octokit.plugin(plugin_throttling_1.throttling);
// Passed from prepare → success so we tag the API-created commit
var preparedCommitSha;
function getOctokit(token) {
    return new ThrottlingOctokit({
        auth: token,
        throttle: {
            onRateLimit: function (retryAfter, options) {
                console.warn("RateLimit detected for request ".concat(options.method, " ").concat(options.url, "."));
                console.info("Retrying after ".concat(retryAfter, " seconds."));
                return true;
            },
            onSecondaryRateLimit: function (retryAfter, options) {
                console.warn("SecondaryRateLimit detected for request ".concat(options.method, " ").concat(options.url, "."));
                console.info("Retrying after ".concat(retryAfter, " seconds."));
                return true;
            },
        },
    });
}
function unsafeParseString(value) {
    if (typeof value === "string") {
        return value;
    }
    throw new Error("Expected a string value but received undefined");
}
function unsafeParseRepositorySlug(repositoryUrl) {
    var maybeRepositoryUrl = (0, parse_github_repo_url_1.default)(repositoryUrl);
    if (maybeRepositoryUrl === false) {
        throw new Error("Could not parse repository URL: ".concat(repositoryUrl));
    }
    return { owner: maybeRepositoryUrl[0], name: maybeRepositoryUrl[1] };
}
function unsafeParseAssets(pluginConfig) {
    if (typeof pluginConfig === "string") {
        throw new Error("Expected plugin config to specify 'assets'");
    }
    var config = pluginConfig;
    if (typeof config !== "object" || config === null) {
        throw new Error("Expected plugin config to contain an object");
    }
    if (!("assets" in config)) {
        throw new Error("Expected plugin config to contain an `assets` property");
    }
    var assets = config.assets;
    if (!Array.isArray(assets)) {
        throw new Error("Expected plugin config 'assets' to contain an array of strings");
    }
    return assets.map(function (value) { return unsafeParseString(value); });
}
function verifyConditions(pluginConfig, context) {
    var _a;
    var repositoryUrl = unsafeParseString((_a = context.options) === null || _a === void 0 ? void 0 : _a.repositoryUrl);
    unsafeParseRepositorySlug(repositoryUrl);
    unsafeParseString(context.env["GITHUB_TOKEN"]);
    unsafeParseAssets(pluginConfig);
}
function prepare(pluginConfig, context) {
    return __awaiter(this, void 0, void 0, function () {
        var repositoryUrl, branch, slug, githubToken, assets, octokit, nextRelease, message, refData, headCommitSha, commitData, baseTreeSha, treeItems, treeData, newCommitData;
        var _this = this;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    repositoryUrl = unsafeParseString((_a = context.options) === null || _a === void 0 ? void 0 : _a.repositoryUrl);
                    branch = context.branch.name;
                    slug = unsafeParseRepositorySlug(repositoryUrl);
                    githubToken = unsafeParseString(context.env["GITHUB_TOKEN"]);
                    assets = unsafeParseAssets(pluginConfig);
                    octokit = getOctokit(githubToken);
                    nextRelease = context.nextRelease;
                    if (nextRelease === undefined) {
                        throw new Error("Did not expect 'prepare' to be invoked with undefined 'nextRelease'");
                    }
                    message = "chore(release): ".concat(nextRelease.version, " [skip ci]\n\n").concat(nextRelease.notes);
                    return [4 /*yield*/, octokit.rest.git.getRef({
                            owner: slug.owner,
                            repo: slug.name,
                            ref: "heads/".concat(branch),
                        })];
                case 1:
                    refData = _b.sent();
                    headCommitSha = refData.data.object.sha;
                    return [4 /*yield*/, octokit.rest.git.getCommit({
                            owner: slug.owner,
                            repo: slug.name,
                            commit_sha: headCommitSha,
                        })];
                case 2:
                    commitData = _b.sent();
                    baseTreeSha = commitData.data.tree.sha;
                    return [4 /*yield*/, Promise.all(assets.map(function (assetPath) { return __awaiter(_this, void 0, void 0, function () {
                            var content, blobData;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        content = fs.readFileSync(assetPath, { encoding: "utf-8" });
                                        return [4 /*yield*/, octokit.rest.git.createBlob({
                                                owner: slug.owner,
                                                repo: slug.name,
                                                content: content,
                                                encoding: "utf-8",
                                            })];
                                    case 1:
                                        blobData = _a.sent();
                                        return [2 /*return*/, {
                                                path: assetPath,
                                                mode: "100644",
                                                type: "blob",
                                                sha: blobData.data.sha,
                                            }];
                                }
                            });
                        }); }))];
                case 3:
                    treeItems = _b.sent();
                    return [4 /*yield*/, octokit.rest.git.createTree({
                            owner: slug.owner,
                            repo: slug.name,
                            base_tree: baseTreeSha,
                            tree: treeItems,
                        })];
                case 4:
                    treeData = _b.sent();
                    return [4 /*yield*/, octokit.rest.git.createCommit({
                            owner: slug.owner,
                            repo: slug.name,
                            message: message,
                            tree: treeData.data.sha,
                            parents: [headCommitSha],
                        })];
                case 5:
                    newCommitData = _b.sent();
                    preparedCommitSha = newCommitData.data.sha;
                    // Advance the branch ref
                    return [4 /*yield*/, octokit.rest.git.updateRef({
                            owner: slug.owner,
                            repo: slug.name,
                            ref: "heads/".concat(branch),
                            sha: preparedCommitSha,
                        })];
                case 6:
                    // Advance the branch ref
                    _b.sent();
                    // Sync local state so semantic-release's git tag points to the new commit
                    (0, node_child_process_1.execSync)("git fetch origin", { stdio: "inherit" });
                    (0, node_child_process_1.execSync)("git reset --hard origin/".concat(branch), { stdio: "inherit" });
                    return [2 /*return*/];
            }
        });
    });
}
function success(_pluginConfig, context) {
    return __awaiter(this, void 0, void 0, function () {
        var nextRelease, repositoryUrl, slug, githubToken, octokit, tagName, tagData;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (preparedCommitSha === undefined) {
                        return [2 /*return*/];
                    }
                    nextRelease = context.nextRelease;
                    if (nextRelease === undefined) {
                        return [2 /*return*/];
                    }
                    repositoryUrl = unsafeParseString((_a = context.options) === null || _a === void 0 ? void 0 : _a.repositoryUrl);
                    slug = unsafeParseRepositorySlug(repositoryUrl);
                    githubToken = unsafeParseString(context.env["GITHUB_TOKEN"]);
                    octokit = getOctokit(githubToken);
                    tagName = nextRelease.gitTag;
                    // Remove the unsigned CLI-created tag
                    return [4 /*yield*/, octokit.rest.git.deleteRef({
                            owner: slug.owner,
                            repo: slug.name,
                            ref: "tags/".concat(tagName),
                        })];
                case 1:
                    // Remove the unsigned CLI-created tag
                    _b.sent();
                    return [4 /*yield*/, octokit.rest.git.createTag({
                            owner: slug.owner,
                            repo: slug.name,
                            tag: tagName,
                            message: "chore(release): ".concat(nextRelease.version),
                            object: preparedCommitSha,
                            type: "commit",
                        })];
                case 2:
                    tagData = _b.sent();
                    // Create the tag ref pointing to the new annotated tag object
                    return [4 /*yield*/, octokit.rest.git.createRef({
                            owner: slug.owner,
                            repo: slug.name,
                            ref: "refs/tags/".concat(tagName),
                            sha: tagData.data.sha,
                        })];
                case 3:
                    // Create the tag ref pointing to the new annotated tag object
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
module.exports = {
    verifyConditions: verifyConditions,
    prepare: prepare,
    success: success,
};
