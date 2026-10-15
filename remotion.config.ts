import { Config } from '@remotion/cli/config';
import fs from 'fs';
// Local container uses a pre-installed headless shell; elsewhere Remotion downloads its own.
const local = process.env.REMOTION_CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
if (fs.existsSync(local)) Config.setBrowserExecutable(local);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setChromiumOpenGlRenderer('swangle');
