import { readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { spawn, execSync, exec } from "child_process";
import semver from "semver";
import axios from "axios";
import path from "path";

import {} from "dotenv/config";
import logger from "./core/var/modules/logger.js";
import { loadPlugins } from "./core/var/modules/installDep.js";

import {
    isGlitch,
    isReplit,
    isGitHub,
} from "./core/var/modules/environments.get.js";

console.clear();

// دالة لفتح صفحة الفيديو في المتصفح
function openVideoPage() {
    const videoHtmlPath = path.join(process.cwd(), "video.html");
    
    if (existsSync(videoHtmlPath)) {
        console.log("\n🎬 فتح صفحة تشغيل الفيديو...\n");
        
        // للريبليت
        if (isReplit) {
            console.log("🌐 افتح الرابط التالي في المتصفح:");
            console.log(`https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/video.html`);
        } else {
            // لأنظمة أخرى
            const url = `file://${videoHtmlPath}`;
            
            // ويندوز
            if (process.platform === "win32") {
                exec(`start ${url}`);
            }
            // ماك
            else if (process.platform === "darwin") {
                exec(`open ${url}`);
            }
            // لينكس
            else {
                exec(`xdg-open ${url}`);
            }
        }
    } else {
        console.log("⚠️ لم يتم العثور على ملف video.html\n");
    }
}

// Install newer node version on some old Repls
function upNodeReplit() {
    return new Promise((resolve) => {
        execSync(
            "npm i --save-dev node@16 && npm config set prefix=$(pwd)/node_modules/node && export PATH=$(pwd)/node_modules/node/bin:$PATH"
        );
        resolve();
    });
}

(async () => {
    if (process.version.slice(1).split(".")[0] < 16) {
        if (isReplit) {
            try {
                logger.warn("Installing Node.js v16 for Repl.it...");
                await upNodeReplit();
                if (process.version.slice(1).split(".")[0] < 16)
                    throw new Error("Failed to install Node.js v16.");
            } catch (err) {
                logger.error(err);
                process.exit(0);
            }
        }
        logger.error(
            "Xavia requires Node 16 or higher. Please update your version of Node."
        );
        process.exit(0);
    }

    if (isGlitch) {
        const WATCH_FILE = {
            restart: {
                include: ["\\.json"],
            },
            throttle: 3000,
        };

        if (
            !existsSync(process.cwd() + "/watch.json") ||
            !statSync(process.cwd() + "/watch.json").isFile()
        ) {
            logger.warn("Glitch environment detected. Creating watch.json...");
            writeFileSync(
                process.cwd() + "/watch.json",
                JSON.stringify(WATCH_FILE, null, 2)
            );
            execSync("refresh");
        }
    }

    if (isGitHub) {
        logger.warn("Running on GitHub is not recommended.");
    }
})();

// End

// CHECK UPDATE
async function checkUpdate() {
    logger.custom("Checking for updates...", "UPDATE");
    try {
        const res = await axios.get(
            "https://raw.githubusercontent.com/XaviaTeam/XaviaBot/main/package.json"
        );

        const { version } = res.data;
        const currentVersion = JSON.parse(
            readFileSync("./package.json")
        ).version;
        if (semver.lt(currentVersion, version)) {
            logger.warn(`New version available: ${version}`);
            logger.warn(`Current version: ${currentVersion}`);
        } else {
            logger.custom("No updates available.", "UPDATE");
        }
    } catch (err) {
        logger.error("Failed to check for updates.");
    }
}

// Child handler
const _1_MINUTE = 60000;
let restartCount = 0;

async function main() {
    // فتح صفحة الفيديو
    openVideoPage();
    
    await checkUpdate();
    await loadPlugins();
    const child = spawn(
        "node",
        [
            "--trace-warnings",
            "--experimental-import-meta-resolve",
            "--expose-gc",
            "core/_build.js",
        ],
        {
            cwd: process.cwd(),
            stdio: "inherit",
            env: process.env,
        }
    );

    child.on("close", async (code) => {
        handleRestartCount();
        if (code !== 0 && restartCount < 5) {
            console.log();
            logger.error(`An error occurred with exit code ${code}`);
            logger.warn("Restarting...");
            await new Promise((resolve) => setTimeout(resolve, 2000));
            main();
        } else {
            console.log();
            logger.error("XaviaBot has stopped, press Ctrl + C to exit.");
        }
    });
}

function handleRestartCount() {
    restartCount++;
    setTimeout(() => {
        restartCount--;
    }, _1_MINUTE);
}

main();