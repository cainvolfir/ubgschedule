import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setConcurrency(2);
// Our source tree is bundled by Remotion's own compiler, separate from the Vite app.
Config.setCodec('h264');