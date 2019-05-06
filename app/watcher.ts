import * as request from 'request-promise-native';
import * as cheerio from 'cheerio';
import * as fs from 'fs-extra';
import * as minifier from 'html-minifier';
import * as diff from 'diff';
import chalk from 'chalk';
import {send} from './';

const log = console.log;

let overwrite = process.argv.includes('--overwrite');

const CURRENT = __dirname + '/current.html';

const watch = async () => {
    const [current, response] = await Promise.all([
        fs.readFile(CURRENT, "utf8"),
        request('https://glastonbury.seetickets.com/content/extras')
    ]);

    const $ = cheerio.load(response);
    const content = $.root();

    content.find('.entry-content').removeAttr('data-refresh-id');

    const site_content = content.html().replace(/serverTime: [0-9]+,/gm, '');

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
                m += chalk.green(part.value);
            } else if (part.removed) {
                m += chalk.red(part.value);
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

    if (!overwrite && changed) {
        send();
    }

    if (overwrite) {
        await fs.writeFile(CURRENT, minified);
        overwrite = false;
    }


};

const delay = ms => new Promise(r => {
    setTimeout(r, ms);
});

const main = async () => {
    await fs.ensureFile(CURRENT);

    while (true) {
        console.log(chalk.green('Checking'));
        await watch();
        console.log(chalk.green('Waiting...'));
        await delay(5000);
    }
};

main().then();

// POST https://glastonbury.seetickets.com/event/addregistrations

/*
showCode: 1300001
registrations[0].RegistrationId: 4145617314
registrations[0].PostCode: BN112ES
registrations[1].RegistrationId: 1040388612
registrations[1].PostCode: BN112ES
registrations[2].RegistrationId:
registrations[2].PostCode:
registrations[3].RegistrationId:
registrations[3].PostCode:
 */
