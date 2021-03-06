import * as request from 'request-promise-native';
import * as cheerio from 'cheerio';
import * as fs from 'fs-extra';
import * as minifier from 'html-minifier';
import * as diff from 'diff';
import chalk from 'chalk';
import {send} from './';

const log = console.log;

let overwrite = process.argv.includes('--overwrite');
let dryRun = process.argv.includes('--dry-run');


const TIMEOUT_INITIAL = process.env.BACKOFF_TIMEOUT ? parseInt(process.env.BACKOFF_TIMEOUT) : 5000;
let timeout = TIMEOUT_INITIAL;

const CURRENT = __dirname + '/current.html';

const watch = async () => {
    const [current, response] = await Promise.all([
        fs.readFile(CURRENT, "utf8"),
        request('https://glastonbury.seetickets.com/content/extras')
    ]);

    const $ = cheerio.load(response);
    const content = $.root();

    content.find('.entry-content').removeAttr('data-refresh-id');

    let body = content.find('body');

    body.find('#google_translate_element').remove();
    body.find('.screen-reader-text').remove();

    const site_content = body.html().replace(/serverTime: [0-9]+,/gm, '');

    const minified = minifier.minify(site_content, {
        //collapseWhitespace: true,
        minifyCSS: true,
        minifyJS: true,
        removeComments: true
    });

    const changed = current != minified;

    console.log(changed);

    if (changed) {
        const diffs = diff.diffWords(current, minified);

        let m = '';

        diffs.forEach(function (part) {

            if (part.added) {
                m += chalk.bgGreen(part.value);
            } else if (part.removed) {
                m += chalk.bgRed(part.value);
            } else {
                let value = part.value;

                if (value.length > 75) {
                    value = `${value.substr(0, 50)} ${chalk.blue('...')} ${value.substr(value.length - 51, value.length - 1)}`
                }

                m += value;
            }
        });


        log(m)


    }

    if (!overwrite && changed && process.env.DISABLE_MESSAGING !== "true" && !dryRun) {
        console.log('sending message');
        const response = await send();
        if (['queued', 'sending', 'sent'].includes(response.status)) {
            timeout += (timeout * 0.5);
        }

    }

    if (overwrite) {
        await fs.writeFile(CURRENT, minified);
        overwrite = false;
    }

    if (!changed) {
        timeout = TIMEOUT_INITIAL;
    }
};

const delay = ms => new Promise(r => {
    setTimeout(r, ms);
});

const main = async () => {
    await fs.ensureFile(CURRENT);

    while (true) {
        console.log(chalk`{blue ${Date.now().toString()}} {green Checking}`);
        await watch();
        console.log(chalk.yellow(`Waiting for ${timeout} ms`));
        await delay(timeout);
    }
};

main().then();
