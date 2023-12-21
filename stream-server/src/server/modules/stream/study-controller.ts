import { Manager, SqliteDatabaseProxy } from '../database';
import { Credentials } from './credentials';
import { Service } from '../core';
import { DataProvider, CsvDataProvder, SqlDataProvider, DebugDataProvider } from '../data-provider';
import { MssqlDatabase } from '../database';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as ts from 'ts-node';
import * as requireFromString from 'require-from-string';
import * as path from 'path';
import { Subject } from 'rxjs';

import { StudyData } from '../../../../data/study';

const STUDY_TABLE = 'study';

export class StudyController extends Service {
    public serviceName = 'StudyController';
    public groupName = 'stream';


    private readonly compiler = ts.register();

    public constructor(private dataDir: string, private sessionDb: SqliteDatabaseProxy, private dataProvider$: Subject<DataProvider>, private reloadableDbs: SqliteDatabaseProxy[], private reloadableManagers: Manager<any>[]) {
        super();
    }

    public async init() {
        await this.initDb();
    }

    private async initDb() {
        this.load('');
        const hasTable = await this.sessionDb.hasTable(STUDY_TABLE);
        let init = false;
        if (hasTable) {
            this.logDebug('Found existing table, attempting to load previous configuration');
            // const config = await this.sessionDb.query(`SELECT * FROM ${STUDY_TABLE}`, {}).toPromise();

            // if (config) {
            //     this.logInfo(`Starting with configuration ${config.name}, use "study.list()" for config files, "study.load('<config>')" to load config`);
            //     this.load(config.name, false);
            //     init = true;
            // }
        }

        if (!init) {
            // this.load('');

            // setTimeout(() => {
            //     this.logInfo(`Starting without configuration, use "study.list()" for config files, "study.load('<config>')" to begin`);
            // }, 1000);
        }
    }

    public async list() {
        try {
            const files = await fs.promises.readdir(this.dataDir);

            this.logInfo('Available configuration files:');
            for (const file of files) {
                if (file.endsWith('.ts')) {
                    this.logInfo(`> ${file.substr(0, file.length - 3)}`);
                }
            }
        } catch (e) {
            this.logError(e);
        }
    }

    public async load(file: string, reloadDbs = true) {
        try {
            this.logInfo(`Loading configuration file: ${file}`);
            // const filePath = path.join(this.dataDir, `${file}.ts`);
            // const fileContent = await fs.promises.readFile(filePath);
            // const compiledContent = this.compiler.compile(fileContent.toString(), filePath);
            // const config: Credentials = requireFromString(compiledContent) as Credentials;
            const config = StudyData;
            this.logInfo(`Imported configuration file ${file}`);

            let dataProvider: DataProvider;
            switch (config.type) {
                // case 'debug':
                //     dataProvider = new DebugDataProvider(config.dimensions, config.aggregations);
                //     break;

                // case 'sql':
                //     const dataProviderDB = new MssqlDatabase(config.options);
                //     dataProvider = new SqlDataProvider(dataProviderDB, config.dimensions, config.aggregations);
                //     break;

                case 'csv':
                    dataProvider = new CsvDataProvder(config.options, config.dimensions, config.aggregations);
                    break;

                default:
                    // setTimeout to wait for GUI to load
                    throw new Error(`Unknown credentials type`);
            }

            if (reloadDbs) {
                for (const db of this.reloadableDbs) {
                    await db.backupAndReset();
                }
            }

            dataProvider.init();
            await dataProvider.initialized$.toPromise();
            this.dataProvider$.next(dataProvider);

            if (reloadDbs) {
                for (const manager of this.reloadableManagers) {
                    await manager.reinitialize();
                }
            }

            this.sessionDb.initTable(STUDY_TABLE, [
                'id INTEGER PRIMARY KEY',
                'name VARCHAR(255)'
            ]);
            this.sessionDb.insert(`INSERT INTO ${STUDY_TABLE} (name) VALUES (@name)`, {
                name: file
            });
        } catch (e) {
            if (e instanceof Error) {
                this.logError(e.stack);
            }
            this.logError(e.message);
        }
    }
}
